import type { Metadata } from "next";
import Link from "next/link";
import {
    Target,
    Zap,
    Shield,
    Info,
    Users,
    Globe,
    FileText,
    ImageIcon,
    Wrench,
    Heart,
    CheckCircle2,
    Lock,
    Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
    title: "About Tulz — Free Online Tools for PDF, Images & More",
    description:
        "Tulz is a free, browser-based productivity platform with 50+ tools for PDF editing, image compression, document conversion, QR code generation, invoice creation, and more. Learn about our mission and values.",
    alternates: {
        canonical: "https://tulz.app/about",
    },
};

const stats = [
    { label: "Free Tools Available", value: "50+" },
    { label: "How-To Guides Published", value: "40+" },
    { label: "File formats supported", value: "25+" },
    { label: "No sign-up required", value: "Ever" },
];

const values = [
    {
        icon: Shield,
        title: "Privacy First — Always",
        description:
            "Every file you upload is processed in a temporary, isolated environment and permanently deleted immediately after your download is ready. We have no ability to view, save, or share your content. There are no exceptions to this rule. Your documents are yours alone.",
    },
    {
        icon: Zap,
        title: "Genuinely Free, No Tricks",
        description:
            "Tulz is free for everyone — no sign-up, no credit card, no surprise limits, and no hidden subscriptions. We believe that fundamental productivity tools should be accessible to all, whether you're a student submitting assignments, a freelancer on a tight budget, or a professional managing documents.",
    },
    {
        icon: Globe,
        title: "Works on Every Device",
        description:
            "From compressing a PDF on your phone to merging CAD files on a desktop workstation, Tulz is fully responsive and optimized for all screen sizes and operating systems. There is nothing to install — open your browser and start working immediately.",
    },
    {
        icon: Sparkles,
        title: "Quality Over Quantity",
        description:
            "We don't just add tools for the sake of adding them. Every tool on Tulz is tested for accuracy, speed, and output quality before it goes live. We'd rather have 50 excellent tools than 500 mediocre ones. If a tool doesn't do its job well, we keep working until it does.",
    },
    {
        icon: Lock,
        title: "No Data Monetization",
        description:
            "Tulz is supported by non-intrusive advertising (Google AdSense). That's it. We do not sell, analyze, or monetize your personal data or the content of your files in any way. Our only relationship with your data is to process it and delete it.",
    },
    {
        icon: Heart,
        title: "Built for Real Problems",
        description:
            "Tulz was born out of frustration with tools that demand accounts, limit features, or charge for basic operations. Every feature we've built solves a real, common problem — from resizing a photo for a government visa portal to converting a Word document for a client.",
    },
];

const toolCategories = [
    {
        icon: FileText,
        title: "PDF Tools",
        description:
            "Compress, merge, split, rotate, crop, protect, and convert PDFs. Convert from Word, Excel, PowerPoint, HTML, and Markdown to PDF — and back again.",
        count: "20+ tools",
    },
    {
        icon: ImageIcon,
        title: "Image Tools",
        description:
            "Compress, resize, crop, rotate, convert, and watermark images. Remove backgrounds with AI, convert between HEIC, PNG, JPG, WebP, and more.",
        count: "15+ tools",
    },
    {
        icon: Wrench,
        title: "Utility Tools",
        description:
            "Generate QR codes, create invoices, build CVs, format JSON, compare text, create favicons, convert Excel to CSV, and more.",
        count: "10+ tools",
    },
];

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            <div className="container mx-auto px-4 py-16 max-w-5xl">

                {/* Header */}
                <div className="mb-16 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-6 text-slate-900 dark:text-white">
                        About Tulz
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                        Tulz is a free, browser-based productivity platform with 50+ tools for working with PDFs,
                        images, and documents — with no sign-up, no installation, and no hidden costs.
                    </p>
                </div>

                {/* Our Story */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Our Story</h2>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4 text-base">
                            Tulz started with a simple, familiar frustration: you need to compress a PDF for a
                            government portal upload, but every tool on the first page of Google either wants you
                            to create an account, limits you to 3 free uses per day, or shows you an aggressive
                            paywall after uploading your file. That frustration is universal, and it&apos;s
                            unnecessary.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-4 text-base">
                            We built Tulz to be the tool platform we always wanted to use. One that respects your
                            time, your privacy, and your wallet. We obsess over the quality of each tool&apos;s output
                            — a PDF compressor that makes your file unreadable is not useful to anyone. A QR code
                            generator that produces broken codes is worse than no tool at all. Every tool you use on
                            Tulz has been tested extensively with real-world documents and real use cases.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base">
                            Today, Tulz offers over 50 free tools spanning PDF editing, image processing,
                            document conversion, and utilities used by students, freelancers, developers, and
                            professionals across the world. We publish detailed how-to guides to help users get
                            the most out of every tool and to solve common, specific document problems — from
                            compressing an image to under 20KB for a government form, to converting CAD drawings
                            to PDF without AutoCAD.
                        </p>
                    </div>
                </section>

                {/* Stats */}
                <section className="mb-16 p-8 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {stats.map((stat, i) => (
                            <div key={i}>
                                <div className="text-3xl font-extrabold text-red-600 dark:text-red-400 mb-1">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Mission */}
                <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                            <Target className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Our Mission</h2>
                    </div>
                    <blockquote className="border-l-4 border-red-500 pl-6 py-2 text-lg text-slate-700 dark:text-slate-300 italic leading-relaxed">
                        &ldquo;Make powerful file and document tools available to every person on the internet,
                        for free, without compromising their privacy or their time.&rdquo;
                    </blockquote>
                    <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        We define &ldquo;powerful&rdquo; not just by features, but by reliability, output quality,
                        and the breadth of real-world problems each tool can solve. We define
                        &ldquo;free&rdquo; as genuinely free — not free-with-asterisk. And we define
                        &ldquo;privacy&rdquo; as zero file retention, full stop.
                    </p>
                </section>

                {/* Our Values */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Our Values</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        {values.map((value, i) => (
                            <div
                                key={i}
                                className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                        <value.icon className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{value.title}</h3>
                                </div>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                    {value.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tool Categories */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">What&apos;s on Tulz</h2>
                    <div className="grid gap-6 md:grid-cols-3">
                        {toolCategories.map((cat, i) => (
                            <div
                                key={i}
                                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                        <cat.icon className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                                        {cat.count}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white mb-2">{cat.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    {cat.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* What we are NOT */}
                <section className="mb-16 p-8 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" /> What Tulz Is <em>Not</em>
                    </h2>
                    <ul className="space-y-3">
                        {[
                            "We are NOT a freemium trap. There is no premium tier hiding the best features.",
                            "We do NOT store your files. Everything is deleted immediately after processing. Period.",
                            "We do NOT require registration. Open the tool, use it, leave. That's it.",
                            "We do NOT sell or share your data with third parties for marketing purposes.",
                            "We do NOT add artificial limits to force upgrades (like '3 free conversions per day').",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Support / Contact */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Support &amp; Contact</h2>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                        Tulz is maintained by a small team passionate about building tools that work. If you
                        encounter a bug, have a feature suggestion, or want to say thanks, we&apos;d love to
                        hear from you.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <Link
                            href="https://ko-fi.com/tulzhub"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                        >
                            <Heart className="w-4 h-4" /> Support Tulz on Ko-fi
                        </Link>
                        <Link
                            href="/guides"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <FileText className="w-4 h-4" /> Browse our Guides
                        </Link>
                    </div>
                </section>

            </div>
        </div>
    );
}
