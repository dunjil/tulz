"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Mail,
  Building2,
  Users,
  Clock,
  FileText,
  HardDrive
} from "lucide-react";

export default function FairUsePolicyPage() {
  const allowedUses = [
    "Personal productivity tasks",
    "Business document processing",
    "Occasional batch processing",
    "Regular daily usage for work",
    "Creating content for your own projects",
    "Processing files for your team (within limits)",
  ];

  const prohibitedUses = [
    "Automated scripts or bots",
    "Bulk processing via API without permission",
    "Reselling or redistributing the service",
    "Creating competing services using our tools",
    "Circumventing usage limits",
    "Sharing accounts across organizations",
  ];

  const limits = [
    {
      icon: Clock,
      title: "Daily Operations",
      limit: "500 operations/day",
      description: "Total tool operations per 24-hour period",
    },
    {
      icon: FileText,
      title: "File Size",
      limit: "50 MB per file",
      description: "Maximum size for individual uploads",
    },
    {
      icon: HardDrive,
      title: "Daily Data",
      limit: "500 MB total/day",
      description: "Combined upload volume per day",
    },
    {
      icon: Zap,
      title: "Rate Limit",
      limit: "30 requests/minute",
      description: "API requests per minute per user",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto text-center max-w-3xl">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Fair Use Policy
            </h1>
            <p className="text-xl text-muted-foreground">
              Tulz is 100% free for everyone. Our fair use guidelines ensure
              a great experience for all users.
            </p>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* Introduction */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-xl">What is Fair Use?</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  Tulz is designed to be a free resource for personal and professional productivity.
                  Our fair use policy ensures that the service remains fast, reliable, and available for everyone by preventing automated abuse.
                </p>
                <p className="text-muted-foreground">
                  <strong>99.9% of users never encounter any restrictions.</strong> These
                  guidelines exist to maintain service quality for humans, not to restrict legitimate use.
                </p>
              </CardContent>
            </Card>

            {/* Usage Limits */}
            <h2 className="text-2xl font-bold mb-6">Service Guidelines</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              {limits.map((item, i) => (
                <Card key={i} className="border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-2xl font-bold text-primary mt-1">
                          {item.limit}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Allowed vs Prohibited */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    Allowed Uses
                  </CardTitle>
                  <CardDescription>
                    Examples of acceptable usage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {allowedUses.map((use, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{use}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-500/30 bg-red-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <XCircle className="h-5 w-5" />
                    Prohibited Uses
                  </CardTitle>
                  <CardDescription>
                    Activities that violate service integrity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {prohibitedUses.map((use, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{use}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* What Happens if You Exceed */}
            <Card className="mb-12 border-yellow-500/30 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  What Happens if You Exceed Guidelines?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Our system monitors for abnormal patterns (automated scripts). If triggered:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span className="text-sm">
                      <strong>Rate limiting:</strong> Your requests may be temporarily delayed to prevent server overload.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span className="text-sm">
                      <strong>CAPTCHA:</strong> You may be asked to complete a challenge to prove you are human.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* FAQ */}
            <h2 className="text-2xl font-bold mb-6">Common Questions</h2>
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Is Tulz really 100% free?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Yes. We don't charge for tools. We maintain the service through donations and sponsorships.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    What counts as an &quot;operation&quot;?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Each successful tool use (e.g., one PDF merge, one image resize) counts as one operation.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Can I use Tulz for my business?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Absolutely! Tulz is free for personal, educational, and commercial use.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Last Updated */}
            <p className="text-sm text-muted-foreground text-center mt-12">
              Last updated: February 2026
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
