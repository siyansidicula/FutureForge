"""
FutureForge AI — Flask backend
IBM watsonx.ai  ·  Granite-3-8B-Instruct
"""

# ═══════════════════════════════════════════════════════════════════════════
#  AGENT_INSTRUCTIONS
#  Edit this block to customise the AI's entire behaviour without touching
#  any other part of the codebase.
# ═══════════════════════════════════════════════════════════════════════════
AGENT_INSTRUCTIONS = """
## Identity
You are FutureForge AI, an expert career and learning advisor powered by IBM Granite.
Your mission is to help students build a crystal-clear, personalised roadmap from
where they are today to the tech career they dream about.

## Coaching Style
- Warm, encouraging, and concise — never condescending.
- Use bullet points and numbered lists to keep responses scannable.
- Celebrate every milestone the student shares; positive reinforcement matters.
- Ask one clarifying follow-up question at a time; don't overwhelm the student.

## Information Gathering (Phase 1)
Before producing a roadmap you MUST collect all five of the following data points.
Ask about them naturally in conversation — never as a dry form. Track which ones
you already know and only ask about missing ones.

  1. INTERESTS      — What topics / domains excite them (e.g. AI, web dev, cybersecurity)?
  2. SKILL_LEVEL    — Current experience (complete beginner / some coding / intermediate / advanced)?
  3. CAREER_GOALS   — Target role or outcome (e.g. "ML Engineer at a startup", "freelance developer")?
  4. LEARNING_STYLE — How they learn best (videos / hands-on projects / books / structured courses)?
  5. TIME_BUDGET    — Hours per week they can dedicate to learning.

Once all five are known, respond with a full roadmap (Phase 2).

## Roadmap Format (Phase 2)
Structure the roadmap with these exact headings so the frontend can parse them:

  ### 🗺️ Personalised Roadmap
  A 3–6 month phased plan with clear weekly milestones.

  ### 📚 Recommended Courses
  3–5 specific courses with platform, title, and a one-sentence reason.

  ### 🛠️ Project Ideas
  3 hands-on projects ordered by complexity; include tech stack hints.

  ### 🏆 Certifications
  2–3 industry-recognised certs that match the career goal.

  ### 📅 Weekly Study Plan
  A sample week-by-week schedule that fits their time budget.

## Recommendation Strategy
- Prefer free-first resources (freeCodeCamp, fast.ai, CS50, The Odin Project).
- Supplement with paid platforms only when they offer unique value (Coursera, Udemy).
- Tailor stack recommendations to current job-market demand.
- For AI/ML paths always include Python fundamentals before deep-learning frameworks.

## Safety & Boundaries
- Stay strictly on-topic: learning, careers, technology, and self-development.
- Politely decline to discuss politics, harmful content, or unrelated personal advice.
- Never fabricate course URLs — describe the course and platform instead.
- If unsure about a fact, say so and suggest the student verify it.
- Do not impersonate other AI systems or claim capabilities you don't have.
"""
# ═══════════════════════════════════════════════════════════════════════════

import os
import json
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
from ibm_watsonx_ai import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as GenParams

# ── Environment ─────────────────────────────────────────────────────────────
load_dotenv()

IBM_API_KEY        = os.getenv("IBM_API_KEY")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID")
WATSONX_URL        = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
FLASK_SECRET_KEY   = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")

# ── Flask app ────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY
CORS(app)

# Module-level model cache (populated on first successful call)
_CACHED_MODEL: ModelInference | None = None
_CACHED_MODEL_ID: str = ""

# ── watsonx.ai model ─────────────────────────────────────────────────────────
def get_model() -> ModelInference:
    """Initialise a fresh ModelInference client."""
    credentials = Credentials(
        url=WATSONX_URL,
        api_key=IBM_API_KEY,
    )
    params = {
        GenParams.MAX_NEW_TOKENS: 2048,
        GenParams.MIN_NEW_TOKENS: 30,
        GenParams.TEMPERATURE:    0.7,
        GenParams.TOP_P:          0.9,
        GenParams.TOP_K:          50,
        GenParams.REPETITION_PENALTY: 1.1,
    }
    # Preferred model order — first available wins at runtime
    CANDIDATE_MODELS = [
        "ibm/granite-4-h-small",              # newest Granite small
        "meta-llama/llama-3-3-70b-instruct",  # strong Llama fallback
        "meta-llama/llama-3-1-8b",            # lighter Llama
        "ibm/granite-3-1-8b-base",            # Granite base
    ]

    model_id = os.getenv("WATSONX_MODEL_ID", CANDIDATE_MODELS[0])

    return ModelInference(
        model_id=model_id,
        params=params,
        credentials=credentials,
        project_id=WATSONX_PROJECT_ID,
    )


def get_working_model() -> tuple:
    """
    Try candidate models in order and return the first (model, model_id) that works.
    Result is cached in a module-level variable after first successful call.
    """
    global _CACHED_MODEL, _CACHED_MODEL_ID
    if _CACHED_MODEL is not None:
        return _CACHED_MODEL, _CACHED_MODEL_ID

    CANDIDATE_MODELS = [
        "ibm/granite-4-h-small",
        "meta-llama/llama-3-3-70b-instruct",
        "meta-llama/llama-3-1-8b",
        "ibm/granite-3-1-8b-base",
    ]

    override = os.getenv("WATSONX_MODEL_ID")
    if override:
        CANDIDATE_MODELS = [override] + [m for m in CANDIDATE_MODELS if m != override]

    credentials = Credentials(url=WATSONX_URL, api_key=IBM_API_KEY)
    params = {
        GenParams.MAX_NEW_TOKENS: 2048,
        GenParams.MIN_NEW_TOKENS: 30,
        GenParams.TEMPERATURE:    0.7,
        GenParams.TOP_P:          0.9,
        GenParams.TOP_K:          50,
        GenParams.REPETITION_PENALTY: 1.1,
    }

    for model_id in CANDIDATE_MODELS:
        try:
            m = ModelInference(
                model_id=model_id,
                params=params,
                credentials=credentials,
                project_id=WATSONX_PROJECT_ID,
            )
            # Cheap probe — generate 1 token
            m.generate_text(prompt="Hi", params={GenParams.MAX_NEW_TOKENS: 1})
            _CACHED_MODEL = m
            _CACHED_MODEL_ID = model_id
            app.logger.info(f"Using model: {model_id}")
            return m, model_id
        except Exception:
            continue

    raise RuntimeError(
        "No working watsonx.ai model found. "
        "Check that your WML instance is Active at cloud.ibm.com/resources."
    )


def build_prompt(conversation_history: list[dict], model_id: str = "") -> str:
    """
    Construct the full prompt string from conversation history.
    Uses Granite/Llama chat template: <|system|> … <|user|> … <|assistant|>
    For granite-3-1-8b-base (no instruct tuning) we use a plain text format.
    """
    is_base = model_id.endswith("-base")

    if is_base:
        # Plain-text prompt for base models
        lines = [
            "### System\n" + AGENT_INSTRUCTIONS.strip(),
            "",
        ]
        for msg in conversation_history:
            role    = msg.get("role", "user")
            content = msg.get("content", "").strip()
            if role == "user":
                lines.append(f"### User\n{content}")
            elif role == "assistant":
                lines.append(f"### Assistant\n{content}")
        lines.append("### Assistant\n")
        return "\n".join(lines)

    # Instruct / chat template (Granite instruct, Llama, etc.)
    prompt_parts = [f"<|system|>\n{AGENT_INSTRUCTIONS.strip()}\n<|end_of_text|>\n"]
    for msg in conversation_history:
        role    = msg.get("role", "user")
        content = msg.get("content", "").strip()
        if role == "user":
            prompt_parts.append(f"<|user|>\n{content}\n<|end_of_text|>\n")
        elif role == "assistant":
            prompt_parts.append(f"<|assistant|>\n{content}\n<|end_of_text|>\n")
    prompt_parts.append("<|assistant|>\n")
    return "".join(prompt_parts)


# ── Routes ───────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    """Serve the single-page application."""
    session.setdefault("conversation", [])
    return render_template("index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Receive a user message, append to session history, call watsonx.ai,
    and return the assistant reply.

    Request  JSON: { "message": "..." }
    Response JSON: { "reply": "...", "conversation": [...] }
    """
    data    = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"error": "Empty message"}), 400

    # Validate credentials are set
    if not IBM_API_KEY or IBM_API_KEY == "your_ibm_cloud_api_key_here":
        return jsonify({
            "error": "IBM API key not configured. "
                     "Please copy .env.example to .env and add your credentials."
        }), 503

    if not WATSONX_PROJECT_ID or WATSONX_PROJECT_ID == "your_watsonx_project_id_here":
        return jsonify({
            "error": "Watsonx project ID not configured. "
                     "Please copy .env.example to .env and add your credentials."
        }), 503

    # Retrieve or reset session history
    conversation: list[dict] = session.get("conversation", [])

    # Greet automatically on first message if history is empty
    if not conversation:
        intro = (
            "Hello! I'm **FutureForge AI** 👋 — your personal tech-career advisor "
            "powered by IBM Granite.\n\n"
            "I'll help you build a custom learning roadmap tailored exactly to your "
            "goals, interests, and schedule. Let's start with something simple:\n\n"
            "**What area of tech excites you the most right now?** "
            "(e.g. web development, AI/ML, cybersecurity, mobile apps, data science…)"
        )
        conversation.append({"role": "assistant", "content": intro})

    # Append the new user message
    conversation.append({"role": "user", "content": message})

    try:
        model, model_id = get_working_model()
        prompt = build_prompt(conversation, model_id)
        result = model.generate_text(prompt=prompt)

        # Clean up stop tokens that may leak through
        reply = result.strip()
        for token in ["<|end_of_text|>", "<|user|>", "<|system|>", "<|assistant|>"]:
            reply = reply.replace(token, "").strip()

        conversation.append({"role": "assistant", "content": reply})
        session["conversation"] = conversation

        return jsonify({
            "reply":        reply,
            "conversation": conversation,
        })

    except Exception as exc:  # noqa: BLE001
        app.logger.exception("watsonx.ai call failed")
        return jsonify({"error": f"AI service error: {str(exc)}"}), 500


@app.route("/api/reset", methods=["POST"])
def reset():
    """Clear the conversation history for the current session."""
    session["conversation"] = []
    return jsonify({"status": "ok", "message": "Conversation reset."})


@app.route("/api/status", methods=["GET"])
def status():
    """Health-check / credential validation endpoint."""
    configured = bool(
        IBM_API_KEY
        and IBM_API_KEY != "your_ibm_cloud_api_key_here"
        and WATSONX_PROJECT_ID
        and WATSONX_PROJECT_ID != "your_watsonx_project_id_here"
    )
    return jsonify({
        "status":     "ready" if configured else "unconfigured",
        "configured": configured,
        "model":      _CACHED_MODEL_ID or "auto-detect",
    })


# ── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
