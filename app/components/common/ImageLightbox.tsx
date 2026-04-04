import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface Props {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt = 'Imagem', onClose }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const scale = useRef(1);
  const pos = useRef({ x: 0, y: 0 });
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [pct, setPct] = useState(100);

  const applyTransform = (transition = false) => {
    if (!imgRef.current) return;
    imgRef.current.style.transition = transition ? 'transform 0.15s ease' : 'none';
    imgRef.current.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px) scale(${scale.current})`;
    setPct(Math.round(scale.current * 100));
  };

  const reset = () => {
    scale.current = 1;
    pos.current = { x: 0, y: 0 };
    applyTransform(true);
  };

  const zoom = (delta: number) => {
    scale.current = Math.min(8, Math.max(0.5, scale.current + delta));
    if (scale.current <= 1) pos.current = { x: 0, y: 0 };
    applyTransform(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    scale.current = Math.min(8, Math.max(0.5, scale.current - e.deltaY * 0.002));
    if (scale.current <= 1) pos.current = { x: 0, y: 0 };
    applyTransform(false);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale.current <= 1) return;
    e.preventDefault();
    dragStart.current = { x: e.clientX - pos.current.x, y: e.clientY - pos.current.y };
    if (imgRef.current) imgRef.current.style.cursor = 'grabbing';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    pos.current = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
    applyTransform(false);
  };

  const onMouseUp = () => {
    dragStart.current = null;
    if (imgRef.current) imgRef.current.style.cursor = scale.current > 1 ? 'grab' : 'default';
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || scale.current <= 1) return;
    dragStart.current = { x: e.touches[0].clientX - pos.current.x, y: e.touches[0].clientY - pos.current.y };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragStart.current || e.touches.length !== 1) return;
    e.preventDefault();
    pos.current = { x: e.touches[0].clientX - dragStart.current.x, y: e.touches[0].clientY - dragStart.current.y };
    applyTransform(false);
  };

  return (
    <div className="fixed inset-0 lg:left-64 z-[110] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => zoom(0.5)} className="rounded-full bg-surface border border-border-subtle p-1.5 text-content-muted hover:text-content shadow-lg transition-colors"><ZoomIn size={16} /></button>
        <button onClick={() => zoom(-0.5)} className="rounded-full bg-surface border border-border-subtle p-1.5 text-content-muted hover:text-content shadow-lg transition-colors"><ZoomOut size={16} /></button>
        <button onClick={reset} className="rounded-full bg-surface border border-border-subtle p-1.5 text-content-muted hover:text-content shadow-lg transition-colors"><RotateCcw size={16} /></button>
        <button onClick={onClose} className="rounded-full bg-surface border border-border-subtle p-1.5 text-content-muted hover:text-content shadow-lg transition-colors"><X size={16} /></button>
      </div>

      <div
        className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden"
        onClick={e => e.stopPropagation()}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { dragStart.current = null; }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          className="rounded-xl object-contain select-none"
          style={{ maxHeight: '90vh', maxWidth: '90vw', cursor: 'default', willChange: 'transform' }}
        />
      </div>

      {pct !== 100 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/60 px-3 py-1 text-[10px] text-white/60 pointer-events-none">
          {pct}%
        </div>
      )}
    </div>
  );
}
