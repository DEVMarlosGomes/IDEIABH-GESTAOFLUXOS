from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Get database URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://postgres:%40Mgfj125256@db.kgzwiqxvtjnizcjsclnh.supabase.co:5432/postgres')
DATABASE_URL_SYNC = os.environ.get('DATABASE_URL_SYNC', 'postgresql://postgres:%40Mgfj125256@db.kgzwiqxvtjnizcjsclnh.supabase.co:5432/postgres')

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

# Create sync engine for table creation
sync_engine = create_engine(
    DATABASE_URL_SYNC,
    echo=False,
    pool_pre_ping=True
)

# Session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
class Base(DeclarativeBase):
    pass

# Dependency for FastAPI
async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

# Create all tables
def create_tables():
    Base.metadata.create_all(bind=sync_engine)

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
