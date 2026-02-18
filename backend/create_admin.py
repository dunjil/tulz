"""Script to create an admin user."""

import asyncio
import sys

from sqlalchemy import select
from passlib.context import CryptContext

from app.db.session import async_engine, AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash


async def create_admin(email: str, password: str, name: str = "Admin"):
    """Create an admin user."""
    async with AsyncSessionLocal() as session:
        # Check if user exists
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()

        if existing:
            print(f"User {email} already exists.")
            # Update to admin if not already
            if not existing.is_superuser:
                existing.is_superuser = True
                await session.commit()
                print(f"Updated {email} to admin.")
            return

        # Create user
        user = User(
            email=email,
            full_name=name,
            hashed_password=get_password_hash(password),
            is_active=True,
            is_verified=True,
            is_superuser=True,
        )
        session.add(user)

        await session.commit()
        print(f"Created admin user: {email}")
        print(f"Password: {password}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_admin.py <email> <password> [name]")
        print("Example: python create_admin.py admin@tulz.tools mypassword123 'Admin User'")
        sys.exit(1)

    email = sys.argv[1]
    password = sys.argv[2]
    name = sys.argv[3] if len(sys.argv) > 3 else "Admin"

    asyncio.run(create_admin(email, password, name))
