'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Trash2,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import api from '@/lib/api/api';
import { getImageUrl, cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  label = 'Upload Gambar (Maks 500KB)'
}: ImageUploadProps) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Crop State
  const [zoom, setZoom] = useState(1);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [initSize, setInitSize] = useState({ width: 0, height: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const VIEWPORT_SIZE = 320;

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Direct check before crop to warn user
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File terlalu besar. Silakan pilih gambar di bawah 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setZoom(1);
      setPosX(0);
      setPosY(0);
      setOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Hanya file gambar yang didukung.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File terlalu besar. Silakan pilih gambar di bawah 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setZoom(1);
      setPosX(0);
      setPosY(0);
      setOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Calculate initial scale to cover the 320x320 viewport
  const handleImageLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;

    let initW = VIEWPORT_SIZE;
    let initH = VIEWPORT_SIZE;

    if (w > h) {
      initH = VIEWPORT_SIZE;
      initW = VIEWPORT_SIZE * (w / h);
    } else {
      initW = VIEWPORT_SIZE;
      initH = VIEWPORT_SIZE * (h / w);
    }

    setInitSize({ width: initW, height: initH });
    setPosX((VIEWPORT_SIZE - initW) / 2);
    setPosY((VIEWPORT_SIZE - initH) / 2);
  };

  // Bound constraints helper
  const getBounds = (scale: number) => {
    const w = initSize.width * scale;
    const h = initSize.height * scale;

    const minX = VIEWPORT_SIZE - w;
    const minY = VIEWPORT_SIZE - h;

    return { minX, maxX: 0, minY, maxY: 0 };
  };

  // Handle Panning (Drag)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragOffset.current = { x: posX, y: posY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    const newX = dragOffset.current.x + dx;
    const newY = dragOffset.current.y + dy;

    const bounds = getBounds(zoom);
    setPosX(Math.min(bounds.maxX, Math.max(bounds.minX, newX)));
    setPosY(Math.min(bounds.maxY, Math.max(bounds.minY, newY)));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Touch Panning
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    dragOffset.current = { x: posX, y: posY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;

    const newX = dragOffset.current.x + dx;
    const newY = dragOffset.current.y + dy;

    const bounds = getBounds(zoom);
    setPosX(Math.min(bounds.maxX, Math.max(bounds.minX, newX)));
    setPosY(Math.min(bounds.maxY, Math.max(bounds.minY, newY)));
  };

  useEffect(() => {
    if (open) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, posX, posY, zoom, initSize]);

  // Handle Zoom (Centred)
  const handleZoomChange = (val: number) => {
    const nextZoom = Math.max(1, Math.min(3, val));

    // Centering calculation
    const viewCenterX = VIEWPORT_SIZE / 2 - posX;
    const viewCenterY = VIEWPORT_SIZE / 2 - posY;

    const propX = viewCenterX / (initSize.width * zoom);
    const propY = viewCenterY / (initSize.height * zoom);

    const newPosX = VIEWPORT_SIZE / 2 - propX * initSize.width * nextZoom;
    const newPosY = VIEWPORT_SIZE / 2 - propY * initSize.height * nextZoom;

    const bounds = getBounds(nextZoom);
    setZoom(nextZoom);
    setPosX(Math.min(bounds.maxX, Math.max(bounds.minX, newPosX)));
    setPosY(Math.min(bounds.maxY, Math.max(bounds.minY, newPosY)));
  };

  // Crop and Upload
  const handleCropSave = async () => {
    if (!imgRef.current) return;
    setLoading(true);

    try {
      const canvas = document.createElement('canvas');
      // Export at 480x480 for high fidelity retina screens while maintaining very small footprint
      const exportSize = 480;
      canvas.width = exportSize;
      canvas.height = exportSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');

      // Enable image smoothing for high quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const scale = exportSize / VIEWPORT_SIZE;
      const drawX = posX * scale;
      const drawY = posY * scale;
      const drawW = initSize.width * zoom * scale;
      const drawH = initSize.height * zoom * scale;

      ctx.drawImage(imgRef.current, drawX, drawY, drawW, drawH);

      // Perform compression to JPEG with 85% quality for excellent quality and extremely small file size
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            toast.error('Gagal memproses gambar');
            setLoading(false);
            return;
          }

          // Double validation check on file size
          if (blob.size > 500 * 1024) {
            // Compress further if somehow it exceeds 500KB
            canvas.toBlob(
              async (lowBlob) => {
                if (lowBlob) {
                  await uploadToServer(lowBlob);
                } else {
                  toast.error('File melebihi batas 500KB');
                  setLoading(false);
                }
              },
              'image/jpeg',
              0.65
            );
          } else {
            await uploadToServer(blob);
          }
        },
        'image/jpeg',
        0.85
      );
    } catch {
      toast.error('Terjadi kesalahan saat memproses gambar');
      setLoading(false);
    }
  };

  const uploadToServer = async (fileBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('image', fileBlob, 'cropped-image.jpg');

      const res = await api.post('/rtu/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        // Delete old image if exists to keep server clean
        if (value) {
          try {
            await api.delete(`/rtu/upload?url=${encodeURIComponent(value)}`);
          } catch (err) {
            console.error('Failed to clean up old image:', err);
          }
        }
        onChange(res.data.url);
        toast.success('Gambar berhasil diunggah');
        setOpen(false);
      } else {
        toast.error(res.data?.message || 'Gagal mengunggah gambar');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengunggah gambar');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (value) {
      try {
        await api.delete(`/rtu/upload?url=${encodeURIComponent(value)}`);
      } catch (err) {
        console.error('Failed to delete image from server:', err);
      }
    }
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col space-y-2">
      <label className="text-xs font-semibold text-gray-700">{label}</label>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Preview / Trigger Container */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative group cursor-pointer w-full max-w-md h-28 rounded-sm border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-200 shadow-sm p-4',
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01] shadow-md'
              : 'border-gray-300 bg-slate-50 hover:border-indigo-500 hover:bg-slate-100/50'
          )}
        >
          <input
            type="file"
            ref={inputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          {value ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getImageUrl(value)}
                alt="Upload Preview"
                className="max-h-full object-contain rounded-sm"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-sm">
                <Upload className="w-5 h-5 text-white mb-1" />
                <span className="text-white text-[11px] font-semibold">
                  Choose or drag new image to replace
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors text-center">
              <Upload className="w-6 h-6 mb-1.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
              <p className="text-xs font-semibold text-gray-600 group-hover:text-indigo-700 transition-colors">
                Choose a file or drag and drop here
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                PNG, JPG, JPEG up to 5MB (Max 500KB after crop)
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        {value && (
          <div className="flex flex-col justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              className="h-8 py-0 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 hover:border-rose-300 rounded-sm gap-1 self-start sm:self-center"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus
            </Button>
          </div>
        )}
      </div>

      {/* Radical Crop Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[400px] p-6 bg-white rounded-sm border-t-4 border-indigo-600 shadow-2xl gap-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800 text-center flex items-center justify-center gap-1.5">
              Sesuaikan Gambar
            </DialogTitle>
          </DialogHeader>

          {/* Interactive Crop Viewport */}
          <div className="relative w-[320px] h-[320px] mx-auto bg-slate-100 border border-gray-200 rounded-sm overflow-hidden select-none shadow-inner">
            {src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imgRef}
                src={src}
                alt="Source Image"
                onLoad={handleImageLoaded}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                className="max-w-none origin-top-left touch-none select-none"
                style={{
                  position: 'absolute',
                  left: posX,
                  top: posY,
                  width: initSize.width * zoom,
                  height: initSize.height * zoom,
                  cursor: 'move'
                }}
              />
            )}

            {/* Viewport Mask/Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none border-2 border-indigo-600/80 rounded-sm ring-4 ring-black/40 flex items-center justify-center shadow-inner">
              <div className="grid grid-cols-3 grid-rows-3 w-full h-full opacity-30 border border-white/20">
                <div className="border-r border-b border-white border-dashed"></div>
                <div className="border-r border-b border-white border-dashed"></div>
                <div className="border-b border-white border-dashed"></div>
                <div className="border-r border-b border-white border-dashed"></div>
                <div className="border-r border-b border-white border-dashed"></div>
                <div className="border-b border-white border-dashed"></div>
                <div className="border-r border-white border-dashed"></div>
                <div className="border-r border-white border-dashed"></div>
                <div></div>
              </div>
            </div>
          </div>

          {/* Slider Zoom Controls */}
          <div className="flex items-center gap-3 w-[320px] mx-auto text-gray-500 py-1">
            <ZoomOut className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer appearance-none focus:outline-none"
            />
            <ZoomIn className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-gray-600 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <DialogFooter className="flex sm:flex-row items-center justify-between w-[320px] mx-auto gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setOpen(false)}
              className="flex-1 h-9 rounded-sm border-gray-300 font-semibold text-xs text-gray-700 hover:bg-slate-50 gap-1 active:scale-[0.98]"
            >
              <X className="w-3.5 h-3.5" /> Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={loading}
              onClick={handleCropSave}
              className="flex-1 h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-sm gap-1 active:scale-[0.98] shadow-md shadow-indigo-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengunggah...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" /> Simpan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
