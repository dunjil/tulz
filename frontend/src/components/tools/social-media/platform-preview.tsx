"use client";

import { Smartphone, Laptop, Heart, MessageCircle, Send, Bookmark, ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformPreviewProps {
    platform: "instagram" | "whatsapp" | "twitter" | "linkedin";
    type: string; // "post", "story", "header", "profile"
    image: string | null;
    className?: string;
}

const PhoneFrame = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("relative mx-auto border-gray-800 dark:border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl", className)}>
        <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
        <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
        <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
        <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-black relative">
            {children}
        </div>
    </div>
);

export function PlatformPreview({ platform, type, image, className }: PlatformPreviewProps) {
    if (!image) return null;

    const renderInstagram = () => {
        if (type === "story") {
            return (
                <PhoneFrame>
                    {/* Story UI Overlay */}
                    <div className="absolute inset-0 bg-black">
                        <div className="absolute top-8 left-0 right-0 px-4 flex justify-between items-center z-20">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                                    <img src="/placeholder-user.jpg" className="w-full h-full rounded-full bg-black/50" alt="" />
                                </div>
                                <span className="text-white text-sm font-semibold drop-shadow-md">Your Story</span>
                                <span className="text-white/60 text-xs font-medium ml-2">2h</span>
                            </div>
                            <MoreVertical className="text-white h-5 w-5 drop-shadow-md" />
                        </div>

                        {/* Image */}
                        <img src={image} className="w-full h-full object-cover" alt="Story Preview" />

                        {/* Bottom Input */}
                        <div className="absolute bottom-8 left-4 right-4 z-20 flex items-center gap-4">
                            <div className="h-11 rounded-full border border-white/20 bg-transparent flex-1 placeholder:text-white/80 px-4 flex items-center text-white/80 text-sm backdrop-blur-sm">
                                Send message...
                            </div>
                            <Heart className="text-white h-7 w-7 drop-shadow-md" />
                            <Send className="text-white h-7 w-7 drop-shadow-md -rotate-12" />
                        </div>

                        {/* Status Bar Mock */}
                        <div className="absolute top-2 left-6 right-6 flex justify-between text-white text-xs font-medium z-20">
                            <span>9:41</span>
                            <div className="flex gap-1">
                                <div className="w-4 h-4 rounded-sm border border-white/50" />
                                <div className="w-4 h-4 rounded-sm border border-white/50" />
                            </div>
                        </div>
                    </div>
                </PhoneFrame>
            );
        }

        // Post View
        return (
            <PhoneFrame className="h-[550px]">
                {/* App Header */}
                <div className="h-12 border-b dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-black sticky top-0 z-10">
                    <span className="text-2xl font-bold tracking-tight select-none" style={{ fontFamily: 'Billabong, "Brush Script MT", cursive', fontStyle: 'italic' }}>Instagram</span>
                    <div className="flex gap-4">
                        <Heart className="h-6 w-6" />
                        <MessageCircle className="h-6 w-6" />
                    </div>
                </div>

                <div className="pb-4 overflow-y-auto h-full scrollbar-hide">
                    {/* User Row */}
                    <div className="h-14 flex items-center justify-between px-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
                                <div className="w-full h-full bg-slate-200 rounded-full" />
                            </div>
                            <span className="text-sm font-semibold">username</span>
                        </div>
                        <MoreVertical className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className={cn("w-full bg-slate-100 dark:bg-slate-900 relative", type === "portrait" ? "aspect-[4/5]" : "aspect-square")}>
                        <img src={image} className="w-full h-full object-cover" alt="Post Preview" />
                    </div>

                    {/* Actions */}
                    <div className="p-3">
                        <div className="flex justify-between mb-3">
                            <div className="flex gap-4">
                                <Heart className="h-6 w-6 hover:text-red-500 transition-colors cursor-pointer" />
                                <MessageCircle className="h-6 w-6 -rotate-90" />
                                <Send className="h-6 w-6" />
                            </div>
                            <Bookmark className="h-6 w-6" />
                        </div>
                        <div className="text-xs font-semibold mb-2">1,234 likes</div>
                        <div className="text-xs leading-relaxed">
                            <span className="font-semibold mr-2">username</span>
                            Just adjusted this photo using ToolHub! #perfectfit #toolhub
                        </div>
                    </div>
                </div>
            </PhoneFrame>
        );
    };

    const renderWhatsApp = () => {
        return (
            <PhoneFrame>
                <div className="h-full bg-[#0b141a] flex flex-col font-sans">
                    {/* WA Header */}
                    <div className="bg-[#202c33] h-16 flex items-center px-2 text-gray-300 gap-4 shrink-0">
                        <ArrowLeft className="h-6 w-6 ml-2" />
                        <span className="text-xl font-medium text-white">Profile</span>
                    </div>

                    {/* Profile Area */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="flex justify-center py-10 relative">
                            <div className="relative w-40 h-40 rounded-full overflow-hidden border-[4px] border-[#202c33] group cursor-pointer shadow-lg">
                                <img src={image} className="w-full h-full object-cover" alt="DP Preview" />
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Camera Icon Badge */}
                            <div className="absolute bottom-10 right-[30%] bg-[#00a884] p-2 rounded-full shadow-lg">
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0-8c2.76 0 5 2.24 5 5s-2.24 5-5 5-5-2.24-5-5 2.24-5 5-5zm0 12c.75 0 1.48-.09 2.18-.25l.84 2.53C14.07 21.84 13.06 22 12 22c-5.52 0-10-4.48-10-10 0-5.52 4.48-10 10-10 5.52 0 10 4.48 10 10 0 1.95-.57 3.77-1.55 5.31l-2.09-3.62C17.7 13.11 18 12.58 18 12c0-3.31-2.69-6-6-6s-6 2.69-6 6 2.69 6 6 6z"></path></svg>
                            </div>
                        </div>

                        <div className="px-6 space-y-6">
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-gray-400 text-sm">
                                    <span>Name</span>
                                    <span className="text-[#00a884]">Edit</span>
                                </div>
                                <div className="text-white text-lg">Your Name</div>
                                <div className="text-gray-500 text-sm">This is not your username or pin. This name will be visible to your WhatsApp contacts.</div>
                            </div>
                            <div className="h-[1px] bg-[#202c33]" />
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-gray-400 text-sm">
                                    <span>About</span>
                                    <span className="text-[#00a884]">Edit</span>
                                </div>
                                <div className="text-white text-lg">Busy</div>
                            </div>
                        </div>
                    </div>
                </div>
            </PhoneFrame>
        );
    };

    const renderTwitter = () => {
        return (
            <div className="w-[380px] bg-white dark:bg-black rounded-xl overflow-hidden shadow-xl mx-auto border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="h-8 px-4 flex items-center gap-4 border-b dark:border-slate-800">
                    <ArrowLeft className="h-4 w-4" />
                    <div className="font-bold text-sm">DisplayName</div>
                </div>

                <div className="relative">
                    {/* Banner Image */}
                    <div className="aspect-[3/1] bg-slate-200 dark:bg-slate-800 relative overflow-hidden group">
                        <img src={image} className="w-full h-full object-cover" alt="Header Preview" />

                        {/* Safe Zone Grid */}
                        <div className="absolute inset-0 grid grid-cols-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="border border-white/20" />
                            <div className="border border-white/20" />
                            <div className="border border-white/20" />
                        </div>
                    </div>

                    {/* Profile Pic Intersection */}
                    <div className="absolute -bottom-6 left-4">
                        <div className="w-20 h-20 rounded-full bg-slate-300 border-4 border-white dark:border-black" />
                    </div>
                </div>

                <div className="h-16 flex justify-end items-center px-4">
                    <div className="h-8 px-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center text-sm font-medium">Edit profile</div>
                </div>

                <div className="px-4 pb-4">
                    <div className="font-bold text-lg">DisplayName</div>
                    <div className="text-muted-foreground text-sm">@username</div>
                </div>
            </div>
        );
    };

    const renderLinkedIn = () => {
        return (
            <div className="w-[380px] bg-white dark:bg-[#1b1f23] rounded-xl overflow-hidden shadow-xl mx-auto border border-slate-200 dark:border-slate-800">
                <div className="relative">
                    {/* Banner */}
                    <div className="aspect-[4/1] bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                        <img src={image} className="w-full h-full object-cover" alt="Banner Preview" />
                    </div>

                    {/* Profile Pic */}
                    <div className="absolute -bottom-10 left-6">
                        <div className="w-24 h-24 rounded-full bg-slate-300 border-4 border-white dark:border-[#1b1f23]" />
                    </div>
                </div>

                <div className="mt-12 px-6 pb-6">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className={cn("border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900/50 shadow-sm p-4", className)}>
            <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    {platform === "instagram" && <span className="text-pink-500">Instagram Mockup</span>}
                    {platform === "whatsapp" && <span className="text-green-500">WhatsApp Mockup</span>}
                    {platform === "twitter" && <span className="text-blue-500">Twitter Mockup</span>}
                    {platform === "linkedin" && <span className="text-blue-700">LinkedIn Mockup</span>}
                </div>
                <div className="text-xs text-muted-foreground bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
                    Preview Mode
                </div>
            </div>

            {platform === "instagram" && renderInstagram()}
            {platform === "whatsapp" && renderWhatsApp()}
            {platform === "twitter" && renderTwitter()}
            {platform === "linkedin" && renderLinkedIn()}
        </div>
    );
}
