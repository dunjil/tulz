const fs = require('fs');
const path = require('path');

const toolsDir = path.join(__dirname, '..', 'src', 'app', 'dashboard', 'tools');

function findPageFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findPageFiles(filePath, fileList);
        } else if (file === 'page.tsx') {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const pageFiles = findPageFiles(toolsDir);

let modifiedCount = 0;

for (const filePath of pageFiles) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if it doesn't have an h1
    if (!content.includes('<h1')) {
        continue;
    }

    // Check if it already has SupportButton imported
    if (!content.includes('SupportButton')) {
        // Find the last import statement and add SupportButton right after it
        const importMatch = content.match(/import .* from ['"].*['"];\n/g);
        if (importMatch && importMatch.length > 0) {
            const lastImportIndex = content.lastIndexOf(importMatch[importMatch.length - 1]) + importMatch[importMatch.length - 1].length;
            content = content.slice(0, lastImportIndex) + `import { SupportButton } from "@/components/shared/support-button";\n` + content.slice(lastImportIndex);
        }
    }

    // The target header structure looks broadly like this (though some have icons inside h1):
    // <div className="mb-X">
    //   <h1 ...>Title</h1>
    //   <p ...>Subtitle</p>
    // </div>
    //
    // We want to transform it into:
    // <div className="mb-X">
    //   <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    //     <div>
    //       <h1 ...>Title</h1>
    //       <p ...>Subtitle</p>
    //     </div>
    //     <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
    //       <SupportButton size="sm" />
    //       {isPro ? ( ... pro badge ...) : ( ... free badge ...)}
    //     </div>
    //   </div>
    // </div>

    // Since tool pages varied a lot, it is safer to regex match the `<h1>...</h1><p>...</p>`
    // and wrap it if it's not already wrapped in the flex container

    // We look for a standalone h1 and p block that is NOT already inside the flex container
    if (content.includes('sm:justify-between gap-4') && content.includes('<SupportButton size="sm" />')) {
        // Already migrated
        continue;
    }

    // Try to find the h1 followed by p
    const titleRegex = /<h1[^>]*>([\s\S]*?)<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/;
    const match = content.match(titleRegex);

    if (match) {
        const fullMatch = match[0];
        const h1Content = match[1];
        const pContent = match[2];

        // Is it inside a div that we should just replace?
        // Let's just wrap the matched h1 and p
        const replacement = `<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            ${fullMatch}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <SupportButton size="sm" />
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center">✨</span>
              <span>Free Tool</span>
            </div>
          </div>
        </div>`;

        content = content.replace(fullMatch, replacement);

        fs.writeFileSync(filePath, content, 'utf8');
        modifiedCount++;
        console.log(`Updated header layout in ${path.relative(toolsDir, filePath)}`);
    } else {
        console.log(`Could not find standard h1+p header in ${path.relative(toolsDir, filePath)}`);
    }
}

console.log(`\nFinished. Modified ${modifiedCount} files.`);
