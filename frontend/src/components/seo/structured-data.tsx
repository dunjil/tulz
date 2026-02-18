export function WebsiteStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tulz",
    alternateName: "Tulz Tools",
    url: "https://tulz.tools",
    description:
      "Free online productivity tools including QR code generator, image editor, PDF tools, PDF filler, JSON formatter, text diff, Markdown to PDF, invoice generator, CV builder, calculator, Excel to CSV converter, website to PDF, favicon generator, and credit card generator for testing.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://tulz.tools/dashboard?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function OrganizationStructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tulz",
    url: "https://tulz.tools",
    logo: "https://tulz.tools/logo.png",
    sameAs: [
      "https://twitter.com/tulztools",
      "https://github.com/tulztools",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: "https://tulz.tools/about",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function SoftwareApplicationStructuredData({
  name,
  description,
  applicationCategory,
  url,
}: {
  name: string;
  description: string;
  applicationCategory: string;
  url: string;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    description,
    applicationCategory,
    operatingSystem: "Web Browser",
    url,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "1250",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function BreadcrumbStructuredData({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function FAQStructuredData({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export function ToolsCollectionStructuredData() {
  const tools = [
    {
      name: "QR Code Generator",
      description: "Create customizable QR codes for URLs, WiFi, contacts, and more",
      url: "https://tulz.tools/dashboard/tools/qrcode",
    },
    {
      name: "Calculator",
      description: "Scientific, financial, and unit conversion calculations",
      url: "https://tulz.tools/dashboard/tools/calculator",
    },
    {
      name: "Image Editor",
      description: "Remove backgrounds, resize, crop, and convert image formats",
      url: "https://tulz.tools/dashboard/tools/image",
    },
    {
      name: "PDF Tools",
      description: "Merge, split, compress PDFs and convert to Word",
      url: "https://tulz.tools/dashboard/tools/pdf",
    },
    {
      name: "PDF Filler",
      description: "Fill, sign, and annotate PDFs online with text, signatures, stamps, and watermarks",
      url: "https://tulz.tools/dashboard/tools/pdf-filler",
    },
    {
      name: "Website to PDF",
      description: "Convert any website URL to a high-quality PDF document",
      url: "https://tulz.tools/dashboard/tools/webpdf",
    },
    {
      name: "Excel to CSV",
      description: "Convert Excel files to CSV with multi-sheet support",
      url: "https://tulz.tools/dashboard/tools/excel",
    },
    {
      name: "Favicon Generator",
      description: "Create all favicon sizes from a single image",
      url: "https://tulz.tools/dashboard/tools/favicon",
    },
    {
      name: "JSON Formatter",
      description: "Format, validate, minify, and convert JSON to YAML",
      url: "https://tulz.tools/dashboard/tools/json",
    },
    {
      name: "Markdown to PDF",
      description: "Convert Markdown documents to beautifully styled PDFs",
      url: "https://tulz.tools/dashboard/tools/markdown",
    },
    {
      name: "Text Diff",
      description: "Compare two texts and visualize the differences",
      url: "https://tulz.tools/dashboard/tools/diff",
    },
    {
      name: "Invoice Generator",
      description: "Create professional PDF invoices for your business",
      url: "https://tulz.tools/dashboard/tools/invoice",
    },
    {
      name: "Credit Card Generator",
      description: "Generate valid test credit card numbers for development and testing",
      url: "https://tulz.tools/dashboard/tools/credit-card",
    },
    {
      name: "CV Builder",
      description: "Create professional resumes and CVs from Markdown with multiple templates",
      url: "https://tulz.tools/dashboard/tools/cv",
    },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Tulz Online Tools",
    description: "Free online productivity tools collection",
    numberOfItems: tools.length,
    itemListElement: tools.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareApplication",
        name: tool.name,
        description: tool.description,
        url: tool.url,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Web Browser",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
