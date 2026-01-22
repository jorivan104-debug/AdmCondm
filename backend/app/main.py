from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.core.database import engine, Base
from app.core.config import settings
from app.api import auth, condominiums, blocks, residents, properties, accounting, space_requests, meetings, documents, notifications, document_attachments
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create upload directory
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(exist_ok=True)

app = FastAPI(
    title="Sistema de Gestión Condominial API",
    description="API para gestión de condominios y propiedades horizontales",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Debug middleware to log requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    auth_header = request.headers.get("Authorization")
    if auth_header:
        token_preview = auth_header[:50] + "..." if len(auth_header) > 50 else auth_header
        logger.info(f"[REQUEST] {request.method} {request.url.path} - Auth: Present - Token preview: {token_preview}")
    else:
        logger.warning(f"[REQUEST] {request.method} {request.url.path} - Auth: MISSING")
    response = await call_next(request)
    logger.info(f"[RESPONSE] {request.method} {request.url.path} - Status: {response.status_code}")
    return response

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(condominiums.router, prefix="/api/condominiums", tags=["Condominiums"])
app.include_router(blocks.router, prefix="/api/blocks", tags=["Blocks"])
app.include_router(residents.router, prefix="/api/residents", tags=["Residents"])
app.include_router(properties.router, prefix="/api/properties", tags=["Properties"])
app.include_router(accounting.router, prefix="/api/accounting", tags=["Accounting"])
app.include_router(space_requests.router, prefix="/api/space-requests", tags=["Space Requests"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["Meetings"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(document_attachments.router, prefix="/api/document-attachments", tags=["Document Attachments"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])


@app.get("/")
async def root():
    return {"message": "Sistema de Gestión Condominial API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

