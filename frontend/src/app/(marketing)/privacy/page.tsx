"use client";

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-3xl">
            <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">Privacy Policy</h1>
            <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-slate-600 dark:text-slate-400 mb-6">Last Updated: February 18, 2026</p>

                <section className="mb-8 font-medium">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">1. Data Collection</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        We collect minimal information required to provide our services. This includes IP addresses for security
                        and rate limiting, and temporary file uploads for processing.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">2. File Retention</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        Files uploaded to our servers are automatically deleted after processing or within one hour. We do not
                        retain your personal data or file contents longer than necessary.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">3. Third-Party Services</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        We use Google AdSense for advertisement delivery. Google may use cookies to serve ads based on your
                        visits to this and other websites.
                    </p>
                </section>

                <section className="mb-8 font-medium">
                    <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">4. Your Rights</h2>
                    <p className="text-slate-600 dark:text-slate-400">
                        You have the right to access, correct, or delete any personal information we may hold. Since we collect
                        minimal data, this typically refers to your account profile if you have registered.
                    </p>
                </section>
            </div>
        </div>
    );
}
