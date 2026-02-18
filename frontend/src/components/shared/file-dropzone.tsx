"use client";

import { useCallback } from "react";
import { useDropzone, Accept } from "react-dropzone";
import { Upload, File, X, Lock } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Accept;
  maxSize?: number;
  multiple?: boolean;
  maxFiles?: number;
  selectedFiles?: File[];
  onRemoveFile?: (index: number) => void;
  className?: string;
  label?: string;
}

export function FileDropzone({
  onFilesSelected,
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB default
  multiple = false,
  maxFiles,
  selectedFiles = [],
  onRemoveFile,
  className,
  label = "Drop files here or click to upload",
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept,
      maxSize,
      multiple,
      maxFiles,
    });

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center px-4">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Max size: {formatBytes(maxSize)}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 py-2 px-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-full">
        <Lock className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        <span className="text-[11px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
          Privacy Guaranteed: Your files are not saved
        </span>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-2 text-sm text-destructive">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name}>
              {file.name}: {errors.map((e) => e.message).join(", ")}
            </div>
          ))}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <File className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              {onRemoveFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveFile(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
