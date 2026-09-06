import logging

from fastapi import APIRouter, Depends

from ai_service import build_verified_context, deterministic_reply, generate_gemini_reply
from auth import get_current_user
from schemas import AIChatRequest, AIChatResponse


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


@router.post("/chat", response_model=AIChatResponse)
async def chat(data: AIChatRequest, current_user: dict = Depends(get_current_user)):
    context = build_verified_context(current_user["id"])
    history = [item.model_dump() for item in data.history]
    deterministic = deterministic_reply(data.message, context, history)
    if deterministic:
        return {"reply": deterministic, "source": "deterministic", "forecast_warning": False}
    try:
        reply = await generate_gemini_reply(data.message, context, history)
        return {"reply": reply, "source": "gemini", "forecast_warning": context["forecast"] is not None}
    except Exception as exc:
        logger.warning("Gemini response unavailable: %s", type(exc).__name__)
        return {
            "reply": "I couldn't use the conversational AI right now, but I can still answer standard questions about your spending, income, savings, budgets, and forecasts.",
            "source": "fallback",
            "forecast_warning": False,
        }
