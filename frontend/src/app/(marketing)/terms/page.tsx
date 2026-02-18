"use client";

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Terms of Service</h1>
            <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-slate-600 dark:text-slate-400 mb-6">Last Updated: February 18, 2026</p>

                <section className="mb-8 font-medium">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        By accessing or using Tulz, you agree to be bound by these Terms of Service. If you do not agree to
                        these terms, please do not use our services.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">2. Use of Services</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        Our tools are provided "as is" for your personal and professional use. You agree not to use our
                        services for any illegal activities or to attempt to disrupt our servers.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">3. Intellectual Property</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        All content and software on Tulz are the property of Tulz or its licensors. You may not copy,
                        modify, or distribute our software without explicit permission.
                    </p>
                </section>

                <section className="mb-8 font-medium">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">4. Limitation of Liability</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        Tulz is not liable for any direct, indirect, or incidental damages resulting from the use or inability
                        to use our services, including but not limited to loss of data or files.
                    </p>
                </section>
            </div>
        </div>
    );
}
