"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Check, Sparkles } from "lucide-react";

interface UpgradeModalContextType {
  showUpgradeModal: () => void;
  hideUpgradeModal: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextType | null>(null);

export function useUpgradeModal() {
  const context = useContext(UpgradeModalContext);
  if (!context) {
    throw new Error("useUpgradeModal must be used within UpgradeModalProvider");
  }
  return context;
}

// Global reference for the API interceptor
let globalShowUpgradeModal: (() => void) | null = null;

export function getShowUpgradeModal() {
  return globalShowUpgradeModal;
}

const PRO_BENEFITS = [
  "Unlimited uses of all tools",
  "Batch processing support",
  "All paper sizes & formats",
  "Priority support",
  "Early access to new tools",
];

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  // Paywalls removed - Component disabled
  const showUpgradeModal = useCallback(() => {
    // No-op
    // setIsOpen(false); 
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Register global reference (as no-op)
  useEffect(() => {
    globalShowUpgradeModal = showUpgradeModal;
    return () => {
      globalShowUpgradeModal = null;
    };
  }, [showUpgradeModal]);

  return (
    <UpgradeModalContext.Provider value={{ showUpgradeModal, hideUpgradeModal }}>
      {children}
      {/* Paywalls removed - Dialog removed */}
    </UpgradeModalContext.Provider>
  );
}
