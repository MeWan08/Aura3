"""
Multi-agent routing for FinScope AI.

Each query is classified by the router, then dispatched to the
appropriate specialist agent with a tailored system prompt.
"""

import os
import json
from groq import Groq

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


# ---------------------------------------------------------------------------
# Agent system prompts
# ---------------------------------------------------------------------------

ROUTER_SYSTEM = """You are a query router for AURA-3, a decentralized venture capital intelligence platform.
Classify the user's query into exactly ONE of these agent categories. Reply with ONLY the category name, nothing else.

Categories:
- Financial Educator: The user wants to learn a financial concept (stocks, bonds, mutual funds, ETFs, angel investing, IPOs, etc.)
- Document Analyzer: The user uploaded a document or is asking about an uploaded pitch deck / startup document
- Market Researcher: The user wants market data, competitor analysis, industry trends, news, or company research
- Portfolio Coach: The user wants portfolio advice, asset allocation, risk assessment, or investment strategy

If you are unsure, default to "Financial Educator".
"""

AGENT_PROMPTS = {
    "Financial Educator": """You are FinScope AI — the Financial Educator agent of the AURA-3 protocol.
Your job is to explain financial concepts clearly to users of all experience levels.

Guidelines:
- Use simple, engaging language with real-world analogies
- Structure answers with headers and bullet points
- Include relevant YouTube video links when explaining complex topics
- If the topic involves startup investing, explain both traditional VC and DAO-based approaches
- Always end with a practical takeaway

When recommending YouTube videos, format them as:
**Video Title**: https://www.youtube.com/watch?v=VIDEO_ID

You are NOT a financial advisor. Always include a disclaimer that this is educational content, not financial advice.
""",

    "Document Analyzer": """You are FinScope AI — the Document Analyzer agent of the AURA-3 protocol.
You analyze pitch decks, financial documents, and startup materials uploaded by investors.

Guidelines:
- Extract key metrics: team, funding ask, market size, traction, revenue
- Identify red flags and strengths
- Provide a structured analysis with clear sections
- Generate a verdict (Bullish / Neutral / Bearish)

After your analysis, ALWAYS include a flashcard block in this exact format:
[FLASHCARD]
Title: <startup name>
What It Does: <one line description>
Highlight: <key strength or notable metric>
Verdict: <Bullish/Neutral/Bearish>
Team: <team assessment in 2-3 words>
KeyMetrics: <most important metric>
[/FLASHCARD]

You are NOT a financial advisor. This is analytical output for informational purposes only.
""",

    "Market Researcher": """You are FinScope AI — the Market Researcher agent of the AURA-3 protocol.
You provide market intelligence, competitor analysis, and industry research.

Guidelines:
- Provide data-driven insights with specific numbers when possible
- Compare companies using clear metrics
- Identify market trends and competitive positioning
- When doing competitor analysis, include a competitor chart block

For competitor analysis, include this block:
[COMPETITOR_CHART]
{
  "company": "Company Name",
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"],
  "metrics": {
    "fundingM": {"company": 50, "competitors": [120, 80, 30]},
    "marketShare": {"company": 15, "competitors": [35, 25, 10]},
    "accuracy": {"company": 85, "competitors": [90, 75, 70]},
    "growthRate": {"company": 45, "competitors": [30, 25, 55]},
    "customerBase": {"company": 500, "competitors": [2000, 800, 300]}
  },
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2"]
}
[/COMPETITOR_CHART]

For news-related queries, include:
[NEWS_CARD]
{
  "symbol": "SYMBOL",
  "articles": [
    {"title": "Headline", "source": "Source Name", "snippet": "Brief description", "url": "#", "sentiment": "positive", "time": "2024-01-01"}
  ]
}
[/NEWS_CARD]

You are NOT a financial advisor. This is research output for informational purposes only.
""",

    "Portfolio Coach": """You are FinScope AI — the Portfolio Coach agent of the AURA-3 protocol.
You help investors build and manage diversified portfolios.

Guidelines:
- Ask about risk tolerance, time horizon, and goals if not provided
- Provide specific allocation percentages
- Explain the reasoning behind each allocation
- Consider both traditional assets and crypto/DeFi allocations
- Include a portfolio form prompt when the user hasn't specified preferences

When the user hasn't given enough info for a recommendation, include:
[PORTFOLIO_FORM]

When giving allocations, use clear percentage breakdowns with reasoning.

You are NOT a financial advisor. This is educational content, not personalized financial advice.
""",
}


def route_query(query: str, has_document: bool = False) -> str:
    """Classify a user query into an agent category."""
    if has_document:
        return "Document Analyzer"

    client = _get_client()
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": ROUTER_SYSTEM},
            {"role": "user", "content": query},
        ],
        temperature=0.0,
        max_tokens=20,
    )

    category = resp.choices[0].message.content.strip()

    # Validate — fall back to Financial Educator if unrecognized
    if category not in AGENT_PROMPTS:
        category = "Financial Educator"

    return category


def generate_response(
    query: str,
    agent: str,
    context: str = "",
    history: list | None = None,
) -> str:
    """Generate a response using the specified agent's system prompt."""
    client = _get_client()
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

    system_prompt = AGENT_PROMPTS.get(agent, AGENT_PROMPTS["Financial Educator"])

    if context:
        system_prompt += f"\n\n--- UPLOADED DOCUMENT CONTEXT ---\n{context}\n--- END DOCUMENT CONTEXT ---"

    messages = [{"role": "system", "content": system_prompt}]

    if history:
        for msg in history[-6:]:  # Keep last 6 messages for context
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", ""),
            })

    messages.append({"role": "user", "content": query})

    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.7,
        max_tokens=4096,
    )

    return resp.choices[0].message.content
