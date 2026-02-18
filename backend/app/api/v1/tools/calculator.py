"""Calculator endpoints.

NOTE: Calculator is a FREE tool for all users - no usage limits applied.
It doesn't produce downloadable outputs and has minimal server cost.
Usage is tracked for analytics purposes only.
"""

import time

from fastapi import APIRouter

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.models.history import ToolType
from app.schemas.tools import CalculatorRequest, CalculatorResponse
from app.services.tools.calculator_service import CalculatorService
from app.services.usage_service import UsageService

router = APIRouter()


@router.post("/calculate", response_model=CalculatorResponse)
async def calculate(
    data: CalculatorRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Perform calculation.

    This endpoint is FREE for all users (no authentication required,
    no usage limits). Calculator is a utility tool that doesn't consume
    significant resources or produce watermarkable outputs.
    """
    start_time = time.time()

    # Perform calculation
    calc_service = CalculatorService()
    result = calc_service.calculate(data)

    # Record usage for analytics (no limits enforced)
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.CALCULATOR,
        operation=data.operation,
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"expression": data.expression[:100] if data.expression else None},
        processing_time_ms=processing_time,
    )

    return result


@router.get("/units")
async def get_unit_categories():
    """Get available unit conversion categories and units."""
    calc_service = CalculatorService()
    return calc_service.get_unit_categories()
