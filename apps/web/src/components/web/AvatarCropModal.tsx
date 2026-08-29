"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ModalDialog } from "./ModalDialog";

export interface AvatarCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropSave: (croppedDataUrl: string) => void;
}

export function AvatarCropModal({
  isOpen,
  imageSrc,
  onClose,
  onCropSave,
}: AvatarCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 256;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Calculate dimensions
    const scale = (size / Math.min(img.width, img.height)) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const drawX = (size - drawW) / 2 + offset.x;
    const drawY = (size - drawH) / 2 + offset.y;

    // Draw background with Circular Clip Mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }, [zoom, offset]);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        drawCanvas();
      };
      img.src = imageSrc;
    }
  }, [imageSrc, drawCanvas]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/webp", 0.9);
    onCropSave(dataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title="Position & Zoom Avatar">
      <div className="flex flex-col items-center gap-5 p-2">
        <p className="text-xs text-slate-500 font-medium text-center">
          Drag to center your photo within the circle, and adjust zoom slider below.
        </p>

        {/* Viewport Canvas with Circular Outline */}
        <div
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative w-64 h-64 rounded-full border-4 border-[#2563eb] shadow-xl overflow-hidden bg-slate-900 cursor-move select-none"
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <span className="text-xs font-bold text-slate-500">🔍 -</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-[#2563eb] cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-500">+</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 w-full pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer"
          >
            Save Avatar Photo
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
