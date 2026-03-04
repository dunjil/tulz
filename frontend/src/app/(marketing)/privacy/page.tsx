import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Privacy Policy | Tulz",
    description:
        "Learn how Tulz collects, uses, and protects your data. We are committed to your privacy — your files are never stored on our servers.",
    alternates: {
        canonical: "https://tulz.app/privacy",
    },
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            <div className="container mx-auto px-4 py-16 max-w-3xl">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-bold mb-3 text-slate-900 dark:text-white">
                        Privacy Policy
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Last Updated: March 4, 2026 &nbsp;|&nbsp; Effective Date: March 4, 2026
                    </p>
                    <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                        At <strong>Tulz</strong> (<em>tulz.app</em>), your privacy is our top priority. This
                        Privacy Policy explains what information we collect, how we use it, and the choices you
                        have. By using Tulz, you agree to the practices described in this policy.
                    </p>
                </div>

                <div className="space-y-10 prose prose-slate dark:prose-invert max-w-none">

                    {/* 1. Who We Are */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            1. Who We Are
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            Tulz is a free, browser-based productivity platform offering tools for PDF editing,
                            image processing, document conversion, QR code generation, and more. We do not require
                            account registration to use any of our tools.
                        </p>
                    </section>

                    {/* 2. Information We Collect */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            2. Information We Collect
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                            We collect only the minimum information necessary to operate and improve our services:
                        </p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">Uploaded Files:</strong>{" "}
                                Files you upload (PDFs, images, documents, etc.) are processed entirely in-memory
                                on our servers. They are <strong>automatically and permanently deleted</strong>{" "}
                                immediately after processing, and no later than one (1) hour. We never read,
                                store, analyze, or share your file contents.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    IP Addresses &amp; Usage Logs:
                                </strong>{" "}
                                We collect your IP address and basic request metadata (browser type, referrer,
                                pages visited) for security, abuse prevention, rate limiting, and analytics. This
                                data is not linked to your identity.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">Cookies:</strong> We use
                                cookies and similar tracking technologies — see Section 5 below for full details.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    Voluntary Information:
                                </strong>{" "}
                                If you contact us via email or a support form, we collect only the information
                                you voluntarily provide (e.g., your email address and message).
                            </li>
                        </ul>
                        <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm italic leading-relaxed">
                            We do <strong>not</strong> collect names, addresses, payment information, or any
                            sensitive personal data. No account or registration is ever required.
                        </p>
                    </section>

                    {/* 3. How We Use Your Information */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            3. How We Use Your Information
                        </h2>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                            <li>To process your files and deliver the requested output back to you.</li>
                            <li>To maintain the security and stability of our servers and prevent abuse.</li>
                            <li>
                                To understand how users interact with our tools so we can improve performance and
                                add new features.
                            </li>
                            <li>To serve relevant advertisements through Google AdSense (see Section 5).</li>
                            <li>To respond to your support inquiries or feedback.</li>
                        </ul>
                        <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                            We do <strong>not</strong> sell, rent, or trade your personal information to any
                            third party for marketing purposes.
                        </p>
                    </section>

                    {/* 4. File Processing & Data Retention */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            4. File Processing &amp; Data Retention
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                            Our core commitment is simple: <strong>we do not keep your files</strong>.
                        </p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                            <li>
                                Files are uploaded to our servers solely to perform the requested conversion or
                                processing operation.
                            </li>
                            <li>
                                Processed output files are made available for immediate download and are deleted
                                from our servers automatically within <strong>1 hour</strong> of processing, or
                                immediately upon completion — whichever is sooner.
                            </li>
                            <li>
                                Input files are deleted immediately after processing is complete.
                            </li>
                            <li>
                                We have no ability to retrieve or view your files after deletion. There are no
                                backups of user-uploaded content.
                            </li>
                            <li>
                                Aggregate, anonymized usage statistics (e.g., number of PDFs processed per day)
                                may be retained indefinitely as they cannot be linked to you.
                            </li>
                        </ul>
                    </section>

                    {/* 5. Cookies & Advertising */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            5. Cookies &amp; Advertising (Google AdSense)
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                            Tulz is a free service supported by advertising. We use{" "}
                            <strong>Google AdSense</strong> to display ads on our site. Google AdSense may use
                            cookies and web beacons to serve ads based on your interests, derived from your
                            prior visits to this and other websites.
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                            Specifically, Google uses cookies such as the <code>DART</code> cookie to serve ads
                            based on your visit to our site and other sites on the internet. You can opt out of
                            the use of the DART cookie by visiting the{" "}
                            <a
                                href="https://policies.google.com/technologies/ads"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                            >
                                Google Advertising Policies and Privacy page
                            </a>
                            .
                        </p>
                        <p className="text-slate-600 dark:text-slate-400 mb-2 leading-relaxed">
                            We also use the following types of cookies:
                        </p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    Strictly Necessary Cookies:
                                </strong>{" "}
                                Required for the site to function (e.g., rate limiting, session security).
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    Analytics Cookies:
                                </strong>{" "}
                                Help us understand which tools are most used so we can improve them. Data is
                                aggregated and anonymized.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    Advertising Cookies:
                                </strong>{" "}
                                Used by Google AdSense to personalize ads shown to you.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    Preference Cookies:
                                </strong>{" "}
                                Remember your settings (e.g., dark mode preference).
                            </li>
                        </ul>
                        <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                            You can control cookies through your browser settings. Note that disabling cookies
                            may affect the functionality of some features. You can also opt out of personalized
                            advertising by visiting{" "}
                            <a
                                href="https://optout.aboutads.info/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                            >
                                AboutAds.info
                            </a>{" "}
                            or{" "}
                            <a
                                href="https://optout.networkadvertising.org/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                            >
                                NAI opt-out
                            </a>
                            .
                        </p>
                    </section>

                    {/* 6. Third-Party Services */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            6. Third-Party Services
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                            We may share limited information with the following trusted third-party service
                            providers, solely to operate our platform:
                        </p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">Google AdSense</strong> —
                                for serving advertisements. Google's privacy policy governs their use of data.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    Cloud / Hosting Providers
                                </strong>{" "}
                                — our servers run on secure cloud infrastructure. File uploads are processed on
                                these servers and deleted immediately after.
                            </li>
                        </ul>
                        <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                            These third parties are contractually obligated to handle data only as instructed by
                            us and in compliance with applicable privacy laws. We do not share your data with
                            any advertising networks beyond Google AdSense.
                        </p>
                    </section>

                    {/* 7. Children's Privacy */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            7. Children&apos;s Privacy
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            Tulz is not directed to children under the age of 13. We do not knowingly collect
                            personal information from children under 13. If you believe a child has provided us
                            with personal information, please contact us at the address below and we will delete
                            such information immediately.
                        </p>
                    </section>

                    {/* 8. Your Rights (GDPR / CCPA) */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            8. Your Privacy Rights
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
                            Depending on your location, you may have the following rights regarding your personal
                            data:
                        </p>
                        <ul className="list-disc list-outside pl-5 space-y-2 text-slate-600 dark:text-slate-400">
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">Right of Access:</strong>{" "}
                                Request a copy of any personal data we hold about you.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    Right to Erasure:
                                </strong>{" "}
                                Request deletion of your personal data. Since we do not store files or create user
                                accounts, there is typically nothing to delete. However, if you have contacted us,
                                we can delete that communication data on request.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">Right to Object:</strong>{" "}
                                Opt out of personalized advertising (see Section 5 for instructions).
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    CCPA (California Residents):
                                </strong>{" "}
                                We do not sell your personal information. California residents may request
                                disclosure of information we collect and share.
                            </li>
                            <li>
                                <strong className="text-slate-700 dark:text-slate-300">
                                    GDPR (EU/EEA Residents):
                                </strong>{" "}
                                Our legal basis for processing is legitimate interest (security, fraud prevention)
                                and consent (advertising cookies). You may withdraw consent at any time.
                            </li>
                        </ul>
                        <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                            To exercise any of these rights, contact us at the email below.
                        </p>
                    </section>

                    {/* 9. Data Security */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            9. Data Security
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            We use industry-standard security measures including HTTPS encryption for all data
                            in transit. Files are processed in isolated environments and deleted immediately
                            after use. While we take reasonable steps to protect your data, no system is
                            completely immune from security threats, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    {/* 10. Changes to This Policy */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            10. Changes to This Privacy Policy
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            We may update this Privacy Policy from time to time to reflect changes in our
                            practices or legal requirements. We will update the &ldquo;Last Updated&rdquo; date
                            at the top of this page. We encourage you to review this page periodically. Your
                            continued use of Tulz after any changes constitutes your acceptance of the updated
                            policy.
                        </p>
                    </section>

                    {/* 11. Contact Us */}
                    <section>
                        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">
                            11. Contact Us
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                            If you have any questions, concerns, or requests regarding this Privacy Policy or
                            our data practices, please reach out to us:
                        </p>
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-slate-700 dark:text-slate-300 font-semibold">Tulz Support</p>
                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                                Website:{" "}
                                <Link
                                    href="/"
                                    className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
                                >
                                    tulz.app
                                </Link>
                            </p>
                        </div>
                    </section>

                    {/* Footer note */}
                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                            This privacy policy applies to all tools available on Tulz, including but not
                            limited to PDF tools, image editors, converters, the QR code generator, invoice
                            generator, CV builder, JSON formatter, and all other utilities provided on this
                            platform. By using any tool on Tulz, you acknowledge that you have read and
                            understood this policy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
