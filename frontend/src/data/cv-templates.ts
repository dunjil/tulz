export interface TemplateStyle {
    id: string;
    name: string;
    description: string;
    is_free: boolean;
    css: string;
}

export const CV_TEMPLATES: Record<string, TemplateStyle> = {
    modern: {
        id: "modern",
        name: "Modern",
        description: "Clean, contemporary design with accent colors",
        is_free: true,
        css: `
      .cv-document { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.4; color: #333; font-size: 10pt; padding: 15mm 20mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #2563eb; font-size: 24pt; margin: 0 0 5px 0; font-weight: 700; letter-spacing: -0.5px; }
      .cv-document h2 { color: #1e40af; font-size: 12pt; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin: 18px 0 10px 0; text-transform: uppercase; letter-spacing: 1px; }
      .cv-document h3 { color: #374151; font-size: 11pt; margin: 10px 0 3px 0; font-weight: 600; }
      .cv-document h4 { color: #6b7280; font-size: 10pt; margin: 0; font-weight: 400; font-style: italic; }
      .cv-document p { margin: 4px 0; }
      .cv-document ul { margin: 5px 0; padding-left: 18px; }
      .cv-document li { margin: 2px 0; }
      .cv-document strong { color: #1f2937; }
      .cv-document a { color: #2563eb; text-decoration: none; }
      .cv-document hr { border: none; border-top: 1px solid #e5e7eb; margin: 15px 0; }
      .cv-document code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 9pt; }
    `
    },
    professional: {
        id: "professional",
        name: "Professional",
        description: "Traditional corporate style with serif fonts",
        is_free: true,
        css: `
      .cv-document { font-family: 'Georgia', 'Times New Roman', serif; line-height: 1.5; color: #1a1a1a; font-size: 10.5pt; padding: 20mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #1a1a1a; font-size: 22pt; margin: 0 0 8px 0; font-weight: 400; text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
      .cv-document h2 { color: #1a1a1a; font-size: 11pt; border-bottom: 1px solid #999; padding-bottom: 3px; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 400; }
      .cv-document h3 { color: #333; font-size: 11pt; margin: 12px 0 2px 0; font-weight: 600; }
      .cv-document h4 { color: #666; font-size: 10pt; margin: 0; font-weight: 400; }
      .cv-document p { margin: 5px 0; text-align: justify; }
      .cv-document ul { margin: 5px 0; padding-left: 20px; }
      .cv-document li { margin: 3px 0; }
      .cv-document a { color: #1a1a1a; }
      .cv-document hr { border: none; border-top: 1px solid #ccc; margin: 15px 0; }
    `
    },
    minimal: {
        id: "minimal",
        name: "Minimal",
        description: "Simple and elegant with plenty of whitespace",
        is_free: true,
        css: `
      .cv-document { font-family: 'Helvetica', Arial, sans-serif; line-height: 1.5; color: #444; font-size: 10pt; padding: 20mm 25mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #222; font-size: 20pt; margin: 0 0 5px 0; font-weight: 300; letter-spacing: 2px; }
      .cv-document h2 { color: #222; font-size: 9pt; margin: 25px 0 12px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 400; }
      .cv-document h3 { color: #222; font-size: 10.5pt; margin: 12px 0 2px 0; font-weight: 500; }
      .cv-document h4 { color: #888; font-size: 9pt; margin: 0; font-weight: 300; }
      .cv-document p { margin: 4px 0; }
      .cv-document ul { margin: 5px 0; padding-left: 15px; list-style-type: none; }
      .cv-document ul li:before { content: "—"; margin-right: 8px; color: #999; }
      .cv-document li { margin: 3px 0; }
      .cv-document a { color: #444; text-decoration: none; border-bottom: 1px solid #ddd; }
      .cv-document hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
    `
    },
    creative: {
        id: "creative",
        name: "Creative",
        description: "Bold design for creative professionals",
        is_free: true,
        css: `
      .cv-document { font-family: 'Segoe UI', 'Roboto', sans-serif; line-height: 1.4; color: #2d3748; font-size: 10pt; padding: 15mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #5b21b6; font-size: 28pt; margin: 0 0 5px 0; font-weight: 800; }
      .cv-document h2 { color: #7c3aed; font-size: 11pt; margin: 20px 0 10px 0; font-weight: 700; padding: 5px 10px; background: linear-gradient(90deg, #f5f3ff, transparent); border-left: 3px solid #7c3aed; }
      .cv-document h3 { color: #4c1d95; font-size: 11pt; margin: 12px 0 3px 0; font-weight: 600; }
      .cv-document h4 { color: #6b7280; font-size: 9.5pt; margin: 0; font-weight: 400; }
      .cv-document p { margin: 4px 0; }
      .cv-document ul { margin: 5px 0; padding-left: 18px; }
      .cv-document li { margin: 3px 0; }
      .cv-document strong { color: #5b21b6; }
      .cv-document a { color: #7c3aed; text-decoration: none; }
      .cv-document hr { border: none; height: 2px; background: linear-gradient(90deg, #7c3aed, #a78bfa, transparent); margin: 15px 0; }
      .cv-document code { background: #f5f3ff; color: #5b21b6; padding: 2px 6px; border-radius: 4px; }
    `
    },
    executive: {
        id: "executive",
        name: "Executive",
        description: "Sophisticated design for senior positions",
        is_free: true,
        css: `
      .cv-document { font-family: 'Cambria', Georgia, serif; line-height: 1.5; color: #1f2937; font-size: 10.5pt; padding: 18mm 22mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #0f172a; font-size: 22pt; margin: 0 0 3px 0; font-weight: 400; letter-spacing: 1px; }
      .cv-document h2 { color: #0f172a; font-size: 10pt; margin: 22px 0 10px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; border-bottom: 1px solid #334155; padding-bottom: 5px; }
      .cv-document h3 { color: #1e293b; font-size: 11pt; margin: 12px 0 2px 0; font-weight: 600; }
      .cv-document h4 { color: #64748b; font-size: 9.5pt; margin: 0 0 3px 0; font-weight: 400; }
      .cv-document p { margin: 5px 0; }
      .cv-document ul { margin: 6px 0; padding-left: 18px; }
      .cv-document li { margin: 4px 0; }
      .cv-document a { color: #334155; text-decoration: none; }
      .cv-document hr { border: none; border-top: 2px solid #0f172a; margin: 12px 0; }
    `
    },
    tech: {
        id: "tech",
        name: "Tech",
        description: "Modern design for tech professionals",
        is_free: true,
        css: `
      .cv-document { font-family: 'SF Pro Display', -apple-system, 'Segoe UI', sans-serif; line-height: 1.4; color: #1e293b; font-size: 10pt; padding: 15mm 18mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #0ea5e9; font-size: 24pt; margin: 0 0 5px 0; font-weight: 700; }
      .cv-document h2 { color: #0284c7; font-size: 11pt; margin: 18px 0 10px 0; font-weight: 600; padding-bottom: 5px; border-bottom: 2px solid #0ea5e9; }
      .cv-document h3 { color: #0f172a; font-size: 11pt; margin: 10px 0 2px 0; font-weight: 600; }
      .cv-document h4 { color: #64748b; font-size: 9.5pt; margin: 0; font-weight: 400; }
      .cv-document p { margin: 4px 0; }
      .cv-document ul { margin: 5px 0; padding-left: 18px; }
      .cv-document li { margin: 2px 0; }
      .cv-document code { background: #f0f9ff; color: #0369a1; padding: 1px 5px; border-radius: 3px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 9pt; }
      .cv-document a { color: #0284c7; text-decoration: none; }
      .cv-document hr { border: none; border-top: 1px solid #e2e8f0; margin: 15px 0; }
      .cv-document strong { color: #0369a1; }
    `
    },
    academic: {
        id: "academic",
        name: "Academic",
        description: "Formal style for academic and research positions",
        is_free: true,
        css: `
      .cv-document { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; font-size: 11pt; padding: 20mm 25mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #000; font-size: 16pt; margin: 0 0 5px 0; font-weight: 700; text-align: center; }
      .cv-document h2 { color: #000; font-size: 12pt; margin: 18px 0 8px 0; font-weight: 700; text-transform: uppercase; }
      .cv-document h3 { color: #000; font-size: 11pt; margin: 10px 0 2px 0; font-weight: 700; }
      .cv-document h4 { color: #333; font-size: 10pt; margin: 0; font-weight: 400; font-style: italic; }
      .cv-document p { margin: 5px 0; text-align: justify; }
      .cv-document ul { margin: 5px 0; padding-left: 25px; }
      .cv-document li { margin: 3px 0; }
      .cv-document a { color: #000; }
      .cv-document hr { border: none; border-top: 1px solid #000; margin: 12px 0; }
    `
    },
    elegant: {
        id: "elegant",
        name: "Elegant",
        description: "Refined and sophisticated design",
        is_free: true,
        css: `
      .cv-document { font-family: 'Garamond', 'Palatino', serif; line-height: 1.5; color: #2c2c2c; font-size: 10.5pt; padding: 18mm 22mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #8b5cf6; font-size: 26pt; margin: 0 0 8px 0; font-weight: 400; letter-spacing: 2px; border-bottom: 1px solid #c4b5fd; padding-bottom: 8px; }
      .cv-document h2 { color: #6d28d9; font-size: 10pt; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 3px; font-weight: 400; }
      .cv-document h3 { color: #4c1d95; font-size: 11pt; margin: 12px 0 3px 0; font-weight: 600; }
      .cv-document h4 { color: #7c7c7c; font-size: 9.5pt; margin: 0; font-weight: 400; font-style: italic; }
      .cv-document p { margin: 5px 0; }
      .cv-document ul { margin: 5px 0; padding-left: 20px; }
      .cv-document li { margin: 3px 0; }
      .cv-document a { color: #6d28d9; text-decoration: none; }
      .cv-document hr { border: none; border-top: 1px solid #e9d5ff; margin: 15px 0; }
    `
    },
    compact: {
        id: "compact",
        name: "Compact",
        description: "Space-efficient layout for detailed CVs",
        is_free: true,
        css: `
      .cv-document { font-family: 'Arial Narrow', Arial, sans-serif; line-height: 1.3; color: #333; font-size: 9pt; padding: 12mm 15mm; background: white; min-height: 297mm; }
      .cv-document h1 { color: #dc2626; font-size: 18pt; margin: 0 0 3px 0; font-weight: 700; }
      .cv-document h2 { color: #b91c1c; font-size: 9pt; margin: 12px 0 6px 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; background: #fef2f2; padding: 4px 8px; }
      .cv-document h3 { color: #1f2937; font-size: 9.5pt; margin: 8px 0 1px 0; font-weight: 600; }
      .cv-document h4 { color: #6b7280; font-size: 8.5pt; margin: 0; font-weight: 400; }
      .cv-document p { margin: 2px 0; }
      .cv-document ul { margin: 3px 0; padding-left: 15px; }
      .cv-document li { margin: 1px 0; }
      .cv-document a { color: #dc2626; text-decoration: none; }
      .cv-document hr { border: none; border-top: 1px solid #fecaca; margin: 10px 0; }
    `
    },
    dark: {
        id: "dark",
        name: "Dark Mode",
        description: "Modern dark theme for digital-first CVs",
        is_free: true,
        css: `
      .cv-document { font-family: 'Inter', 'Segoe UI', sans-serif; line-height: 1.4; color: #e2e8f0; font-size: 10pt; padding: 15mm 20mm; background: #0f172a; min-height: 297mm; }
      .cv-document h1 { color: #38bdf8; font-size: 24pt; margin: 0 0 5px 0; font-weight: 700; }
      .cv-document h2 { color: #7dd3fc; font-size: 11pt; margin: 18px 0 10px 0; font-weight: 600; border-bottom: 2px solid #0ea5e9; padding-bottom: 5px; }
      .cv-document h3 { color: #f1f5f9; font-size: 11pt; margin: 10px 0 2px 0; font-weight: 600; }
      .cv-document h4 { color: #94a3b8; font-size: 9.5pt; margin: 0; font-weight: 400; }
      .cv-document p { margin: 4px 0; }
      .cv-document ul { margin: 5px 0; padding-left: 18px; }
      .cv-document li { margin: 2px 0; color: #cbd5e1; }
      .cv-document code { background: #1e293b; color: #38bdf8; padding: 1px 5px; border-radius: 3px; font-size: 9pt; }
      .cv-document a { color: #38bdf8; text-decoration: none; }
      .cv-document hr { border: none; border-top: 1px solid #334155; margin: 15px 0; }
      .cv-document strong { color: #7dd3fc; }
    `
    }
};
