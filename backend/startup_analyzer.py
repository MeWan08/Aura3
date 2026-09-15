"""
Startup evaluation pipeline powered by Groq.

Takes extracted pitch-deck text and produces a structured analysis
matching the JSON shape the Aura3 frontend expects.
"""

import os
import json
import logging
from typing import Dict, Any
from groq import Groq
from ddgs import DDGS

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


ANALYSIS_SYSTEM_PROMPT = """You are an elite AI venture capital analyst for the AURA-3 decentralized funding protocol.

You will receive the full text content extracted from a startup's pitch deck. Your job is to produce a comprehensive investment analysis report.

You MUST return your analysis as a valid JSON object with exactly these keys:
{
  "score": <number 1-10>,
  "categoryScores": {
    "team": <number 1-10>,
    "market": <number 1-10>,
    "product": <number 1-10>,
    "traction": <number 1-10>,
    "risk": <number 1-10>
  },
  "projectedRevenue": [
    { "year": "Year 1", "revenue": <number in millions, e.g. 1.5> },
    { "year": "Year 2", "revenue": <number> },
    { "year": "Year 3", "revenue": <number> },
    { "year": "Year 4", "revenue": <number> },
    { "year": "Year 5", "revenue": <number> }
  ],
  "executiveSummary": "<2-3 paragraph executive summary>",
  "marketAnalysis": "<detailed market analysis in markdown>",
  "teamAssessment": "<team assessment in markdown>",
  "riskFactors": "<risk factors in markdown bullet points>",
  "recommendation": "<clear investment recommendation in markdown>"
}

Scoring guide:
- 9-10: Exceptional opportunity, strong team, massive market, clear traction
- 7-8: Strong opportunity with minor concerns
- 5-6: Average opportunity, needs more validation
- 3-4: Below average, significant risks
- 1-2: Not recommended for investment

Use markdown formatting (headers, bullets, bold) within each field for readability.
Return ONLY the JSON object, no surrounding text or code fences.
"""


def analyze_startup(pitch_text: str, startup_name: str = "Unknown", cin: str = "") -> dict:
    """Run the full startup analysis pipeline and return structured results."""
    
    # 1. Perform Web Search for Credibility & CIN
    web_context = ""
    if startup_name and startup_name != "Unknown":
        search_query = f"{startup_name} "
        if cin:
            search_query += f"CIN {cin} Ministry of Corporate Affairs India credibility"
        else:
            search_query += "company credibility reviews"
            
        try:
            results = DDGS().text(search_query, max_results=3)
            if results:
                web_context = "\n\nWEB SEARCH RESULTS FOR CREDIBILITY & VERIFICATION:\n"
                for i, r in enumerate(results):
                    web_context += f"{i+1}. {r.get('title', '')}: {r.get('body', '')}\n"
        except Exception as e:
            logging.warning(f"Web search failed: {e}")

    client = _get_client()
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    # Inject web context into the prompt
    final_system_prompt = ANALYSIS_SYSTEM_PROMPT
    if web_context:
        final_system_prompt += "\nUse the following recent web search results to verify the startup's credibility, especially verifying their CIN if provided. Explicitly mention your findings regarding their credibility and CIN verification in the executive summary or risk factors.\n" + web_context

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": final_system_prompt},
            {
                "role": "user",
                "content": f"Analyze this startup pitch deck and provide your investment analysis:\n\n{pitch_text}",
            },
        ],
        temperature=0.4,
        max_tokens=4096,
    )

    raw = resp.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw = "\n".join(lines).strip()

    try:
        analysis = json.loads(raw)
    except json.JSONDecodeError:
        # If JSON parsing fails, create a structured fallback
        analysis = {
            "score": 5,
            "categoryScores": {"team": 5, "market": 5, "product": 5, "traction": 5, "risk": 5},
            "projectedRevenue": [],
            "executiveSummary": raw[:500] if raw else "Analysis could not be structured properly.",
            "marketAnalysis": "Market analysis could not be parsed from the AI response.",
            "teamAssessment": "Team assessment could not be parsed from the AI response.",
            "riskFactors": "- Risk analysis unavailable due to parsing error",
            "recommendation": "Please re-run the analysis or review the raw output.",
        }

    # Ensure all required keys exist
    required = ["score", "categoryScores", "executiveSummary", "marketAnalysis", "teamAssessment", "riskFactors", "recommendation"]
    for key in required:
        if key not in analysis:
            analysis[key] = "Not available"

    return analysis


def chat_about_startup(question: str, pitch_text: str) -> str:
    """Answer investor questions about a specific startup using its pitch deck data."""
    client = _get_client()
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    system_prompt = f"""You are an AI venture analyst for the AURA-3 protocol.
You have access to a startup's pitch deck data and must answer the investor's questions
about this specific startup accurately and insightfully.

--- STARTUP PITCH DECK DATA ---
{pitch_text[:10000]}
--- END PITCH DECK DATA ---

Guidelines:
- Answer questions specifically about this startup
- Cite specific data points from the pitch deck when possible
- Be honest about limitations or missing information
- Provide actionable insights for the investor
- Use markdown formatting for clarity"""

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
        temperature=0.5,
        max_tokens=2048,
    )

    return resp.choices[0].message.content
