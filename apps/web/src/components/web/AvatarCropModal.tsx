"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ModalDialog } from "./ModalDialog";
import { t } from "@money-matters/i18n";

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isPointerDownRef = useRef(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startOffsetRef = useRef({ x: 0, y: 0 });

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

    // Compute image scale matching smaller dimension
    const minDim = Math.min(img.width, img.height);
    const scale = (size / minDim) * zoom;
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    const drawX = (size - drawW) / 2 + offset.x;
    const drawY = (size - drawH) / 2 + offset.y;

    // Draw image with circular clipping mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }, [zoom, offset]);

  // Load new image source once when imageSrc changes (DO NOT depend on drawCanvas/zoom/offset)
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  // Redraw canvas whenever zoom or offset updates
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle global pointer drag (mouse & touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isPointerDownRef.current = true;
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startOffsetRef.current = { ...offset };
    setIsDragging(true);

    const onPointerMove = (moveEvt: PointerEvent) => {
      if (!isPointerDownRef.current) return;
      const dx = moveEvt.clientX - startPointerRef.current.x;
      const dy = moveEvt.clientY - startPointerRef.current.y;
      setOffset({
        x: startOffsetRef.current.x + dx,
        y: startOffsetRef.current.y + dy,
      });
    };

    const onPointerUp = () => {
      isPointerDownRef.current = false;
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Optional mouse wheel zooming inside canvas container
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.05 : -0.05;
    setZoom((prev) => Math.min(4, Math.max(0.2, +(prev + delta).toFixed(2))));
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/webp", 0.9);
    onCropSave(dataUrl);
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  const isDirty = zoom !== 1 || offset.x !== 0 || offset.y !== 0;

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} isDirty={isDirty} title={t("settings.positionZoomAvatar")}>
      <div className="flex flex-col items-center gap-5 p-2">
        <p className="text-xs text-slate-500 font-medium text-center">
          {t("settings.cropInstruction")}
        </p>

        {/* Viewport Canvas with Circular Outline */}
        <div
          onPointerDown={handlePointerDown}
          onWheel={handleWheel}
          style={{ touchAction: "none" }}
          className={`relative w-64 h-64 rounded-full border-4 border-[#2563eb] shadow-xl overflow-hidden bg-slate-900 select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <canvas ref={canvasRef} className="w-full h-full" />
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          <span className="text-xs font-bold text-slate-500">🔍 -</span>
          <input
            type="range"
            min="0.2"
            max="4"
            step="0.01"
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
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer"
          >
            {t("settings.saveAvatarPhoto")}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
