import { guides } from "@/data/guides";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft,
    Calendar,
    Clock,
    ChevronRight,
    Lightbulb,
    ExternalLink,
    ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const guide = guides.find((g) => g.slug === slug);

    if (!guide) return {};

    return {
        title: `${guide.title} | Tulz Guides`,
        description: guide.description,
        openGraph: {
            title: guide.title,
            description: guide.description,
            type: "article",
        },
    };
}

export default async function GuideDetailPage({ params }: Props) {
    const { slug } = await params;
    const guide = guides.find((g) => g.slug === slug);

    if (!guide) {
        notFound();
    }

    // Generate HowTo Structured Data
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": guide.title,
        "description": guide.description,
        "step": guide.content.steps.map((step, index) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "name": step.title,
            "itemListElement": [
                {
                    "@type": "HowToDirection",
                    "text": step.description
                }
            ]
        })),
        "totalTime": "PT3M", // Simulated
    };

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <Header />

            <main className="flex-1 pt-24 pb-16">
                <div className="container mx-auto max-w-4xl px-4">
                    {/* Back button */}
                    <Link
                        href="/guides"
                        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors mb-8"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Guides
                    </Link>

                    {/* Header */}
                    <div className="space-y-6 mb-12">
                        <div className="flex gap-2">
                            <Badge variant="secondary">{guide.category}</Badge>
                            <Badge variant="outline" className="flex gap-1 items-center">
                                <Clock className="h-3 w-3" />
                                {guide.readTime}
                            </Badge>
                        </div>

                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                            {guide.title}
                        </h1>

                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-6">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                Updated {guide.lastUpdated}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                                Verified Private
                            </span>
                        </div>
                    </div>

                    {/* Intro */}
                    <div className="prose prose-slate dark:prose-invert max-w-none mb-12">
                        <p className="text-xl text-slate-600 dark:text-slate-300 italic border-l-4 border-red-500 pl-6 py-2">
                            {guide.content.intro}
                        </p>
                        <h2 className="text-2xl font-bold mt-10 mb-4">Why is this needed?</h2>
                        <p>{guide.content.whyNeeded}</p>
                    </div>

                    {/* Steps */}
                    <div className="space-y-12 mb-16">
                        <h2 className="text-2xl font-bold flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white text-sm">
                                !
                            </span>
                            Step-by-Step Instructions
                        </h2>

                        <div className="space-y-8">
                            {guide.content.steps.map((step, index) => (
                                <div key={index} className="flex gap-6 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-red-600 dark:text-red-400">
                                        {index + 1}
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                            {step.title}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CTA Box */}
                    <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-3xl p-8 text-white mb-16 shadow-xl shadow-red-500/20">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="space-y-2 text-center md:text-left">
                                <h2 className="text-2xl font-bold">Ready to try it?</h2>
                                <p className="opacity-90">Open our free {guide.relatedTool.name} and get started now.</p>
                            </div>
                            <Link href={guide.relatedTool.href}>
                                <button className="px-8 py-4 bg-white text-red-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2">
                                    Launch {guide.relatedTool.name}
                                    <ExternalLink className="h-4 w-4" />
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Pro Tips */}
                    <div className="mb-16">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                            Pro Tips
                        </h2>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {guide.content.proTips.map((tip, i) => (
                                <li key={i} className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl text-sm leading-relaxed">
                                    <span className="text-yellow-600 dark:text-yellow-400 font-bold">•</span>
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* FAQ */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-12">
                        <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
                        <div className="space-y-6">
                            {guide.content.faq.map((item, i) => (
                                <div key={i} className="space-y-2">
                                    <h3 className="font-bold text-slate-900 dark:text-white">
                                        {item.q}
                                    </h3>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                                        {item.a}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
