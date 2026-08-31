import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Loader2 } from 'lucide-react';

interface TouchLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  resolvePhoto: (photoName: string) => string;
}

export const TouchLightbox: React.FC<TouchLightboxProps> = ({
  isOpen,
  onClose,
  photos,
  activeIndex,
  onChangeIndex,
  resolvePhoto,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [translateX, setTranslateX] = useState<number>(0);
  const [translateY, setTranslateY] = useState<number>(0);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<number>(0);
  const prevIndexRef = useRef<number>(activeIndex);

  useEffect(() => {
    if (activeIndex > prevIndexRef.current) {
      setSlideDirection(1);
    } else if (activeIndex < prevIndexRef.current) {
      setSlideDirection(-1);
    }
    prevIndexRef.current = activeIndex;
  }, [activeIndex]);

  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);

  // Touch tracking refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const initialTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset zoom & loading on index or open change
  useEffect(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setSwipeOffset(0);
    setIsImageLoading(true);
  }, [activeIndex, isOpen]);

  // Handle keyboard navigation inside Lightbox
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (photos.length <= 1) return;
      if (e.key === 'ArrowRight') {
        onChangeIndex(activeIndex < photos.length - 1 ? activeIndex + 1 : 0);
      }
      if (e.key === 'ArrowLeft') {
        onChangeIndex(activeIndex > 0 ? activeIndex - 1 : photos.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, photos, onClose, onChangeIndex]);


  // Touch handlers
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (photos.length > 1 && scale === 1) {
          onChangeIndex(activeIndex < photos.length - 1 ? activeIndex + 1 : 0);
        }
      } else if (e.key === 'ArrowLeft') {
        if (photos.length > 1 && scale === 1) {
          onChangeIndex(activeIndex > 0 ? activeIndex - 1 : photos.length - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeIndex, photos.length, scale, onChangeIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsInteracting(true);

    if (e.touches.length === 2) {
      // Pinch to Zoom start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialPinchDistRef.current = dist;
      initialScaleRef.current = scale;
      initialTranslateRef.current = { x: translateX, y: translateY };
    } else if (e.touches.length === 1) {
      // Single touch pan or swipe start
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
      initialTranslateRef.current = { x: translateX, y: translateY };

      // Double-tap detection
      const now = Date.now();
      const timeDiff = now - lastTapRef.current.time;
      const distDiff = Math.hypot(t.clientX - lastTapRef.current.x, t.clientY - lastTapRef.current.y);

      if (timeDiff < 300 && distDiff < 35) {
        // Double tap toggles zoom
        if (scale > 1.2) {
          setScale(1);
          setTranslateX(0);
          setTranslateY(0);
        } else {
          setScale(2.5);
          // Zoom into the tapped point approximately
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const clickX = t.clientX - rect.left - rect.width / 2;
            const clickY = t.clientY - rect.top - rect.height / 2;
            // Translate opposite to click offset to bring that point to center
            setTranslateX(-clickX * 1.5);
            setTranslateY(-clickY * 1.5);
          }
        }
        // Reset last tap to avoid triple-tap loops
        lastTapRef.current = { time: 0, x: 0, y: 0 };
      } else {
        lastTapRef.current = { time: now, x: t.clientX, y: t.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      // Pinch zooming in progress
      if (e.cancelable) e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      
      const ratio = dist / initialPinchDistRef.current;
      let newScale = initialScaleRef.current * ratio;
      // Constraint scale between 0.8 and 4.5
      newScale = Math.min(4.5, Math.max(0.8, newScale));
      setScale(newScale);

    } else if (e.touches.length === 1 && touchStartRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;

      if (scale > 1.05) {
        // Panning when zoomed in
        if (e.cancelable) e.preventDefault();
        
        // Calculate max bounds for panning based on zoom level and screen size
        const maxPanX = Math.max(0, (scale - 1) * window.innerWidth / 2);
        const maxPanY = Math.max(0, (scale - 1) * window.innerHeight / 2);

        const targetX = initialTranslateRef.current.x + dx;
        const targetY = initialTranslateRef.current.y + dy;

        // Apply panning with boundary constraints
        setTranslateX(Math.min(maxPanX, Math.max(-maxPanX, targetX)));
        setTranslateY(Math.min(maxPanY, Math.max(-maxPanY, targetY)));
      } else {
        // Swiping to next/prev when not zoomed
        setSwipeOffset(dx);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsInteracting(false);
    initialPinchDistRef.current = null;
    touchStartRef.current = null;

    if (scale < 1.05) {
      // Reset scale if it went below 1
      setScale(1);
      setTranslateX(0);
      setTranslateY(0);

      // Handle swipe transition on release
      const threshold = 75;
      if (photos.length > 1) {
        if (swipeOffset > threshold) {
          // Swipe right -> Prev
          onChangeIndex(activeIndex > 0 ? activeIndex - 1 : photos.length - 1);
        } else if (swipeOffset < -threshold) {
          // Swipe left -> Next
          onChangeIndex(activeIndex < photos.length - 1 ? activeIndex + 1 : 0);
        }
      }
      setSwipeOffset(0);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(4.5, prev + 0.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) {
        setTranslateX(0);
        setTranslateY(0);
      }
      return next;
    });
  };

  const handleReset = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    setSwipeOffset(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[85] bg-black/98 flex flex-col items-center justify-between select-none"
      onClick={onClose}
    >
      {/* Top Bar Controls */}
      <div 
        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 z-90 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono text-xs text-[#8A8A8A] tracking-widest">
          {activeIndex + 1} / {photos.length}
        </span>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-95"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 4.5}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-95"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {scale > 1 && (
            <button
              onClick={handleReset}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95 animate-fade-in"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#CC0000] text-white transition-all duration-200 active:scale-95 hover:bg-[#E50000] ml-2"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage Container */}
      <div 
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // If clicked on the background container, close lightbox
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <AnimatePresence custom={slideDirection}>
          <motion.div
            key={activeIndex}
            custom={slideDirection}
            initial={(dir) => ({
              x: dir > 0 ? 100 : dir < 0 ? -100 : 0,
              opacity: 0,
              scale: 0.95
            })}
            style={{
              x: scale > 1 ? translateX : swipeOffset,
              y: scale > 1 ? translateY : 0,
              scale: scale,
            }}
            // Animate only if not currently dragging/pinching to prevent layout lags
            animate={isInteracting ? undefined : {
              x: scale > 1 ? translateX : 0,
              y: scale > 1 ? translateY : 0,
              scale: scale,
              opacity: 1,
            }}
            exit={(dir) => ({
              x: dir < 0 ? 100 : dir > 0 ? -100 : 0,
              opacity: 0,
              scale: 0.95
            })}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative max-w-full max-h-full flex items-center justify-center pointer-events-none min-h-[300px]"
          >
            {/* Dark background loading state with spinner */}
            {isImageLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0A0A0A]/90 backdrop-blur-xs rounded-sm z-10 pointer-events-none transition-opacity duration-300 min-w-[200px] min-h-[250px]">
                <Loader2 className="w-8 h-8 text-[#CC0000] animate-spin" />
                <span className="text-[10px] text-white/60 uppercase tracking-[0.2em] font-mono">
                  Cargando imagen...
                </span>
              </div>
            )}

            <img
              src={resolvePhoto(photos[activeIndex])}
              alt={`Photo ${activeIndex + 1}`}
              loading="eager"
              decoding="async"
              onLoad={() => setIsImageLoading(false)}
              onError={(e) => {
                setIsImageLoading(false);
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="100%" height="100%" fill="%231a1a1a"/><text x="50%" y="50%" font-family="sans-serif" font-size="15" font-weight="500" fill="%238a8a8a" text-anchor="middle" dominant-baseline="middle">Imagen no disponible</text></svg>';
              }}
              className={`max-w-[95vw] max-h-[75vh] md:max-h-[82vh] object-contain rounded-sm shadow-2xl transition-all duration-500 pointer-events-auto select-none ${
                isImageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
              style={{
                boxShadow: scale > 1 ? '0 25px 50px -12px rgba(0,0,0,0.8)' : '0 10px 30px -10px rgba(0,0,0,0.5)'
              }}
              draggable="false"
            />
          </motion.div>
        </AnimatePresence>

        {/* On-screen navigation chevrons for desktop/large viewports */}
        {photos.length > 1 && scale === 1 && (
          <>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onChangeIndex(activeIndex > 0 ? activeIndex - 1 : photos.length - 1);
              }}
              className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-[88] text-white/60 hover:text-white w-14 h-14 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 shadow-lg active:scale-90 transition-all duration-200"
              aria-label="Previous Photo"
            >
              <ChevronLeft className="w-8 h-8 stroke-[1.5]" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onChangeIndex(activeIndex < photos.length - 1 ? activeIndex + 1 : 0);
              }}
              className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-[88] text-white/60 hover:text-white w-14 h-14 items-center justify-center rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 shadow-lg active:scale-90 transition-all duration-200"
              aria-label="Next Photo"
            >
              <ChevronRight className="w-8 h-8 stroke-[1.5]" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Bar: Thumbnails Indicator (hidden on small landscape screens to maximize space) */}
      <div 
        className="w-full bg-gradient-to-t from-black/90 via-black/40 to-transparent py-6 px-4 flex flex-col items-center gap-4 z-90"
        onClick={(e) => e.stopPropagation()}
      >
        {photos.length > 1 && (
          <div className="flex gap-2 max-w-full overflow-x-auto px-4 pb-2 scrollbar-none snap-x snap-proximity justify-center">
            {photos.map((p, i) => (
              <button
                key={p}
                onClick={() => onChangeIndex(i)}
                className={`flex-shrink-0 w-12 h-16 sm:w-14 sm:h-20 border rounded-sm overflow-hidden transition-all duration-300 snap-center ${
                  i === activeIndex 
                    ? 'border-[#CC0000] scale-105 ring-2 ring-[#CC0000]/30 opacity-100' 
                    : 'border-white/10 opacity-40 hover:opacity-100 hover:border-white/30'
                }`}
              >
                <img 
                  src={resolvePhoto(p)} 
                  alt="" 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover" 
                  draggable="false" 
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="100%" height="100%" fill="%231a1a1a"/><text x="50%" y="50%" font-family="sans-serif" font-size="15" font-weight="500" fill="%238a8a8a" text-anchor="middle" dominant-baseline="middle">Imagen no disponible</text></svg>';
                  }} />
              </button>
            ))}
          </div>
        )}
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
