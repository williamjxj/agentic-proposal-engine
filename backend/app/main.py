"""
FastAPI Main Application - Entry Point

Configures FastAPI app with CORS, middleware, and routers.
"""

import warnings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

# Suppress known compatibility warnings
warnings.filterwarnings("ignore", message=".*trapped.*error reading bcrypt version.*")

from app.config import settings
from app.core.logging import setup_logging
from app.core.middleware import TimingMiddleware
from app.core.database import get_db_pool, close_db_pool
from app.routers import health, auth
# Workflow routers
from app.routers import session, analytics, draft
# from app.routers import sync  # Will be created for offline sync

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)

# Suppress chromadb telemetry errors (non-critical internal library issue)
logging.getLogger("chromadb.telemetry").setLevel(logging.CRITICAL)

# Create FastAPI app
app = FastAPI(
    title="Auto-Bidder AI Service",
    description="Python AI service for proposal generation, RAG, and job scraping",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add timing middleware for performance tracking
app.add_middleware(TimingMiddleware, slow_request_threshold_ms=500.0)


# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )


# Include routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(health.router, prefix="/health", tags=["health"])

# Workflow optimization routers
app.include_router(session.router, prefix="/api", tags=["session"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(draft.router, prefix="/api", tags=["drafts"])
# UI Routers Improvement
from app.routers import keywords, strategies, knowledge_base, proposals
from app.routers import settings as settings_router
app.include_router(keywords.router, prefix="/api", tags=["keywords"])
app.include_router(strategies.router, prefix="/api", tags=["strategies"])
app.include_router(knowledge_base.router, prefix="/api", tags=["knowledge-base"])
app.include_router(settings_router.router, prefix="/api", tags=["settings"])
app.include_router(proposals.router, tags=["proposals"])
# Future router for offline sync
# app.include_router(sync.router, prefix="/api", tags=["sync"])


# Startup event
@app.on_event("startup")
async def startup_event():
    """Execute on application startup."""
    logger.info("🚀 Auto-Bidder AI Service starting...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Log Level: {settings.log_level}")
    
    # Initialize database pool
    try:
        await get_db_pool()
        logger.info("✅ Database connection pool initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize database pool: {e}")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Execute on application shutdown."""
    logger.info("🛑 Auto-Bidder AI Service shutting down...")
    
    # Close database pool
    await close_db_pool()


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": "Auto-Bidder AI Service",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
    )
