import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Instagram
} from 'lucide-react';
import { Model } from '../types';
import { resolvePhoto, resolveThumbnailPhoto, isModelFeatured } from '../App';

interface FeaturedModelsCoverflowProps {
  models: Model[];
  bookings?: any[];
  lang: 'es' | 'en';
  onSelectModel: (model: Model) => void;
  onBookModel?: (model: Model) => void;
}

const getInstagramInfo = (rawInsta?: string, lang: 'es' | 'en' = 'es') => {
  if (!rawInsta) return null;
  const parts = rawInsta.split('|');
  const handlePart = parts[0].trim();
  if (!handlePart) return null;
  const cleanHandle = handlePart.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
  if (!cleanHandle) return null;

  let followersFormatted: string | null = null;
  if (parts[1]) {
    const num = parseInt(parts[1].trim(), 10);
    if (!isNaN(num) && num > 0) {
      if (num >= 1000000) {
        followersFormatted = `${(num / 1000000).toFixed(1)}M`;
      } else if (num >= 1000) {
        followersFormatted = `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
      } else {
        followersFormatted = `${num}`;
      }
      followersFormatted += lang === 'es' ? ' seguidores' : ' followers';
    }
  }

  return {
    handle: `@${cleanHandle}`,
    url: `https://instagram.com/${cleanHandle}`,
    followers: followersFormatted
  };
};

export const FeaturedModelsCoverflow: React.FC<FeaturedModelsCoverflowProps> = ({
  models,
  bookings = [],
  lang,
  onSelectModel
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchDeltaX, setTouchDeltaX] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute the featured models:
  // 1. Manually marked as destacada === true (TOP PRIORITY: always shown at the top)
  // 2. High booking requests popularity
  // 3. High level / followers
  const featuredModels = useMemo(() => {
    // Only active models with at least one photo
    const activeModels = models.filter(m => m.disponible !== false && m.photos && m.photos.length > 0);
    if (activeModels.length === 0) return [];

    // Map each model with a priority score
    const scoredModels = activeModels.map(model => {
      let score = 0;
      const isFeatured = isModelFeatured(model);

      // Manual highlight priority from admin dashboard
      if (isFeatured) {
        score += 10000;
      }

      // Booking count priority
      if (bookings && bookings.length > 0) {
        const matchingBookings = bookings.filter(b => {
          const det = (b.detalles || '').toLowerCase();
          const fullName = `${model.nombre} ${model.apellidos}`.toLowerCase();
          const firstName = model.nombre.toLowerCase();
          return det.includes(fullName) || det.includes(firstName);
        });
        score += matchingBookings.length * 50;
      }

      // Instagram influence bonus
      if (model.instagram) {
        const parts = model.instagram.split('|');
        const followers = parseInt(parts[1], 10);
        if (!isNaN(followers)) {
          score += Math.min(followers / 1000, 40);
        }
      }

      // Height bonus for high-fashion editorial
      if (model.estatura && model.estatura >= 175) {
        score += 10;
      }

      return { model: { ...model, destacada: isFeatured }, score, isFeatured };
    });

    // Sort by score descending
    scoredModels.sort((a, b) => b.score - a.score);

    // Ensure all manually featured models are included, and fill up to 6 models total (or more if more are featured)
    const featuredCount = scoredModels.filter(item => item.isFeatured).length;
    const targetCount = Math.min(activeModels.length, Math.max(6, featuredCount));
    
    return scoredModels.slice(0, targetCount).map(item => item.model);
  }, [models, bookings]);

  const total = featuredModels.length;

  // Keep active index in range if models change
  useEffect(() => {
    if (activeIndex >= total && total > 0) {
      setActiveIndex(0);
    }
  }, [total, activeIndex]);

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex(prev => (prev === 0 ? total - 1 : prev - 1));
  }, [total]);

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex(prev => (prev === total - 1 ? 0 : prev + 1));
  }, [total]);

  // Auto-advance every 6 seconds if not hovered or touched
  useEffect(() => {
    if (isHovered || total <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [isHovered, total, handleNext]);

  // Preload adjacent cards (previous and next relative to active card) in background
  useEffect(() => {
    if (total <= 1) return;

    const prevIdx = activeIndex === 0 ? total - 1 : activeIndex - 1;
    const nextIdx = activeIndex === total - 1 ? 0 : activeIndex + 1;

    [prevIdx, nextIdx].forEach((idx) => {
      const adjacentModel = featuredModels[idx];
      if (adjacentModel?.photos?.[0]) {
        const thumbUrl = resolveThumbnailPhoto(adjacentModel.photos[0]);
        if (thumbUrl) {
          const img = new Image();
          img.decoding = 'async';
          img.src = thumbUrl;
        }
      }
    });
  }, [activeIndex, featuredModels, total]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    }
  };

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX !== null) {
      const delta = e.touches[0].clientX - touchStartX;
      setTouchDeltaX(delta);
    }
  };

  const handleTouchEnd = () => {
    if (touchStartX !== null) {
      if (touchDeltaX < -40) {
        handleNext();
      } else if (touchDeltaX > 40) {
        handlePrev();
      }
      setTouchStartX(null);
      setTouchDeltaX(0);
    }
  };

  if (total === 0) {
    return null;
  }

  return (
    <section 
      id="featured-models-coverflow-section" 
      aria-label={lang === 'es' ? 'Modelos Destacadas' : 'Featured Models'}
      className="relative w-full h-[100dvh] min-h-[100dvh] flex flex-col justify-between pt-16 sm:pt-20 pb-4 sm:pb-8 bg-gradient-to-b from-[#0A0A0A] via-[#0D0D0D] to-[#0A0A0A] border-t border-b border-white/5 overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[350px] bg-[#CC0000] opacity-[0.04] rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -top-24 left-1/4 w-72 h-72 bg-white/5 opacity-15 rounded-full blur-[90px] pointer-events-none"></div>
      
      {/* Header section with brand typography - Aparece primero al hacer scroll */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-12 shrink-0">
        <div className="flex flex-col items-start justify-center">
          {/* 'Selección Exclusiva' con la misma fuente y color que 'Catálogo Oficial' del hero */}
          <motion.div 
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 mb-2 sm:mb-2.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#CC0000] animate-pulse shrink-0"></span>
            <span className="font-sans font-medium text-[11px] sm:text-xs md:text-sm tracking-[0.2em] uppercase text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              {lang === 'es' ? 'Selección Exclusiva' : 'Exclusive Selection'}
            </span>
          </motion.div>
          
          {/* 'Modelos Destacadas' con tipografía font-condensed limpia */}
          <motion.h2 
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-baseline gap-2 sm:gap-3.5 select-none"
          >
            <span className="font-condensed text-3xl sm:text-5xl md:text-6xl text-white tracking-wider leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              {lang === 'es' ? 'Modelos' : 'Featured'}
            </span>
            <span className="font-condensed text-3xl sm:text-5xl md:text-6xl text-white tracking-wider leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              {lang === 'es' ? 'Destacadas' : 'Talents'}
            </span>
          </motion.h2>
        </div>
      </div>

      {/* Coverflow Stage - Aparece después del texto */}
      <motion.div 
        ref={containerRef}
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.05 }}
        transition={{ duration: 0.75, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-8 flex-1 flex items-center justify-center py-1 sm:py-2"
        style={{ perspective: '1200px' }}
      >
        {/* Subtle Carousel Nav Arrow - Left */}
        {total > 1 && (
          <button
            id="featured-prev-btn"
            onClick={handlePrev}
            aria-label={lang === 'es' ? 'Modelo anterior' : 'Previous model'}
            title={lang === 'es' ? 'Modelo anterior' : 'Previous model'}
            className="absolute left-1 sm:left-3 md:left-6 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/85 backdrop-blur-md border border-white/15 hover:border-white/40 text-white/70 hover:text-white flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer group active:scale-90"
          >
            <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 stroke-[1.5] transition-transform duration-300 group-hover:-translate-x-0.5" />
          </button>
        )}

        {/* Subtle Carousel Nav Arrow - Right */}
        {total > 1 && (
          <button
            id="featured-next-btn"
            onClick={handleNext}
            aria-label={lang === 'es' ? 'Siguiente modelo' : 'Next model'}
            title={lang === 'es' ? 'Siguiente modelo' : 'Next model'}
            className="absolute right-1 sm:right-3 md:right-6 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/85 backdrop-blur-md border border-white/15 hover:border-white/40 text-white/70 hover:text-white flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer group active:scale-90"
          >
            <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 stroke-[1.5] transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        )}

        <div className="relative w-full h-[380px] xs:h-[420px] sm:h-[500px] md:h-[540px] flex items-center justify-center">
          {featuredModels.map((model, idx) => {
            // Calculate circular offset distance (-2, -1, 0, 1, 2, etc.)
            let offset = idx - activeIndex;
            while (offset > total / 2) offset -= total;
            while (offset < -total / 2) offset += total;

            const isCenter = offset === 0;
            const isImmediate = Math.abs(offset) === 1;
            const isVisible = Math.abs(offset) <= 2;

            // Use lightweight thumbnail (600px WebP) rather than full 1200x1600
            const firstPhoto = model.photos && model.photos[0] ? resolveThumbnailPhoto(model.photos[0]) : null;

            // Compute synchronized 3D translations, scale, rotation and opacity
            let translateX = 0;
            let scale = 1;
            let opacity = 1;
            let zIndex = 30;
            let rotateY = 0;

            if (isCenter) {
              translateX = 0;
              scale = 1.04;
              opacity = 1;
              zIndex = 30;
              rotateY = 0;
            } else if (offset === -1) {
              translateX = -62;
              scale = 0.86;
              opacity = 0.5;
              zIndex = 20;
              rotateY = 16;
            } else if (offset === 1) {
              translateX = 62;
              scale = 0.86;
              opacity = 0.5;
              zIndex = 20;
              rotateY = -16;
            } else if (offset === -2) {
              translateX = -105;
              scale = 0.72;
              opacity = 0.2;
              zIndex = 10;
              rotateY = 28;
            } else if (offset === 2) {
              translateX = 105;
              scale = 0.72;
              opacity = 0.2;
              zIndex = 10;
              rotateY = -28;
            } else {
              // Off-screen buffer cards: smoothly fade out and hide without snapping across
              translateX = offset < 0 ? -140 : 140;
              scale = 0.6;
              opacity = 0;
              zIndex = 0;
              rotateY = offset < 0 ? 35 : -35;
            }

            const fullName = `${model.nombre} ${model.apellidos}`;
            const isLongName = fullName.length > 22;
            const instaInfo = getInstagramInfo(model.instagram, lang);

            return (
              <motion.div
                key={model.id}
                id={`featured-card-${model.id}`}
                animate={{
                  x: `${translateX}%`,
                  scale,
                  opacity,
                  rotateY,
                  zIndex
                }}
                transition={{
                  duration: 0.65,
                  ease: [0.22, 1, 0.36, 1]
                }}
                onClick={() => {
                  if (isCenter) {
                    onSelectModel(model);
                  } else {
                    setActiveIndex(idx);
                  }
                }}
                title={
                  isCenter 
                    ? (lang === 'es' ? `Ver ficha completa de ${fullName}` : `View full portfolio of ${fullName}`)
                    : (lang === 'es' ? `Centrar a ${fullName}` : `Center ${fullName}`)
                }
                className={`group absolute w-[250px] xs:w-[280px] sm:w-[320px] md:w-[350px] h-[360px] xs:h-[400px] sm:h-[460px] md:h-[500px] rounded-2xl overflow-hidden cursor-pointer ${
                  isVisible ? 'will-change-transform' : ''
                } ${
                  isCenter 
                    ? 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(204,0,0,0.28)] border border-white/25 hover:border-white/45' 
                    : 'shadow-2xl border border-white/10 hover:border-white/25'
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  pointerEvents: opacity > 0.05 ? 'auto' : 'none'
                }}
              >
                {/* Image Background */}
                <div className="absolute inset-0 bg-[#121212] overflow-hidden">
                  {firstPhoto ? (
                    <img
                      src={firstPhoto}
                      alt={fullName}
                      referrerPolicy="no-referrer"
                      loading={isImmediate || isCenter ? "eager" : "lazy"}
                      decoding="async"
                      className={`w-full h-full object-cover origin-center ${
                        isCenter ? 'scale-100 group-hover:scale-105 transition-transform duration-500 ease-out' : 'scale-105'
                      }`}
                      onError={(e) => {
                        const img = e.currentTarget;
                        const fallbackUrl = model.photos?.[0] ? resolvePhoto(model.photos[0]) : undefined;
                        if (fallbackUrl && img.dataset.fallbackTried !== '1' && img.src !== fallbackUrl) {
                          img.dataset.fallbackTried = '1';
                          img.src = fallbackUrl;
                        } else {
                          img.style.display = 'none';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#181818] text-[#8A8A8A] font-serif text-3xl">
                      {model.nombre[0]}
                    </div>
                  )}

                  {/* Gradient Overlays for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent opacity-80"></div>
                </div>

                {/* Top Right Info Bar - Clickable Instagram Link */}
                {instaInfo && (
                  <a
                    href={instaInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title={`Abrir perfil de Instagram: ${instaInfo.handle}`}
                    className={`absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-30 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono tracking-tight backdrop-blur-md border transition-transform duration-200 hover:scale-105 active:scale-95 group/insta cursor-pointer ${
                      isCenter
                        ? 'bg-black/75 hover:bg-black/90 border-white/20 hover:border-white/40 text-white shadow-lg'
                        : 'bg-black/50 border-white/10 text-neutral-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Instagram className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
                      isCenter ? 'text-[#8A8A8A] group-hover/insta:text-white' : 'text-neutral-400'
                    }`} />
                    <span className={`underline underline-offset-2 decoration-white/30 group-hover/insta:decoration-white ${
                      isCenter ? 'text-[#F8F6F2] group-hover/insta:text-white' : 'text-neutral-300'
                    }`}>
                      {instaInfo.handle}
                    </span>
                  </a>
                )}

                {/* Bottom Model Name Container */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 z-10 flex flex-col justify-end">
                  <h3 className="flex flex-col items-start drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]">
                    {/* Línea 1: Nombre(s) en tipografía brush bold */}
                    <span className={`font-brush font-bold text-white tracking-wide leading-tight drop-shadow-md block ${
                      isLongName 
                        ? 'text-xl sm:text-2xl md:text-[28px]' 
                        : 'text-2xl sm:text-3xl md:text-[34px]'
                    }`}>
                      {model.nombre}
                    </span>
                    {/* Línea 2: Apellidos en tipografía condensada en color blanco */}
                    <span className={`font-condensed tracking-wider uppercase leading-none transition-colors duration-300 block -mt-0.5 sm:-mt-1 ${
                      isLongName 
                        ? 'text-xl sm:text-2xl md:text-[30px]' 
                        : 'text-2xl sm:text-3xl md:text-[36px]'
                    } ${
                      isCenter ? 'text-[#F8F6F2]' : 'text-neutral-400'
                    }`}>
                      {model.apellidos}
                    </span>
                  </h3>

                  {/* Followers Count Badge */}
                  {instaInfo?.followers && (
                    <div className="mt-1.5 sm:mt-2 flex items-center">
                      <div className={`inline-flex items-center text-[10px] sm:text-xs font-mono backdrop-blur-md px-2.5 sm:px-3 py-0.5 rounded-full border shadow-sm ${
                        isCenter
                          ? 'bg-black/60 text-neutral-200 border-white/15'
                          : 'bg-black/40 text-neutral-400 border-white/10'
                      }`}>
                        <span className={isCenter ? 'font-medium text-[#F8F6F2]' : 'text-neutral-400'}>
                          {instaInfo.followers}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Bottom Dots / Pagination Navigator */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-12 mt-2 sm:mt-6 shrink-0 flex items-center justify-center gap-2.5 pb-1"
      >
        {featuredModels.map((m, idx) => (
          <button
            key={m.id}
            onClick={() => setActiveIndex(idx)}
            aria-label={`Ir a ${m.nombre} ${m.apellidos}`}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              idx === activeIndex
                ? 'w-8 sm:w-10 h-1.5 bg-[#F8F6F2] shadow-[0_0_8px_rgba(248,246,242,0.4)]'
                : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/50'
            }`}
          />
        ))}
      </motion.div>
    </section>
  );
};

