import os
import re

tools_dir = "/home/duna/Desktop/ToolHub/frontend/src/app/dashboard/tools/"

# Regex to find the h1 and p block
# We want to match:
# <h1 ...>...</h1>
# <p ...>...</p>
header_pattern = re.compile(
    r'(<h1[^>]*>[\s\S]*?</h1>\s*<p[^>]*>[\s\S]*?</p>)',
    re.MULTILINE
)

import_check = re.compile(r'import { SupportButton } from "@\/components\/shared\/support-button";')
free_badge_check = re.compile(r'import { FreeBadge } from "@\/components\/shared\/free-badge";')

for root, dirs, files in os.walk(tools_dir):
    for file in files:
        if file == "page.tsx":
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Skip if already migrated (contains both FreeBadge and SupportButton in a flex container)
            if '<FreeBadge />' in content and '<SupportButton size="sm" />' in content:
                continue

            # First, add imports
            modified = False
            if 'SupportButton' not in content:
                 # Find last import
                 last_import = re.findall(r'import .* from ["\'].*["\'];\n', content)
                 if last_import:
                     content = content.replace(last_import[-1], last_import[-1] + 'import { SupportButton } from "@/components/shared/support-button";\n')
                     modified = True
            
            if 'FreeBadge' not in content:
                 # Find last import
                 last_import = re.findall(r'import .* from ["\'].*["\'];\n', content)
                 if last_import:
                     content = content.replace(last_import[-1], last_import[-1] + 'import { FreeBadge } from "@/components/shared/free-badge";\n')
                     modified = True

            # Find the header
            match = header_pattern.search(content)
            if match:
                full_header = match.group(1)
                
                # Check if it's already inside a flex container with UsageBadge or something
                # Many tools have:
                # <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                #   <div>
                #     <h1>...</h1>
                #     <p>...</p>
                #   </div>
                #   <UsageBadge />
                # </div>
                
                # If we find UsageBadge nearby, we should insert SupportButton and FreeBadge before it.
                usage_badge_pattern = re.compile(r'<UsageBadge />')
                if usage_badge_pattern.search(content):
                    # Find the div containing the UsageBadge and h1
                    # This is tricky with regex. Let's try to find if they are within 500 chars.
                    usage_match = usage_badge_pattern.search(content)
                    if abs(usage_match.start() - match.start()) < 1000:
                        # Insert before UsageBadge
                        replacement = '<SupportButton size="sm" />\n          <FreeBadge />\n          <UsageBadge />'
                        content = content.replace('<UsageBadge />', replacement)
                        modified = True
                else:
                    # Generic case: wrap h1+p and add components
                    replacement = f'''<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          {full_header}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <SupportButton size="sm" />
          <FreeBadge />
        </div>
      </div>'''
                    content = content.replace(full_header, replacement)
                    modified = True

            if modified:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Standardized: {filepath}")
