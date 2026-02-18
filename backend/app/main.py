"""FastAPI application entry point."""

import hmac
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from fastapi import Header

from app.api.deps import DbSession
from app.api.v1.router import router as api_router
from app.config import settings
from app.core.exceptions import ToolHubException, BadRequestError
from app.core.rate_limiter import limiter
from app.db.session import init_db, get_session
from app.workers.cleanup import start_cleanup_scheduler, stop_cleanup_scheduler


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses.

    SECURITY: These headers protect against various web vulnerabilities:
    - X-Content-Type-Options: Prevents MIME type sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Basic XSS protection (legacy browsers)
    - Referrer-Policy: Controls referrer information
    - Content-Security-Policy: Controls resource loading
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Only add HSTS in production (requires HTTPS)
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Skip strict CSP for Swagger UI docs (they load assets from cdn.jsdelivr.net)
        is_docs_route = request.url.path in ("/docs", "/redoc", "/openapi.json")
        if not is_docs_route:
            # Basic CSP - allow self for frames to support PDF previews
            # In development, also allow localhost/127.0.0.1 for connect-src to support various dev ports
            connect_src = "'self'"
            if not settings.is_production:
                connect_src += " localhost:* 127.0.0.1:*"
                
            response.headers["Content-Security-Policy"] = (
                f"default-src 'self'; "
                f"script-src 'self' 'unsafe-inline'; "
                f"style-src 'self' 'unsafe-inline'; "
                f"img-src 'self' data: https:; "
                f"font-src 'self'; "
                f"connect-src {connect_src}; "
                f"frame-ancestors 'self'; "
                f"object-src 'self'"
            )

        return response


def preload_ml_models():
    """Pre-load ML models for faster first request."""
    try:
        from app.services.tools.image_service import _get_rembg_session
        _get_rembg_session()
        print("Pre-loaded rembg model for background removal")
    except Exception as e:
        print(f"Warning: Failed to pre-load rembg model: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    print(f"Starting {settings.app_name} v{settings.app_version}")

    # Create temp directory
    os.makedirs(settings.temp_file_dir, exist_ok=True)

    # Initialize database tables (for development)
    if settings.debug:
        await init_db()

    # Start cleanup scheduler
    start_cleanup_scheduler()

    # Pre-load ML models in background (don't block startup)
    import threading
    threading.Thread(target=preload_ml_models, daemon=True).start()

    yield

    # Shutdown
    stop_cleanup_scheduler()
    print(f"Shutting down {settings.app_name}")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="All-in-one productivity suite API",
    version=settings.app_version,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# SECURITY: Add security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware
allowed_origins = list(settings.allowed_origins)
if not settings.is_production:
    # Add common development ports if not already present
    dev_origins = [
        "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
        "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"
    ]
    for origin in dev_origins:
        if origin not in allowed_origins:
            allowed_origins.append(origin)

print(f"DEBUG: Allowed Origins: {allowed_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Custom exception handler
@app.exception_handler(ToolHubException)
async def toolhub_exception_handler(request: Request, exc: ToolHubException):
    """Handle custom ToolHub exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": exc.message,
            "success": False,
            "details": exc.details,
        },
    )


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.environment,
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs" if settings.debug else "Disabled in production",
    }


# Include API router
app.include_router(api_router)


# Run with uvicorn
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
