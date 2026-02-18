"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Facebook,
    Linkedin,
    Link as LinkIcon,
    Check,
    Twitter
} from "lucide-react";
import { toast } from "react-hot-toast";

export function ShareButtons({ title, description }: { title?: string; description?: string }) {
    const [url, setUrl] = useState("");
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        setUrl(window.location.href);
    }, []);

    if (!url) return null;

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title || "Check out this tool!");
    const encodedDesc = encodeURIComponent(description || "Useful online tool.");

    const shareLinks = {
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDesc}`,
        whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            toast.error("Failed to copy link");
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2 mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 mr-2">
                Share this tool:
            </span>

            {/* Twitter / X */}
            <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                title="Share on X (Twitter)"
            >
                <Twitter className="w-4 h-4" fill="currentColor" />
            </a>

            {/* Facebook */}
            <a
                href={shareLinks.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1877F2] text-white hover:bg-[#1877F2]/90 transition-colors"
                title="Share on Facebook"
            >
                <Facebook className="w-4 h-4" fill="currentColor" />
            </a>

            {/* LinkedIn */}
            <a
                href={shareLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90 transition-colors"
                title="Share on LinkedIn"
            >
                <Linkedin className="w-4 h-4" fill="currentColor" />
            </a>

            {/* WhatsApp */}
            <a
                href={shareLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366] text-white hover:bg-[#25D366]/90 transition-colors"
                title="Share on WhatsApp"
            >
                <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            </a>

            {/* Copy Link */}
            <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 ml-auto"
                onClick={copyToClipboard}
                title="Copy Link"
            >
                {isCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                ) : (
                    <LinkIcon className="w-4 h-4 text-slate-500" />
                )}
            </Button>
        </div>
    );
}
