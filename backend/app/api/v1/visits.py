"""Page visit tracking endpoints."""

from fastapi import APIRouter, Request

from app.api.deps import DbSession
from app.models.page_visit import PageVisit, PageVisitCreate

router = APIRouter()


@router.post("/track", status_code=204)
async def track_page_visit(
    data: PageVisitCreate,
    request: Request,
    session: DbSession,
):
    """Track a page visit. Public endpoint — no auth required."""
    # Get IP from forwarded header (behind proxy) or direct connection
    forwarded_for = request.headers.get("x-forwarded-for")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else (
        request.client.host if request.client else None
    )
    user_agent = request.headers.get("user-agent")

    visit = PageVisit(
        path=data.path,
        referrer=data.referrer,
        ip_address=ip,
        user_agent=user_agent,
    )

    session.add(visit)
    await session.commit()
    return None
