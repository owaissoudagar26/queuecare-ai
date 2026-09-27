import os
import sys
import tempfile
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "QueueCare AI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "queuecare-ai-super-secret-jwt-key-2026-production-ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Check if running in serverless environment (like Vercel / AWS Lambda)
    is_serverless: bool = os.getenv("VERCEL", "0") == "1" or os.getenv("AWS_LAMBDA_FUNCTION_NAME") is not None
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(tempfile.gettempdir(), 'queuecare.db')}" if is_serverless else "sqlite:///./queuecare.db"
    )
    
    # ML Model directory
    MODEL_DIR: str = os.path.join(tempfile.gettempdir(), "queuecare_models") if is_serverless else os.path.join(os.path.dirname(os.path.abspath(__file__)), "ml", "saved_models")
    MODEL_PATH: str = os.path.join(MODEL_DIR, "wait_time_model.joblib")

    class Config:
        case_sensitive = True

settings = Settings()
try:
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
except Exception:
    pass
