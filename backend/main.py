import os
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import auth_router, transaction_router

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router.router)
app.include_router(transaction_router.router)

# Healthcheck Endpoint
@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "Spendzy Python Backend Server Running (FastAPI)",
        "timestamp": datetime.now().isoformat()
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
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
