"""Application settings loaded from environment variables."""
import os
from dotenv import load_dotenv

load_dotenv(override=True)

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "resume_analyzer")
    GEMINI_MODEL: str = "gemini-2.5-flash-lite"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-123!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")
    MAX_FILE_SIZE_MB: int = 10

settings = Settings()

