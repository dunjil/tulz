import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, Search } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
            <div className="text-center max-w-lg">
                {/* Animated Icon */}
                <div className="relative mx-auto mb-8">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                        <FileQuestion className="h-12 w-12 text-primary" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <Search className="h-4 w-4 text-orange-500" />
                    </div>
                </div>

                {/* Content */}
                <h1 className="text-4xl font-bold mb-3 tracking-tight text-foreground">
                    404 - Page Not Found
                </h1>
                <p className="text-muted-foreground mb-8 text-lg">
                    Oops! It seems we can&apos;t find the page you&apos;re looking for. It might have been moved, deleted, or never existed.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="gap-2">
                        <Link href="/">
                            <Home className="h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="gap-2">
                        <Link href="/dashboard">
                            <Search className="h-4 w-4" />
                            Go to Dashboard
                        </Link>
                    </Button>
                </div>

                {/* Decorative elements */}
                <div className="mt-12 pt-8 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                        Think this is an error?{" "}
                        <Link href="/dashboard/feedback" className="text-primary hover:underline font-medium">
                            Contact Support
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
