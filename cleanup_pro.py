import os
import re

tools_dir = "/home/duna/Desktop/ToolHub/frontend/src/app/dashboard/tools/"

patterns_to_remove = [
    r'import { UsageBadge } from "@\/components\/shared\/usage-badge";?\n*',
    r'import { UsageBadge } from "@/components/shared/usage-badge";?\n*',
    r'<UsageBadge \/>\n*',
    r'const { showUpgradeModal } = useUpgradeModal\(\);?\n*',
    r'const isPro = .*?;?\n*',
    r'const isPro = .*?\n',
    r'isPro \? \(.*?\) : \(.*?\)',  # This might be risky, but used in badges
    r'const hasRemainingUses = .*?;?\n*',
    r'import { useUpgradeModal } from "@\/components\/shared\/upgrade-modal";?\n*',
    r'import { useUpgradeModal } from "@/components/shared/upgrade-modal";?\n*',
]

for root, dirs, files in os.walk(tools_dir):
    for file in files:
        if file == "page.tsx":
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            
            # Remove specific lines
            new_content = new_content.replace('<UsageBadge />', '')
            
            # Simple line-by-line removal for common Pro logic
            lines = new_content.splitlines()
            new_lines = []
            for line in lines:
                if 'UsageBadge' in line and 'import' in line: continue
                if 'useUpgradeModal' in line and 'import' in line: continue
                if 'const { showUpgradeModal }' in line: continue
                if 'const isPro =' in line: continue
                if 'const hasRemainingUses =' in line: continue
                if 'showUpgradeModal()' in line: continue
                new_lines.append(line)
            
            new_content = "\n".join(new_lines)

            # Cleanup headers that might have multiple components and now look like:
            # <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            #   <SupportButton size="sm" />
            #   <FreeBadge />
            #   
            # </div>
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Cleaned: {filepath}")
