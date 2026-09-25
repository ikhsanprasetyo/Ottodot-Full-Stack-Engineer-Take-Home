'use client';

import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { getImageUrl } from '@/lib/utils';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName: string;
}

export function ImagePreviewDialog({
  isOpen,
  onClose,
  imageUrl,
  imageName
}: ImagePreviewDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const viewportRef = useRef<HTMLDivElement>(null);

  // Reset zoom and pan when dialog is closed or changed
  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Non-passive wheel event listener to allow smooth zoom and prevent page scroll
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !isOpen) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) =>
        Math.max(0.5, Math.min(5, z + (e.deltaY < 0 ? 0.25 : -0.25)))
      );
    };

    viewport.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', handleWheelEvent);
    };
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-w-2xl bg-white border border-gray-200 rounded-sm shadow-xl p-0 overflow-hidden flex flex-col items-center"
        aria-describedby={undefined}
      >
        <DialogHeader className="p-4 w-full bg-white border-b border-gray-100 flex justify-between items-center shrink-0">
          <DialogTitle className="text-sm font-bold text-gray-800">
            Preview Gambar: {imageName}
          </DialogTitle>
        </DialogHeader>

        <div
          ref={viewportRef}
          className="relative w-full h-[450px] bg-gray-50 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getImageUrl(imageUrl)}
            alt={imageName}
            className="max-w-[90%] max-h-[90%] object-contain origin-center select-none pointer-events-none drop-shadow-md"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}
          />

          {/* Floating controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 border border-gray-200/80 backdrop-blur-md px-3 py-1.5 rounded-sm flex items-center gap-3 z-10 shadow-lg">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-gray-700 min-w-[36px] text-center select-none font-bold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-gray-200" />
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors text-[10px] font-bold px-1.5 uppercase"
              title="Reset Zoom & Position"
            >
              Reset
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
