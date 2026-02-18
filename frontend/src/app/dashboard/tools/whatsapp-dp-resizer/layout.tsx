import { type Metadata } from "next";
import { getToolConfig } from "@/config/tools";
import { StructuredData } from "@/components/shared/structured-data";

const tool = getToolConfig("whatsapp-dp-resizer");

export const metadata: Metadata = {
  title: tool?.title || "Tulz - Free Online Tools",
  description: tool?.description || "Free online productivity tools.",
  keywords: tool?.keywords || [],
  openGraph: {
    title: tool?.title || "Tulz - Free Online Tools",
    description: tool?.description || "Free online productivity tools.",
    type: "website",
    url: `https://tulz.tools/dashboard/tools/whatsapp-dp-resizer`,
  },
  twitter: {
    title: tool?.title || "Tulz - Free Online Tools",
    description: tool?.description || "Free online productivity tools.",
    card: "summary_large_image",
  },
};

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {tool && <StructuredData tool={tool} />}
      {children}
    </>
  );
}
