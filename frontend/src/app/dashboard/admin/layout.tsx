"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Shield,
  MessageSquare,
} from "lucide-react";

const adminNavItems = [
  {
    name: "Overview",
    href: "/dashboard/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Users",
    href: "/dashboard/admin/users",
    icon: Users,
  },
  {
    name: "Analytics",
    href: "/dashboard/admin/analytics",
    icon: BarChart3,
  },
  {
    name: "Feedback",
    href: "/dashboard/admin/feedback",
    icon: MessageSquare,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (!user?.is_superuser) {
        router.push("/");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user?.is_superuser) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
        <p className="text-muted-foreground">
          You don&apos;t have permission to access this area.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Admin Header */}
      <div className="mb-6 pb-4 border-b">
        <div className="flex items-center gap-2 text-primary mb-2">
          <Shield className="h-5 w-5" />
          <span className="text-sm font-medium">Admin Dashboard</span>
        </div>
        <h1 className="text-2xl font-bold">Management Console</h1>
      </div>

      {/* Admin Navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Admin Content */}
      {children}
    </div>
  );
}
