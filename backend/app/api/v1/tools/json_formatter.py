"""JSON Formatter endpoints.

NOTE: JSON Formatter is a FREE tool for all users - no usage limits applied.
Usage is tracked for analytics purposes only.
"""

import json
import time
from typing import Optional

import yaml
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.models.history import ToolType
from app.services.usage_service import UsageService

router = APIRouter()


class JsonFormatRequest(BaseModel):
    """Request for JSON formatting."""
    content: str = Field(..., description="JSON string to format")
    indent: int = Field(default=2, ge=0, le=8, description="Indentation spaces")
    sort_keys: bool = Field(default=False, description="Sort object keys alphabetically")


class JsonMinifyRequest(BaseModel):
    """Request for JSON minification."""
    content: str = Field(..., description="JSON string to minify")


class JsonValidateRequest(BaseModel):
    """Request for JSON validation."""
    content: str = Field(..., description="JSON string to validate")


class JsonConvertRequest(BaseModel):
    """Request for JSON conversion."""
    content: str = Field(..., description="Content to convert")
    from_format: str = Field(..., description="Source format: json, yaml")
    to_format: str = Field(..., description="Target format: json, yaml")
    indent: int = Field(default=2, ge=0, le=8, description="Indentation spaces")


class JsonFormatResponse(BaseModel):
    """Response for JSON formatting."""
    success: bool
    result: Optional[str] = None
    error: Optional[str] = None
    stats: Optional[dict] = None


class JsonValidateResponse(BaseModel):
    """Response for JSON validation."""
    valid: bool
    error: Optional[str] = None
    error_line: Optional[int] = None
    error_column: Optional[int] = None


@router.post("/format", response_model=JsonFormatResponse)
async def format_json(
    data: JsonFormatRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Format/prettify JSON with custom indentation.

    This endpoint is FREE for all users - usage tracked for analytics only.
    """
    start_time = time.time()
    success = False
    error_msg = None

    try:
        # Parse and re-format
        parsed = json.loads(data.content)
        formatted = json.dumps(parsed, indent=data.indent, sort_keys=data.sort_keys, ensure_ascii=False)
        success = True

        result = JsonFormatResponse(
            success=True,
            result=formatted,
            stats={
                "original_length": len(data.content),
                "formatted_length": len(formatted),
                "keys_count": _count_keys(parsed),
                "depth": _get_depth(parsed),
            }
        )
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON: {e.msg} at line {e.lineno}, column {e.colno}"
        result = JsonFormatResponse(success=False, error=error_msg)

    # Track usage for analytics
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.JSON,
        operation="format",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"content_length": len(data.content)},
        processing_time_ms=processing_time,
        success=success,
        error_message=error_msg,
    )

    return result


@router.post("/minify", response_model=JsonFormatResponse)
async def minify_json(
    data: JsonMinifyRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Minify JSON by removing all whitespace.

    This endpoint is FREE for all users - usage tracked for analytics only.
    """
    start_time = time.time()
    success = False
    error_msg = None

    try:
        parsed = json.loads(data.content)
        minified = json.dumps(parsed, separators=(',', ':'), ensure_ascii=False)
        success = True

        result = JsonFormatResponse(
            success=True,
            result=minified,
            stats={
                "original_length": len(data.content),
                "minified_length": len(minified),
                "saved_bytes": len(data.content) - len(minified),
                "compression_ratio": round((1 - len(minified) / len(data.content)) * 100, 1) if len(data.content) > 0 else 0,
            }
        )
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON: {e.msg} at line {e.lineno}, column {e.colno}"
        result = JsonFormatResponse(success=False, error=error_msg)

    # Track usage for analytics
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.JSON,
        operation="minify",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"content_length": len(data.content)},
        processing_time_ms=processing_time,
        success=success,
        error_message=error_msg,
    )

    return result


@router.post("/validate", response_model=JsonValidateResponse)
async def validate_json(
    data: JsonValidateRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Validate JSON syntax.

    This endpoint is FREE for all users - usage tracked for analytics only.
    """
    start_time = time.time()

    try:
        json.loads(data.content)
        result = JsonValidateResponse(valid=True)
        is_valid = True
    except json.JSONDecodeError as e:
        result = JsonValidateResponse(
            valid=False,
            error=e.msg,
            error_line=e.lineno,
            error_column=e.colno,
        )
        is_valid = False

    # Track usage for analytics
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.JSON,
        operation="validate",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={"content_length": len(data.content)},
        output_metadata={"is_valid": is_valid},
        processing_time_ms=processing_time,
    )

    return result


@router.post("/convert", response_model=JsonFormatResponse)
async def convert_format(
    data: JsonConvertRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Convert between JSON and YAML formats.

    This endpoint is FREE for all users - usage tracked for analytics only.
    """
    start_time = time.time()
    success = False
    error_msg = None

    try:
        # Parse source format
        if data.from_format == "json":
            parsed = json.loads(data.content)
        elif data.from_format == "yaml":
            parsed = yaml.safe_load(data.content)
        else:
            error_msg = f"Unsupported source format: {data.from_format}"
            response = JsonFormatResponse(success=False, error=error_msg)

            # Track usage
            processing_time = int((time.time() - start_time) * 1000)
            usage_service = UsageService(session)
            await usage_service.record_usage_analytics_only(
                tool=ToolType.JSON,
                operation="convert",
                user=user,
                ip_address=client_ip,
                user_agent=user_agent,
                input_metadata={"from_format": data.from_format, "to_format": data.to_format},
                processing_time_ms=processing_time,
                success=False,
                error_message=error_msg,
            )
            return response

        # Convert to target format
        if data.to_format == "json":
            converted = json.dumps(parsed, indent=data.indent, ensure_ascii=False)
        elif data.to_format == "yaml":
            converted = yaml.dump(parsed, default_flow_style=False, allow_unicode=True, indent=data.indent)
        else:
            error_msg = f"Unsupported target format: {data.to_format}"
            response = JsonFormatResponse(success=False, error=error_msg)

            # Track usage
            processing_time = int((time.time() - start_time) * 1000)
            usage_service = UsageService(session)
            await usage_service.record_usage_analytics_only(
                tool=ToolType.JSON,
                operation="convert",
                user=user,
                ip_address=client_ip,
                user_agent=user_agent,
                input_metadata={"from_format": data.from_format, "to_format": data.to_format},
                processing_time_ms=processing_time,
                success=False,
                error_message=error_msg,
            )
            return response

        success = True
        response = JsonFormatResponse(
            success=True,
            result=converted,
            stats={
                "from_format": data.from_format,
                "to_format": data.to_format,
                "original_length": len(data.content),
                "result_length": len(converted),
            }
        )
    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON: {e.msg} at line {e.lineno}, column {e.colno}"
        response = JsonFormatResponse(success=False, error=error_msg)
    except yaml.YAMLError as e:
        error_msg = f"Invalid YAML: {str(e)}"
        response = JsonFormatResponse(success=False, error=error_msg)

    # Track usage for analytics
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.JSON,
        operation="convert",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "from_format": data.from_format,
            "to_format": data.to_format,
            "content_length": len(data.content),
        },
        processing_time_ms=processing_time,
        success=success,
        error_message=error_msg,
    )

    return response


def _count_keys(obj, count=0) -> int:
    """Count total keys in a JSON object recursively."""
    if isinstance(obj, dict):
        count += len(obj)
        for value in obj.values():
            count = _count_keys(value, count)
    elif isinstance(obj, list):
        for item in obj:
            count = _count_keys(item, count)
    return count


def _get_depth(obj, current_depth=0) -> int:
    """Get maximum depth of a JSON structure."""
    if isinstance(obj, dict):
        if not obj:
            return current_depth + 1
        return max(_get_depth(v, current_depth + 1) for v in obj.values())
    elif isinstance(obj, list):
        if not obj:
            return current_depth + 1
        return max(_get_depth(item, current_depth + 1) for item in obj)
    return current_depth + 1
