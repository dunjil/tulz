"""Text Diff/Compare endpoints.

NOTE: Text Diff is a FREE tool for all users - no usage limits applied.
Usage is tracked for analytics purposes only.
"""

import difflib
import time
from typing import Optional, List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.api.deps import ClientIP, DbSession, OptionalUser, UserAgent
from app.models.history import ToolType
from app.services.usage_service import UsageService

router = APIRouter()


class TextDiffRequest(BaseModel):
    """Request for text comparison."""
    text1: str = Field(..., description="First text to compare")
    text2: str = Field(..., description="Second text to compare")
    context_lines: int = Field(default=3, ge=0, le=10, description="Number of context lines around changes")


class DiffLine(BaseModel):
    """A single line in the diff output."""
    type: str  # 'unchanged', 'added', 'removed', 'info'
    content: str
    line_num_left: Optional[int] = None
    line_num_right: Optional[int] = None


class TextDiffResponse(BaseModel):
    """Response for text comparison."""
    success: bool
    diff_lines: Optional[List[DiffLine]] = None
    unified_diff: Optional[str] = None
    stats: Optional[dict] = None
    error: Optional[str] = None


class TextSimilarityRequest(BaseModel):
    """Request for text similarity check."""
    text1: str = Field(..., description="First text")
    text2: str = Field(..., description="Second text")


class TextSimilarityResponse(BaseModel):
    """Response for text similarity."""
    similarity_ratio: float
    similarity_percent: str
    are_identical: bool


@router.post("/compare", response_model=TextDiffResponse)
async def compare_texts(
    data: TextDiffRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Compare two texts and show differences.

    This endpoint is FREE for all users - usage tracked for analytics only.
    """
    start_time = time.time()
    try:
        lines1 = data.text1.splitlines(keepends=True)
        lines2 = data.text2.splitlines(keepends=True)

        # Generate unified diff
        unified = list(difflib.unified_diff(
            lines1, lines2,
            fromfile='Original',
            tofile='Modified',
            lineterm='',
            n=data.context_lines
        ))
        unified_diff = '\n'.join(unified)

        # Generate detailed diff lines for side-by-side view
        diff_lines = []
        matcher = difflib.SequenceMatcher(None, lines1, lines2)

        left_line_num = 0
        right_line_num = 0

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                for i in range(i1, i2):
                    left_line_num += 1
                    right_line_num += 1
                    diff_lines.append(DiffLine(
                        type='unchanged',
                        content=lines1[i].rstrip('\n\r'),
                        line_num_left=left_line_num,
                        line_num_right=right_line_num,
                    ))
            elif tag == 'delete':
                for i in range(i1, i2):
                    left_line_num += 1
                    diff_lines.append(DiffLine(
                        type='removed',
                        content=lines1[i].rstrip('\n\r'),
                        line_num_left=left_line_num,
                        line_num_right=None,
                    ))
            elif tag == 'insert':
                for j in range(j1, j2):
                    right_line_num += 1
                    diff_lines.append(DiffLine(
                        type='added',
                        content=lines2[j].rstrip('\n\r'),
                        line_num_left=None,
                        line_num_right=right_line_num,
                    ))
            elif tag == 'replace':
                # Show removed lines first, then added
                for i in range(i1, i2):
                    left_line_num += 1
                    diff_lines.append(DiffLine(
                        type='removed',
                        content=lines1[i].rstrip('\n\r'),
                        line_num_left=left_line_num,
                        line_num_right=None,
                    ))
                for j in range(j1, j2):
                    right_line_num += 1
                    diff_lines.append(DiffLine(
                        type='added',
                        content=lines2[j].rstrip('\n\r'),
                        line_num_left=None,
                        line_num_right=right_line_num,
                    ))

        # Calculate statistics
        added_count = sum(1 for line in diff_lines if line.type == 'added')
        removed_count = sum(1 for line in diff_lines if line.type == 'removed')
        unchanged_count = sum(1 for line in diff_lines if line.type == 'unchanged')

        similarity = difflib.SequenceMatcher(None, data.text1, data.text2).ratio()

        result = TextDiffResponse(
            success=True,
            diff_lines=diff_lines,
            unified_diff=unified_diff,
            stats={
                "lines_added": added_count,
                "lines_removed": removed_count,
                "lines_unchanged": unchanged_count,
                "total_lines_left": len(lines1),
                "total_lines_right": len(lines2),
                "similarity_percent": round(similarity * 100, 1),
            }
        )

        # Track usage for analytics
        processing_time = int((time.time() - start_time) * 1000)
        usage_service = UsageService(session)
        await usage_service.record_usage_analytics_only(
            tool=ToolType.DIFF,
            operation="compare",
            user=user,
            ip_address=client_ip,
            user_agent=user_agent,
            input_metadata={
                "text1_length": len(data.text1),
                "text2_length": len(data.text2),
            },
            output_metadata={
                "lines_added": added_count,
                "lines_removed": removed_count,
                "similarity_percent": round(similarity * 100, 1),
            },
            processing_time_ms=processing_time,
        )

        return result
    except Exception as e:
        return TextDiffResponse(
            success=False,
            error=str(e)
        )


@router.post("/similarity", response_model=TextSimilarityResponse)
async def check_similarity(
    data: TextSimilarityRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Check similarity between two texts.

    This endpoint is FREE for all users - usage tracked for analytics only.
    """
    start_time = time.time()
    ratio = difflib.SequenceMatcher(None, data.text1, data.text2).ratio()

    result = TextSimilarityResponse(
        similarity_ratio=round(ratio, 4),
        similarity_percent=f"{round(ratio * 100, 1)}%",
        are_identical=data.text1 == data.text2,
    )

    # Track usage for analytics
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.DIFF,
        operation="similarity",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "text1_length": len(data.text1),
            "text2_length": len(data.text2),
        },
        output_metadata={
            "similarity_percent": round(ratio * 100, 1),
            "are_identical": data.text1 == data.text2,
        },
        processing_time_ms=processing_time,
    )

    return result


@router.post("/word-diff")
async def word_diff(
    data: TextDiffRequest,
    session: DbSession = None,
    user: OptionalUser = None,
    client_ip: ClientIP = None,
    user_agent: UserAgent = None,
):
    """
    Compare texts at word level (more granular than line diff).

    This endpoint is FREE for all users - usage tracked for analytics only.
    """
    start_time = time.time()
    words1 = data.text1.split()
    words2 = data.text2.split()

    matcher = difflib.SequenceMatcher(None, words1, words2)
    diff_result = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            diff_result.append({
                'type': 'unchanged',
                'text': ' '.join(words1[i1:i2])
            })
        elif tag == 'delete':
            diff_result.append({
                'type': 'removed',
                'text': ' '.join(words1[i1:i2])
            })
        elif tag == 'insert':
            diff_result.append({
                'type': 'added',
                'text': ' '.join(words2[j1:j2])
            })
        elif tag == 'replace':
            diff_result.append({
                'type': 'removed',
                'text': ' '.join(words1[i1:i2])
            })
            diff_result.append({
                'type': 'added',
                'text': ' '.join(words2[j1:j2])
            })

    # Track usage for analytics
    processing_time = int((time.time() - start_time) * 1000)
    usage_service = UsageService(session)
    await usage_service.record_usage_analytics_only(
        tool=ToolType.DIFF,
        operation="word_diff",
        user=user,
        ip_address=client_ip,
        user_agent=user_agent,
        input_metadata={
            "text1_length": len(data.text1),
            "text2_length": len(data.text2),
        },
        output_metadata={
            "words_text1": len(words1),
            "words_text2": len(words2),
        },
        processing_time_ms=processing_time,
    )

    return {
        "success": True,
        "word_diff": diff_result,
        "stats": {
            "words_text1": len(words1),
            "words_text2": len(words2),
        }
    }
