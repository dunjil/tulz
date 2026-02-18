"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCropperProps {
    image: string;
    aspect: number;
    onCropChange: (crop: { x: number; y: number; width: number; height: number, zoom: number }) => void;
    circular?: boolean;
    className?: string;
}

export function ImageCropper({ image, aspect, onCropChange, circular = false, className }: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const [showHint, setShowHint] = useState(true);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        onCropChange({
            x: croppedAreaPixels.x,
            y: croppedAreaPixels.y,
            width: croppedAreaPixels.width,
            height: croppedAreaPixels.height,
            zoom
        });
    }, [onCropChange, zoom]);

    // Hide hint on first interaction
    const handleInteractionStart = () => setShowHint(false);

    return (
        <div className={cn("space-y-4", className)}>
            <div className="relative h-[400px] w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 group">
                <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    onInteractionStart={handleInteractionStart}
                    cropShape={circular ? "round" : "rect"}
                    showGrid={true}
                    restrictPosition={false}
                    style={{
                        containerStyle: { background: '#0f172a' },
                        cropAreaStyle: { border: '2px solid white', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.8)' }
                    }}
                />

                {/* Helper Overlay */}
                {showHint && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 animate-in fade-in zoom-in duration-500">
                        <div className="bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-lg border border-white/10">
                            <div className="bg-white/20 p-2 rounded-full">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M19 9l3 3-3 3M15 19l-3 3-3-3M2 12h20M12 2v20" /></svg>
                            </div>
                            <span className="font-medium">Drag to Reposition</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-4 p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <ZoomOut className="h-4 w-4 text-muted-foreground" />
                    <Slider
                        value={[zoom]}
                        min={1}
                        max={3}
                        step={0.1}
                        onValueChange={(vals) => setZoom(vals[0])}
                        className="flex-1"
                    />
                    <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Rotate & Adjust</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRotation((r) => r + 90)}
                        className="h-8 gap-2"
                    >
                        <RotateCw className="h-3 w-3" />
                        Rotate 90°
                    </Button>
                </div>
            </div>
        </div>
    );
}
