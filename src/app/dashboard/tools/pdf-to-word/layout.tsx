import { type Metadata } from "next";
import { getToolConfig } from "@/config/tools";
import { StructuredData } from "@/components/shared/structured-data";
import { GoogleAdBanner } from "@/components/shared/google-ad";
import { ShareButtons } from "@/components/shared/share-buttons";

const tool = getToolConfig("pdf-to-word");

export const metadata: Metadata = {
  title: tool?.title || "Tulz - Free Online Tools",
  description: tool?.description || "Free online productivity tools.",
  keywords: tool?.keywords || [],
  openGraph: {
    title: tool?.title || "Tulz - Free Online Tools",
    description: tool?.description || "Free online productivity tools.",
    type: "website",
    url: `https://tulz.tools/dashboard/tools/pdf-to-word`,
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
      <div className="mb-8">
        <GoogleAdBanner />
      </div>
      {children}
      <div className="mt-12">
        <ShareButtons title={tool?.title} description={tool?.description} />
      </div>
    </>
  );
}
