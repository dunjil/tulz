"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { guides } from "@/data/guides";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "../../components/ui/badge";
import { BookOpen, Clock, ChevronRight } from "lucide-react";

export default function GuidesPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
            <Header />

            <main className="flex-1 pt-24 pb-16 px-4">
                <div className="container mx-auto max-w-5xl">
                    <div className="mb-12 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-slate-900 dark:text-white">
                            How-To Guides
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            Step-by-step instructions to help you get the most out of our tools and solve common document and image problems.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {guides.map((guide) => (
                            <Link key={guide.slug} href={`/guides/${guide.slug}`}>
                                <Card className="h-full hover:shadow-xl transition-all duration-300 group border-slate-200 dark:border-slate-800">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform dark:bg-slate-800 dark:text-white">
                                                <guide.icon className="h-6 w-6" />
                                            </div>
                                            <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {guide.category}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl font-bold group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                            {guide.title}
                                        </CardTitle>
                                        <CardDescription className="line-clamp-2 mt-2">
                                            {guide.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {guide.readTime}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <BookOpen className="h-3.5 w-3.5" />
                                                    {guide.content.steps.length} steps
                                                </span>
                                            </div>
                                            <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
