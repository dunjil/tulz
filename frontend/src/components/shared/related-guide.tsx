"use client";

import Link from "next/link";
import { BookOpen, Lightbulb, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { guides } from "@/data/guides";

interface RelatedGuideProps {
    guideSlug: string;
}

export function RelatedGuide({ guideSlug }: RelatedGuideProps) {
    const guide = guides.find((g) => g.slug === guideSlug);

    if (!guide) return null;

    return (
        <div className="mt-12 border-t border-slate-100 dark:border-slate-800 pt-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-red-600" />
                Related Expert Guide
            </h2>
            <Link href={`/guides/${guide.slug}`}>
                <Card className="hover:shadow-lg transition-all border-dashed border-2 hover:border-red-200 dark:hover:border-red-900 group bg-slate-50/30 dark:bg-slate-900/10">
                    <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-start gap-5">
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-800 text-red-600 group-hover:scale-110 transition-transform">
                                <guide.icon className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold group-hover:text-red-600 transition-colors">
                                    {guide.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                                    {guide.description}
                                </p>
                                <div className="flex items-center gap-4 pt-2 text-xs font-medium text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <Lightbulb className="h-3 w-3 text-yellow-500" />
                                        Pro Tips Included
                                    </span>
                                    <span>•</span>
                                    <span>{guide.readTime}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2 font-bold text-red-600 text-sm">
                            Read Guide
                            <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}
