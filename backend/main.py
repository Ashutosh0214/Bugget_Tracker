import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.responses import JSONResponse

from config import get_settings
from database import init_db
from routers import ai_router, auth_router, budget_router, transaction_router

logger = logging.getLogger(__name__)
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup
    init_db()
    yield

app = FastAPI(
    title="Spendzy Budget Tracker API",
    description="Python FastAPI REST API Backend for Spendzy Budget Tracker",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include Routers
app.include_router(auth_router.router)
app.include_router(transaction_router.router)
app.include_router(budget_router.router)
app.include_router(ai_router.router)

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc):
    if isinstance(exc.detail, dict) and "message" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"message": str(exc.detail)})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = [
        {"field": ".".join(str(part) for part in error["loc"][1:]), "message": error["msg"]}
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"message": "Invalid request data", "errors": errors},
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error while processing %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"message": "Internal server error"})


# Healthcheck Endpoint
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "Spendzy Python Backend Server Running (FastAPI)",
        "timestamp": datetime.now().astimezone().isoformat()
    }

# Root Endpoint
@app.get("/")
def root():
    return {
        "name": "Spendzy API",
        "status": "running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=not settings.is_production)
