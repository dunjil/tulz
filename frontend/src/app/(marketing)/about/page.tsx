"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Info, Target, Zap, Shield } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4 text-slate-900 dark:text-white">
                    About Tulz
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400">
                    Simple, powerful tools for the modern web.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <Card className="border-none bg-slate-50 dark:bg-slate-900 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4 mb-4 text-red-600">
                            <Target className="w-6 h-6" />
                            <h2 className="text-xl font-bold">Our Mission</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            We believe that the best tools are the ones that get out of your way. Tulz was built to provide a
                            streamlined, no-nonsense experience for common tasks like PDF editing, image manipulation, and data formatting.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none bg-slate-50 dark:bg-slate-900 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4 mb-4 text-red-600">
                            <Zap className="w-6 h-6" />
                            <h2 className="text-xl font-bold">Performance First</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            Every tool on our platform is optimized for speed. No waiting for slow cloud uploads—whenever possible,
                            we process your files locally or on high-performance servers to give you instant results.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none bg-slate-50 dark:bg-slate-900 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4 mb-4 text-red-600">
                            <Shield className="w-6 h-6" />
                            <h2 className="text-xl font-bold">Privacy Matters</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            Your data is yours. We don't store your files longer than necessary for processing, and we never sell your
                            information. Tulz is built on a foundation of trust and transparency.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none bg-slate-50 dark:bg-slate-900 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4 mb-4 text-red-600">
                            <Info className="w-6 h-6" />
                            <h2 className="text-xl font-bold">100% Free</h2>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            We are committed to keeping Tulz accessible. All our core productivity tools are free to use, supported
                            entirely by users who appreciate the platform.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
