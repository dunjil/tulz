"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, XCircle, Upload, Download, Cog } from "lucide-react";

export type ProgressStatus = "idle" | "uploading" | "processing" | "downloading" | "success" | "error";

interface ProgressState {
  status: ProgressStatus;
  progress: number;
  fileName?: string;
  message?: string;
  error?: string;
}

interface ProgressModalContextType {
  showProgress: (options: {
    status: ProgressStatus;
    fileName?: string;
    message?: string;
    progress?: number;
  }) => void;
  updateProgress: (progress: number) => void;
  setStatus: (status: ProgressStatus, message?: string) => void;
  setError: (error: string) => void;
  hideProgress: () => void;
  isVisible: boolean;
}

const ProgressModalContext = createContext<ProgressModalContextType | null>(null);

export function useProgressModal() {
  const context = useContext(ProgressModalContext);
  if (!context) {
    throw new Error("useProgressModal must be used within ProgressModalProvider");
  }
  return context;
}

const statusConfig: Record<ProgressStatus, { icon: React.ReactNode; color: string; defaultMessage: string }> = {
  idle: {
    icon: null,
    color: "",
    defaultMessage: "",
  },
  uploading: {
    icon: <Upload className="h-6 w-6 text-blue-500 animate-pulse" />,
    color: "bg-blue-500",
    defaultMessage: "Uploading file...",
  },
  processing: {
    icon: <Cog className="h-6 w-6 text-primary animate-spin" />,
    color: "bg-primary",
    defaultMessage: "Processing...",
  },
  downloading: {
    icon: <Download className="h-6 w-6 text-green-500 animate-pulse" />,
    color: "bg-green-500",
    defaultMessage: "Preparing download...",
  },
  success: {
    icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
    color: "bg-green-500",
    defaultMessage: "Complete!",
  },
  error: {
    icon: <XCircle className="h-8 w-8 text-red-500" />,
    color: "bg-red-500",
    defaultMessage: "An error occurred",
  },
};

export function ProgressModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<ProgressState>({
    status: "idle",
    progress: 0,
  });

  const showProgress = useCallback(
    ({ status, fileName, message, progress = 0 }: {
      status: ProgressStatus;
      fileName?: string;
      message?: string;
      progress?: number;
    }) => {
      setState({
        status,
        progress,
        fileName,
        message,
        error: undefined,
      });
      setIsOpen(true);
    },
    []
  );

  const updateProgress = useCallback((progress: number) => {
    setState((prev) => ({ ...prev, progress: Math.min(100, Math.max(0, progress)) }));
  }, []);

  const setStatus = useCallback((status: ProgressStatus, message?: string) => {
    setState((prev) => ({ ...prev, status, message }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, status: "error", error }));
  }, []);

  const hideProgress = useCallback(() => {
    setIsOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setState({ status: "idle", progress: 0 });
    }, 200);
  }, []);

  // Auto-hide on success after a delay
  useEffect(() => {
    if (state.status === "success") {
      const timer = setTimeout(() => {
        hideProgress();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.status, hideProgress]);

  const config = statusConfig[state.status];
  const displayMessage = state.message || config.defaultMessage;
  const showProgressBar = state.status === "uploading" || state.status === "processing" || state.status === "downloading";
  const isIndeterminate = state.status === "processing" && state.progress === 0;

  return (
    <ProgressModalContext.Provider
      value={{ showProgress, updateProgress, setStatus, setError, hideProgress, isVisible: isOpen }}
    >
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && state.status !== "uploading" && state.status !== "processing" && hideProgress()}>
        <DialogContent
          className="sm:max-w-sm"
          onPointerDownOutside={(e) => {
            // Prevent closing during upload/processing
            if (state.status === "uploading" || state.status === "processing") {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing during upload/processing
            if (state.status === "uploading" || state.status === "processing") {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              {state.status === "uploading" || state.status === "processing" || state.status === "downloading" ? (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  {config.icon}
                </div>
              ) : (
                config.icon
              )}
            </div>
            <DialogTitle className="text-center text-lg">
              {state.status === "error" ? "Error" : displayMessage}
            </DialogTitle>
            {state.fileName && state.status !== "success" && state.status !== "error" && (
              <DialogDescription className="text-center text-sm truncate max-w-full">
                {state.fileName}
              </DialogDescription>
            )}
            {state.error && (
              <DialogDescription className="text-center text-sm text-red-500">
                {state.error}
              </DialogDescription>
            )}
          </DialogHeader>

          {showProgressBar && (
            <div className="py-4">
              {isIndeterminate ? (
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                  <div className="h-full w-1/3 bg-primary animate-[indeterminate_1s_ease-in-out_infinite] rounded-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Progress value={state.progress} className="h-2" />
                  <p className="text-xs text-center text-muted-foreground">
                    {Math.round(state.progress)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Show action buttons */}
          <div className="flex justify-center gap-2">
            {state.status === "error" && (
              <Button onClick={hideProgress} variant="outline">
                Close
              </Button>
            )}
            {(state.status === "uploading" || state.status === "processing") && (
              <Button onClick={hideProgress} variant="outline" size="sm">
                Cancel
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </ProgressModalContext.Provider>
  );
}
