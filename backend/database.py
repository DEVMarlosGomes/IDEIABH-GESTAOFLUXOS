from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData, text
from fastapi import HTTPException
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

DB_NOT_READY_MESSAGE = "Banco de dados em inicializacao. Tente novamente em alguns segundos."
DATABASE_READY = False
DATABASE_INIT_ERROR = "Database initialization pending"

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL não definido no backend/.env")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={
        # Supabase/Pooler precisa de SSL
        "ssl": "require",
        # pgBouncer compatibility
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        # Give Supabase enough time to wake up before requests fail.
        "timeout": int(os.getenv("DATABASE_CONNECT_TIMEOUT", "45")),
        "command_timeout": int(os.getenv("DATABASE_COMMAND_TIMEOUT", "60")),
    },
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=convention)

class Base(DeclarativeBase):
    metadata = metadata


async def get_db():
    if not DATABASE_READY:
        raise HTTPException(status_code=503, detail=DB_NOT_READY_MESSAGE)
    async with async_session() as session:
        yield session


def set_database_state(ready: bool, error: str | None = None):
    global DATABASE_READY, DATABASE_INIT_ERROR
    DATABASE_READY = ready
    DATABASE_INIT_ERROR = error


def get_database_state():
    return {
        "ready": DATABASE_READY,
        "error": DATABASE_INIT_ERROR,
    }


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight schema updates for environments without migrations.
        await conn.execute(text("ALTER TABLE contratos ADD COLUMN IF NOT EXISTS data_aditivo VARCHAR(50)"))
        await conn.execute(text("ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS anexos JSON"))


async def close_db():
    await engine.dispose()
