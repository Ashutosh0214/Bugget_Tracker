import logging
import re

from fastapi import APIRouter, Depends

from ai_service import (
    build_verified_context,
    derive_conversation_context,
    deterministic_reply,
    generate_gemini_reply,
)
from auth import get_current_user
from schemas import AIChatRequest, AIChatResponse


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


def _safe_provider_error(exc: Exception) -> str:
    status_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    message = str(exc).replace("\n", " ")
    message = re.sub(r"AIza[\w-]+", "<redacted>", message)
    message = re.sub(r"(?i)(api[_-]?key|key)=([^&\s]+)", r"\1=<redacted>", message)
    message = message[:500]
    status_text = f" status={status_code}" if status_code is not None else ""
    return f"{type(exc).__name__}{status_text}: {message}"


@router.post("/chat", response_model=AIChatResponse)
async def chat(data: AIChatRequest, current_user: dict = Depends(get_current_user)):
    context = build_verified_context(current_user["id"])
    history = [item.model_dump() for item in data.history]
    conversation_context = data.context.model_dump(exclude_none=True)
    next_context = derive_conversation_context(data.message, context, conversation_context)
    deterministic = deterministic_reply(data.message, context, history, conversation_context)
    if deterministic:
        return {
            "reply": deterministic,
            "source": "deterministic",
            "forecast_warning": False,
            "context": next_context,
        }
    try:
        reply = await generate_gemini_reply(data.message, context, history)
        return {
            "reply": reply,
            "source": "gemini",
            "forecast_warning": context["forecast"] is not None,
            "context": next_context,
        }
    except Exception as exc:
        logger.warning("Gemini response unavailable: %s", _safe_provider_error(exc))
        return {
            "reply": "I couldn't use the conversational AI right now, but I can still answer standard questions about your spending, income, savings, budgets, and forecasts.",
            "source": "fallback",
            "forecast_warning": False,
            "context": next_context,
        }
