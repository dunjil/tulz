import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fair Use Policy | Tulz",
  description: "Learn about our fair use policy for unlimited Pro plan usage. Understand limits, allowed uses, and how we ensure service quality for all users.",
  openGraph: {
    title: "Fair Use Policy | Tulz",
    description: "Learn about our fair use policy for unlimited Pro plan usage.",
    type: "website",
  },
};

export default function FairUsePolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
