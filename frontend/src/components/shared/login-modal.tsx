"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/auth-provider";
import { Zap, Shield, Gift } from "lucide-react";
import toast from "react-hot-toast";

interface LoginModalContextType {
  showLoginModal: (context?: string) => void;
  hideLoginModal: () => void;
  isLoginModalOpen: boolean;
}

const LoginModalContext = createContext<LoginModalContextType | null>(null);

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error("useLoginModal must be used within LoginModalProvider");
  }
  return context;
}

// Global reference for external access
let globalShowLoginModal: ((context?: string) => void) | null = null;

export function getShowLoginModal() {
  return globalShowLoginModal;
}

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [contextMessage, setContextMessage] = useState<string | null>(null);

  const { login } = useAuth();

  const showLoginModal = useCallback((context?: string) => {
    setContextMessage(context || null);
    setIsOpen(true);
  }, []);

  const hideLoginModal = useCallback(() => {
    setIsOpen(false);
    // Reset form
    setEmail("");
    setPassword("");
    setContextMessage(null);
  }, []);

  // Handle modal close - redirect to home if on dashboard
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  // Register global reference
  useEffect(() => {
    globalShowLoginModal = showLoginModal;
    return () => {
      globalShowLoginModal = null;
    };
  }, [showLoginModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast.success("Welcome back!");
      hideLoginModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginModalContext.Provider value={{ showLoginModal, hideLoginModal, isLoginModalOpen: isOpen }}>
      {children}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Image
                src="/logo.png"
                alt="Tulz Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="font-bold text-xl">Tulz</span>
            </div>
            <DialogTitle className="text-xl text-center">
              Admin Login
            </DialogTitle>
            <DialogDescription className="text-center">
              Enter your admin credentials to continue
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="modal-email">Email</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                  onClick={() => setIsOpen(false)}
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="modal-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </LoginModalContext.Provider>
  );
}
