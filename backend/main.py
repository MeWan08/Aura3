"""
AURA-3 AI Backend Server
========================
FastAPI application that powers the FinScope AI chat and the
Startup Evaluation Engine. Uses Groq as the LLM provider.

Run with: python main.py
"""

import os
import uuid
import asyncio
import io
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Optional

import httpx
import socketio
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from document_parser import extract_text, chunk_text
from agents import route_query, generate_response
from startup_analyzer import analyze_startup, chat_about_startup
from ddgs import DDGS
import urllib.parse
from database import init_db, save_startup, get_startup, get_all_startups

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aura3-backend")

# Validate Groq key
if not os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY") == "gsk_PASTE_YOUR_KEY_HERE":
    logger.warning(
        "⚠️  GROQ_API_KEY is not set! Please add your key to backend/.env"
    )

# Initialize database
init_db()

# ---------------------------------------------------------------------------
# In-memory data stores (Legacy)
# ---------------------------------------------------------------------------

# FinScope sessions: session_id -> { documents_text, history }
finscope_sessions: Dict[str, dict] = {}

# ---------------------------------------------------------------------------
# Socket.IO setup
# ---------------------------------------------------------------------------
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
)

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="AURA-3 AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper to emit logs via Socket.IO
async def emit_log(message: str):
    """Broadcast a log message to all connected Socket.IO clients."""
    await sio.emit("log_stream", {"message": message})
    logger.info(f"[LOG] {message}")


# ===================================================================
# STARTUP EVALUATION ENGINE ENDPOINTS
# ===================================================================

@app.post("/api/startups/register")
async def register_startup(request: Request):
    """Register a new startup in the database."""
    body = await request.json()
    startup_id = str(uuid.uuid4())[:8]

    startup = {
        "startup_id": startup_id,
        "name": body.get("name", "Unnamed Startup"),
        "cin": body.get("cin", ""),
        "domain": body.get("domain", "General"),
        "description": body.get("description", ""),
        "team": body.get("team", ""),
        "documents_text": "",
        "analysis": None,
        "status": "registered",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    save_startup(startup_id, startup)

    await emit_log(f"Startup registered: {startup_id} — {body.get('name', 'N/A')}")

    return {"startup_id": startup_id, "status": "registered"}


@app.post("/api/startups/{startup_id}/documents/upload")
async def upload_documents(startup_id: str, documents: UploadFile = File(...)):
    """Upload a pitch deck document for a startup."""
    startup = get_startup(startup_id)
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    await emit_log(f"Receiving document upload for {startup_id}: {documents.filename}")

    file_bytes = await documents.read()
    try:
        text = extract_text(documents.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    startup["documents_text"] = text
    startup["status"] = "documents_uploaded"
    startup["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_startup(startup_id, startup)

    await emit_log(f"Document parsed: {len(text)} characters extracted from {documents.filename}")

    return {"status": "uploaded", "filename": documents.filename, "chars_extracted": len(text)}


@app.post("/api/startups/{startup_id}/analyze")
async def trigger_analysis(startup_id: str):
    """Trigger AI analysis for a startup's uploaded documents."""
    startup = get_startup(startup_id)
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    if not startup["documents_text"]:
        raise HTTPException(status_code=400, detail="No documents uploaded yet")

    # Mark as processing
    startup["status"] = "analyzing"
    startup["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_startup(startup_id, startup)

    # Run analysis in background
    asyncio.create_task(_run_analysis(startup_id))

    return {"status": "analyzing", "startup_id": startup_id}


async def _run_analysis(startup_id: str):
    """Background task to run the AI analysis pipeline."""
    startup = get_startup(startup_id)
    if not startup:
        return
        
    try:
        await emit_log(f"[{startup_id}] Starting AI analysis pipeline...")
        await emit_log(f"[{startup_id}] Agent: Startup Evaluator — initializing Groq LLM...")

        pitch_text = chunk_text(startup["documents_text"])

        await emit_log(f"[{startup_id}] Processing {len(pitch_text)} chars of pitch deck data...")
        await emit_log(f"[{startup_id}] Evaluating: market analysis, team, risks, financials...")

        # Run the synchronous Groq call in a thread pool
        analysis = await asyncio.to_thread(
            analyze_startup, 
            pitch_text, 
            startup["name"], 
            startup.get("cin", "")
        )

        startup["analysis"] = analysis
        startup["status"] = "complete"
        startup["updated_at"] = datetime.now(timezone.utc).isoformat()
        save_startup(startup_id, startup)

        score = analysis.get("score", "?")
        await emit_log(f"[{startup_id}] ✅ Analysis complete — Score: {score}/10")

    except Exception as e:
        logger.exception(f"Analysis failed for {startup_id}")
        startup["status"] = "failed"
        startup["error"] = str(e)
        save_startup(startup_id, startup)
        await emit_log(f"[{startup_id}] ❌ Analysis failed: {e}")


@app.get("/api/startups/{startup_id}/report/status")
async def get_report_status(startup_id: str):
    """Check the status of a startup's analysis."""
    startup = get_startup(startup_id)
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    response = {"status": startup["status"], "startup_id": startup_id}

    if startup["status"] in ("complete", "completed"):
        response["analysis"] = startup["analysis"]
    elif startup["status"] in ("failed", "error"):
        response["error"] = startup.get("error", "Unknown error")

    return response


@app.get("/startups")
async def list_startups():
    """List all registered startups."""
    startups = get_all_startups()
    return [
        {
            "startup_id": s.get("startup_id", ""),
            "name": s.get("name", ""),
            "domain": s.get("domain", ""),
            "description": s.get("description", ""),
            "team": s.get("team", ""),
            "status": s.get("status", ""),
            "created_at": s.get("created_at", ""),
            "updated_at": s.get("updated_at", ""),
        }
        for s in startups
    ]


@app.post("/chat/{startup_id}")
async def chat_with_startup(startup_id: str, request: Request):
    """Chat about a specific startup's pitch deck data."""
    startup = get_startup(startup_id)
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    body = await request.json()
    question = body.get("question", "")

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    pitch_text = startup.get("documents_text", "")

    if not pitch_text:
        return {"answer": "No pitch deck data is available for this startup yet."}

    await emit_log(f"[Chat/{startup_id}] Investor question: {question[:60]}...")

    answer = await asyncio.to_thread(
        chat_about_startup, question, pitch_text
    )

    return {"answer": answer}


@app.post("/reports/{startup_id}")
async def generate_pdf_report(startup_id: str):
    """Generate a basic PDF report for a startup's analysis."""
    if startup_id not in startups_db:
        raise HTTPException(status_code=404, detail="Startup not found")

    startup = startups_db[startup_id]
    analysis = startup.get("analysis")

    if not analysis:
        raise HTTPException(status_code=400, detail="No analysis available yet")

    # Generate a simple PDF using ReportLab
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.units import inch

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "CustomTitle", parent=styles["Title"], fontSize=20, spaceAfter=20
    )
    heading_style = ParagraphStyle(
        "CustomHeading", parent=styles["Heading2"], fontSize=14, spaceAfter=10, textColor="navy"
    )

    elements = []
    elements.append(Paragraph(f"AURA-3 Venture Analysis Report", title_style))
    elements.append(Paragraph(f"Startup: {startup['name']}", styles["Heading3"]))
    elements.append(Paragraph(f"Score: {analysis.get('score', 'N/A')}/10", styles["Heading3"]))
    elements.append(Spacer(1, 0.3 * inch))

    sections = [
        ("Executive Summary", "executiveSummary"),
        ("Market Analysis", "marketAnalysis"),
        ("Team Assessment", "teamAssessment"),
        ("Risk Factors", "riskFactors"),
        ("Recommendation", "recommendation"),
    ]

    for title, key in sections:
        elements.append(Paragraph(title, heading_style))
        # Strip markdown formatting for PDF
        content = analysis.get(key, "Not available")
        content = content.replace("**", "").replace("##", "").replace("- ", "• ")
        # Split long content into paragraphs
        for para in content.split("\n"):
            if para.strip():
                elements.append(Paragraph(para.strip(), styles["BodyText"]))
        elements.append(Spacer(1, 0.2 * inch))

    elements.append(Spacer(1, 0.5 * inch))
    elements.append(
        Paragraph(
            "Disclaimer: This report was generated by AURA-3 AI and is not financial advice.",
            styles["Italic"],
        )
    )

    doc.build(elements)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=AURA3_Report_{startup_id}.pdf"},
    )


# ===================================================================
# FINSCOPE AI ENDPOINTS
# ===================================================================

@app.post("/finscope/chat")
async def finscope_chat(request: Request):
    """Handle FinScope AI chat messages."""
    body = await request.json()
    question = body.get("question", "")
    session_id = body.get("session_id", "default")

    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    # Get or create session
    if session_id not in finscope_sessions:
        finscope_sessions[session_id] = {"documents_text": "", "history": []}

    session = finscope_sessions[session_id]

    await emit_log(f"[FinScope] Routing query: {question[:50]}...")

    # Route to the appropriate agent
    has_doc = bool(session["documents_text"])
    agent = await asyncio.to_thread(route_query, question, has_doc)

    await emit_log(f"[FinScope] Agent selected: {agent}")
    await emit_log(f"[FinScope] Generating response via Groq...")

    # Generate response
    context = chunk_text(session["documents_text"]) if session["documents_text"] else ""
    answer = await asyncio.to_thread(
        generate_response, question, agent, context, session["history"]
    )

    # Update history
    session["history"].append({"role": "user", "content": question})
    session["history"].append({"role": "assistant", "content": answer})

    # Keep history manageable
    if len(session["history"]) > 20:
        session["history"] = session["history"][-20:]

    await emit_log(f"[FinScope] ✅ Response generated ({len(answer)} chars)")

    return {"answer": answer, "agent_used": agent}


@app.post("/finscope/analyze-document")
async def finscope_analyze_document(
    document: UploadFile = File(...),
    session_id: str = Form("default"),
):
    """Upload and analyze a document in FinScope."""
    await emit_log(f"[FinScope/Doc] Receiving document: {document.filename}")

    file_bytes = await document.read()
    try:
        text = extract_text(document.filename, file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Store in session for follow-up questions
    if session_id not in finscope_sessions:
        finscope_sessions[session_id] = {"documents_text": "", "history": []}
    finscope_sessions[session_id]["documents_text"] = text

    await emit_log(f"[FinScope/Doc] Extracted {len(text)} chars — analyzing with Document Analyzer agent...")

    # Analyze using the Document Analyzer agent
    chunked = chunk_text(text)
    prompt = f"Analyze this uploaded document thoroughly. The document is titled '{document.filename}'.\n\nDocument content:\n{chunked}"
    answer = await asyncio.to_thread(
        generate_response, prompt, "Document Analyzer", chunked
    )

    await emit_log(f"[FinScope/Doc] ✅ Document analysis complete")

    return {"analysis": answer, "agent_used": "Document Analyzer"}


# ===================================================================
# NEWS ENDPOINT
# ===================================================================

@app.get("/api/finance-news/headlines")
async def get_finance_news():
    """Fetch finance news headlines. Falls back to curated defaults."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Try CoinGecko trending for crypto news
            resp = await client.get(
                "https://api.coingecko.com/api/v3/search/trending"
            )
            if resp.status_code == 200:
                data = resp.json()
                coins = data.get("coins", [])[:5]
                articles = []
                for coin_data in coins:
                    item = coin_data.get("item", {})
                    articles.append({
                        "title": f"{item.get('name', 'Unknown')} ({item.get('symbol', '?')}) trending in crypto markets",
                        "source": "CoinGecko",
                        "snippet": f"Market cap rank: #{item.get('market_cap_rank', 'N/A')}. Price change 24h available on exchange.",
                        "url": f"https://www.coingecko.com/en/coins/{item.get('id', '')}",
                        "sentiment": "positive",
                        "time": datetime.now(timezone.utc).isoformat(),
                    })
                return {"articles": articles}
    except Exception:
        pass

    # Fallback headlines
    return {
        "articles": [
            {
                "title": "Ethereum Layer 2 Solutions See Record Growth in TVL",
                "source": "DeFi Pulse",
                "snippet": "Total value locked across L2 networks exceeds $40B as adoption accelerates.",
                "url": "#",
                "sentiment": "positive",
                "time": datetime.now(timezone.utc).isoformat(),
            },
            {
                "title": "SEC Reviews Framework for Digital Asset Classification",
                "source": "Reuters",
                "snippet": "New guidelines expected to clarify token security status for DeFi protocols.",
                "url": "#",
                "sentiment": "neutral",
                "time": datetime.now(timezone.utc).isoformat(),
            },
            {
                "title": "DAO Governance Models Gain Institutional Interest",
                "source": "Bloomberg",
                "snippet": "Major funds exploring decentralized governance for portfolio companies.",
                "url": "#",
                "sentiment": "positive",
                "time": datetime.now(timezone.utc).isoformat(),
            },
        ]
    }

@app.get("/api/youtube/search")
async def search_youtube(q: str):
    """Search for a real YouTube video ID using DuckDuckGo"""
    try:
        def fetch_ddg():
            from ddgs import DDGS
            return DDGS().text(f"site:youtube.com {q}", max_results=1)
            
        results = await asyncio.to_thread(fetch_ddg)
        if results and len(results) > 0:
            href = results[0].get("href", "")
            import urllib.parse
            parsed = urllib.parse.urlparse(href)
            if "watch" in parsed.path:
                qs = urllib.parse.parse_qs(parsed.query)
                if "v" in qs:
                    return {"videoId": qs["v"][0]}
            elif "youtu.be" in parsed.netloc:
                return {"videoId": parsed.path.strip('/')}
                
        return {"videoId": None}
    except Exception as e:
        return {"videoId": None, "error": str(e)}


# ===================================================================
# Mount Socket.IO + Run
# ===================================================================

# Wrap FastAPI with Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, app)


@sio.event
async def connect(sid, environ):
    logger.info(f"Socket.IO client connected: {sid}")
    await sio.emit("log_stream", {"message": "AURA-3 backend connection established."}, to=sid)


@sio.event
async def disconnect(sid):
    logger.info(f"Socket.IO client disconnected: {sid}")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    logger.info(f"🚀 AURA-3 Backend starting on port {port}")
    uvicorn.run(socket_app, host="0.0.0.0", port=port, log_level="info")
