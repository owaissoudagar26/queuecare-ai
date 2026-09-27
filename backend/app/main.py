import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, SessionLocal
import app.models
from app.services.seed_service import seed_database
from app.services.ai_service import ai_service
from app.websocket_manager import ws_manager

from app.routers.auth_router import router as auth_router
from app.routers.department_router import router as department_router
from app.routers.doctor_router import router as doctor_router
from app.routers.patient_router import router as patient_router
from app.routers.queue_router import router as queue_router
from app.routers.ai_router import router as ai_router
from app.routers.analytics_router import router as analytics_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("queuecare.main")

# Initialize database schema immediately
init_db()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database and verifying seed data...")
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    logger.info("Loading AI waiting time predictor...")
    ai_service.load_or_train_model()
    
    logger.info("QueueCare AI Backend is ready!")
    yield
    logger.info("Shutting down QueueCare AI Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack AI-powered Hospital Queue Management Platform Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Also seed on import so testing without lifespan context has seeded data ready
_seed_db = SessionLocal()
try:
    seed_database(_seed_db)
finally:
    _seed_db.close()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Endpoint
@app.websocket("/ws/queue")
async def websocket_queue_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(department_router, prefix=settings.API_V1_STR)
app.include_router(doctor_router, prefix=settings.API_V1_STR)
app.include_router(patient_router, prefix=settings.API_V1_STR)
app.include_router(queue_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "app": "QueueCare AI Backend",
        "tagline": "Smarter Queues. Faster Care.",
        "version": "1.0.0",
        "docs_url": "/docs",
        "status": "healthy"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "QueueCare AI API"}
