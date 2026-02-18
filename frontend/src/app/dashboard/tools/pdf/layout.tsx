import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free PDF Tools Online - Merge, Split, Compress, Convert PDFs",
  description:
    "Powerful PDF tools to merge multiple PDFs, split pages, compress file size, and convert PDF to Word. Fast, free, and secure. No signup required.",
  keywords: [
    "PDF merger",
    "merge PDF",
    "split PDF",
    "compress PDF",
    "PDF to Word",
    "PDF converter",
    "free PDF tools",
    "online PDF editor",
    "reduce PDF size",
  ],
  openGraph: {
    title: "Free PDF Tools - Merge, Split, Compress, Convert | Tulz",
    description:
      "Merge, split, compress PDFs and convert to Word. Fast, free, and secure.",
    url: "https://tulz.tools/dashboard/tools/pdf",
  },
};

export default function PDFLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
