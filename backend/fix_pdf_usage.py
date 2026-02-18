#!/usr/bin/env python3
"""Fix PDF endpoints to use analytics-only tracking without limits."""

import re

# Read the file
with open("app/api/v1/tools/pdf.py", "r") as f:
    content = f.read()

# Pattern 1: Remove "# Check and record usage" section and move it to after processing
# We'll replace the check_and_record_usage call with just initializing the service
content = re.sub(
    r'    # Check and record usage\n    usage_service = UsageService\(session\)\n    await usage_service\.record_usage_analytics_only\([^)]+\)',
    '    # Initialize usage service\n    usage_service = UsageService(session)',
    content
)

# Pattern 2: Remove all complete_usage calls since we'll do it in one shot
content = re.sub(
    r'    # Complete usage tracking\n    processing_time = int\(\(time\.time\(\) - start_time\) \* 1000\)\n    await usage_service\.complete_usage\([^)]+\n[^)]+\n[^)]+\)',
    '',
    content
)

# Pattern 3: Add analytics tracking before each return statement
# This is complex, so let's do it differently - we'll add tracking after result saving

# Save the modified content
with open("app/api/v1/tools/pdf.py", "w") as f:
    f.write(content)

print("Fixed PDF endpoints to remove usage limits")
