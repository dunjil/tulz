"""Database initialization utility."""

import asyncio
import logging
import sys
import os

# Add background to path to allow absolute imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.db.session import init_db
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def setup():
    """Build the database schema."""
    logger.info(f"Initializing database for {settings.app_name} in {settings.environment} mode...")
    try:
        await init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(setup())
