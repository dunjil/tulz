import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Image Editor Online - Remove Background, Resize, Convert",
  description:
    "Edit images online for free. Remove backgrounds with AI, resize and crop photos, convert between formats (PNG, JPG, WebP). No signup required.",
  keywords: [
    "image editor online",
    "remove background",
    "background remover",
    "resize image",
    "crop image",
    "image converter",
    "PNG to JPG",
    "free image editor",
    "photo editor",
  ],
  openGraph: {
    title: "Free Image Editor - Remove Background, Resize, Convert | Tulz",
    description:
      "Edit images online. Remove backgrounds, resize, crop, and convert formats. Free to use.",
    url: "https://tulz.tools/dashboard/tools/image",
  },
};

export default function ImageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
