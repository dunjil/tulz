import asyncio
import sys

# Load environment using same backend path
sys.path.insert(0, "/home/duna/Desktop/ToolHub/backend")

from app.db.session import async_session_factory
from app.services.user_service import UserService

async def create_admin():
    email = "jsduna@gmail.com"
    password = "Dunjil111@4u"
    
    async with async_session_factory() as session:
        user_service = UserService(session)
        
        # Check if exists
        existing_user = await user_service.get_by_email(email)
        if existing_user:
            print(f"Admin user {email} already exists. Ensuring superuser status and resetting password.")
            existing_user.is_superuser = True
            existing_user.is_verified = True
            await user_service.update_password(existing_user, password)
            await session.commit()
            print("User updated!")
            print(f"Email: {email}")
            print(f"Password: {password}")
            return

        print(f"Creating new admin user: {email}")
        user = await user_service.create(
            email=email,
            full_name="System Admin",
            password=password,
            is_verified=True,
            check_existing=False
        )
        user.is_superuser = True
        await session.commit()
        print("Admin user created successfully!")
        print(f"Email: {email}")
        print(f"Password: {password}")

if __name__ == "__main__":
    asyncio.run(create_admin())
