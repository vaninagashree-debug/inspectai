import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Use local SQLite database path for development
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "visionguard.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

# Setup Async Database Engine
engine = create_async_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}, # Required for SQLite async thread handling
    echo=False
)

# Async Session Maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for SQLAlchemy Models
Base = declarative_base()

# Async DB Dependency for FastAPI Routes
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
