"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ToolInfoProps {
    heading: string;
    overview: string;
    benefits?: { title: string; description: string }[];
    useCases?: string[];
    howItWorks?: string;
    faq?: { q: string; a: string }[];
}

export function ToolInfoSection({
    heading,
    overview,
    benefits,
    useCases,
    howItWorks,
    faq,
}: ToolInfoProps) {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <section className="mt-16 border-t border-slate-200 dark:border-slate-800 pt-12">
            <div className="max-w-4xl">
                {/* Main heading */}
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                    {heading}
                </h2>

                {/* Overview paragraph */}
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 text-base">
                    {overview}
                </p>

                {/* How it works */}
                {howItWorks && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                            How It Works
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            {howItWorks}
                        </p>
                    </div>
                )}

                {/* Benefits */}
                {benefits && benefits.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Key Benefits
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {benefits.map((benefit, i) => (
                                <div
                                    key={i}
                                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                                >
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                        {benefit.title}
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {benefit.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Use Cases */}
                {useCases && useCases.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                            Common Use Cases
                        </h3>
                        <ul className="space-y-2">
                            {useCases.map((use, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-2 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"
                                >
                                    <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-xs">
                                        ✓
                                    </span>
                                    {use}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* FAQ */}
                {faq && faq.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                            Frequently Asked Questions
                        </h3>
                        <div className="space-y-3">
                            {faq.map((item, i) => (
                                <div
                                    key={i}
                                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
                                >
                                    <button
                                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                        className="w-full flex items-center justify-between p-4 text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <span className="font-medium text-slate-900 dark:text-white text-sm pr-4">
                                            {item.q}
                                        </span>
                                        {openFaq === i ? (
                                            <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                        )}
                                    </button>
                                    {openFaq === i && (
                                        <div className="px-4 pb-4 bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-2">
                                                {item.a}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
