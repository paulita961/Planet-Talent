/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup, useScroll, useTransform, useMotionValue, useSpring } from 'motion/react';
import { 
  Instagram, 
  Search, 
  Heart, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  SlidersHorizontal, 
  Copy, 
  Check, 
  Sparkles, 
  Calendar, 
  Mail, 
  User, 
  Building,
  CheckCircle2,
  ArrowUpDown,
  Lock,
  Loader2,
  Phone,
  ArrowUp,
  Compass,
  FileDown,
  Share2,
  RefreshCw,
  Download,
  Crown,
  Flame,
  Star,
  Award,
  Users,
  Info,
  Zap,
  HelpCircle,
  Globe
} from 'lucide-react';
import { supabase, getCachedModels, getCachedBookings, invalidateModelsCache, invalidateBookingsCache } from './lib/supabase';
import { Model } from './types';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TouchLightbox } from './components/TouchLightbox';
import { CourseLanding } from './components/CourseLanding';
import { FeaturedModelsCoverflow } from './components/FeaturedModelsCoverflow';
import { Toaster, toast } from 'sonner';
import { getOptimizedPhotoUrl } from './lib/imageOptimizer';

// FOTOS EN BASE64 PROPORCIONADAS
export const PHOTO_DATA: Record<string, string> = {
  "cristal_pool_yellow": "/photo_2026-07-08_11-26-18.jpg",
  "cristal_pool_face": "/photo_2026-07-08_11-26-15.jpg",
  "cristal_pool_brown_top": "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80",
  "cristal_red_dress": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
  "cristal_bw_pool": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80"
};

export const resolvePhoto = (photoVal: string | undefined | null): string | undefined => {
  if (!photoVal) return undefined;
  if (photoVal.startsWith('data:') || photoVal.startsWith('http') || photoVal.startsWith('/')) {
    return getOptimizedPhotoUrl(photoVal);
  }
  const mapped = PHOTO_DATA[photoVal];
  return mapped ? getOptimizedPhotoUrl(mapped) : undefined;
};

export const formatUpdatedAgo = (dateStr: string | undefined | null, lang: 'es' | 'en'): string => {
  if (!dateStr) return lang === 'es' ? 'Sin datos' : 'No data';
  const updatedDate = new Date(dateStr);
  if (isNaN(updatedDate.getTime())) return lang === 'es' ? 'Sin datos' : 'No data';
  
  const diffTime = Math.abs(new Date().getTime() - updatedDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays === 0) return lang === 'es' ? 'Actualizado hoy' : 'Updated today';
  if (diffDays === 1) return lang === 'es' ? 'Actualizado hace 1 día' : 'Updated 1 day ago';
  return lang === 'es' ? `Actualizado hace ${diffDays} días` : `Updated ${diffDays} days ago`;
};

export const calculateAge = (birthdayStr: string | null | undefined): number | null => {
  if (!birthdayStr) return null;
  const birthDate = new Date(birthdayStr);
  if (isNaN(birthDate.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const formatFollowersDisplay = (instagramStr: string | undefined | null): string => {
  const num = getModelFollowerCount(instagramStr);
  if (num === null) return "";
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toString();
};

export const getModelFollowerCount = (instagramStr: string | undefined | null): number | null => {
  if (!instagramStr) return null;
  const parts = instagramStr.split('|');
  const followersStr = parts[1];
  if (!followersStr || followersStr.trim() === '') return null;
  
  let clean = followersStr.toLowerCase().trim().replace(/\s+/g, '');
  
  let num = 0;
  if (clean.includes('k')) {
    const val = parseFloat(clean.replace('k', '').replace(',', '.'));
    if (!isNaN(val)) num = val * 1000;
  } else if (clean.includes('m')) {
    const val = parseFloat(clean.replace('m', '').replace(',', '.'));
    if (!isNaN(val)) num = val * 1000000;
  } else if (clean.includes('mil')) {
    const val = parseFloat(clean.replace('mil', '').replace(',', '.'));
    if (!isNaN(val)) num = val * 1000;
  } else {
    if (/[,.]\d{3}$/.test(clean)) {
      clean = clean.replace(/[,.]/, '');
    } else {
      clean = clean.replace(',', '.');
    }
    const val = parseFloat(clean);
    if (!isNaN(val)) num = val;
  }
  return num;
};

export const getModelLevel = (instagramStr: string | undefined | null): string => {
  const num = getModelFollowerCount(instagramStr);
  if (num === null) return '';
  if (num >= 100000) {
    return 'Influencer premium';
  } else if (num >= 50000) {
    return 'Macro influencer';
  } else if (num >= 15000) {
    return 'Mid Influencer';
  } else if (num >= 10000) {
    return 'Micro influencer';
  }
  return '';
};

export const getLevelConfig = (level: string) => {
  if (!level) return null;
  const normalized = level.toLowerCase().trim();
  if (normalized.includes('premium')) {
    return {
      label: 'Influencer Premium',
      shortLabel: 'Premium',
      rangeTag: '100K+',
      range: '+100,000 seguidores',
      icon: Crown,
      bgClass: 'bg-[#181204]/90 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      dotClass: 'bg-amber-400',
    };
  }
  if (normalized.includes('macro')) {
    return {
      label: 'Macro Influencer',
      shortLabel: 'Macro',
      rangeTag: '50K+',
      range: '50,000 - 99,999 seguidores',
      icon: Sparkles,
      bgClass: 'bg-[#140a1d]/90 text-purple-300 border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
      dotClass: 'bg-purple-400',
    };
  }
  if (normalized.includes('mid')) {
    return {
      label: 'Mid Influencer',
      shortLabel: 'Mid',
      rangeTag: '15K+',
      range: '15,000 - 49,999 seguidores',
      icon: Star,
      bgClass: 'bg-[#08151d]/90 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]',
      dotClass: 'bg-cyan-400',
    };
  }
  if (normalized.includes('micro')) {
    return {
      label: 'Micro Influencer',
      shortLabel: 'Micro',
      rangeTag: '10K+',
      range: '10,000 - 14,999 seguidores',
      icon: Users,
      bgClass: 'bg-[#061811]/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      dotClass: 'bg-emerald-400',
    };
  }
  return null;
};


export const handleModelImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="100%" height="100%" fill="%231a1a1a"/><text x="50%" y="50%" font-family="sans-serif" font-size="15" font-weight="500" fill="%238a8a8a" text-anchor="middle" dominant-baseline="middle">Imagen no disponible</text></svg>';
};

export const ProgressiveImage = ({ src, alt, className, onError }: { src: string, alt: string, className: string, onError?: React.ReactEventHandler<HTMLImageElement> }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#161616]">
      {!loaded && <div className="absolute inset-0 w-full h-full animate-pulse bg-white/5" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          handleModelImageError(e);
          if (onError) onError(e);
        }}
        className={`${className} transition-opacity duration-[1200ms] ease-out ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};
export const ModelLevelBadge: React.FC<{ 
  level: string; 
  size?: 'xs' | 'sm' | 'md'; 
  showShort?: boolean;
  iconOnly?: boolean;
  className?: string;
}> = ({ level, size = 'xs', showShort = false, iconOnly = false, className = '' }) => {
  const config = getLevelConfig(level);
  if (!config) return null;
  const Icon = config.icon;

  const tooltipText = `${config.label} (${config.range})`;

  if (iconOnly) {
    const sizeClasses = {
      xs: 'text-[8px] sm:text-[9px] px-2 py-0.5 gap-1 font-semibold',
      sm: 'text-[9px] sm:text-[10px] px-2.5 py-1 gap-1.5 font-semibold',
      md: 'text-[10px] sm:text-xs px-3 py-1.5 gap-1.5 font-bold'
    }[size];

    const iconSizes = {
      xs: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
      sm: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
      md: 'w-3.5 h-3.5 sm:w-4 sm:h-4'
    }[size];

    return (
      <span 
        title={tooltipText}
        className={`inline-flex items-center tracking-wider uppercase backdrop-blur-md border rounded-full transition-all duration-300 cursor-help ${config.bgClass} ${sizeClasses} ${className}`}
      >
        <Icon className={`${iconSizes} shrink-0`} />
        <span className="font-mono font-bold tracking-tight text-[9px]">{config.rangeTag}</span>
      </span>
    );
  }

  const sizeClasses = {
    xs: 'text-[8px] sm:text-[9px] px-2.5 py-0.5 gap-1.5 font-semibold',
    sm: 'text-[9px] sm:text-[10px] px-3 py-1 gap-1.5 font-semibold',
    md: 'text-[10px] sm:text-xs px-3.5 py-1.5 gap-2 font-bold'
  }[size];

  const iconSizes = {
    xs: 'w-2.5 h-2.5 sm:w-3 sm:h-3',
    sm: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
    md: 'w-3.5 h-3.5 sm:w-4 sm:h-4'
  }[size];

  return (
    <span 
      title={tooltipText}
      className={`inline-flex items-center tracking-wider uppercase backdrop-blur-md border rounded-full transition-all duration-300 cursor-help ${config.bgClass} ${sizeClasses} ${className}`}
    >
      <Icon className={`${iconSizes} shrink-0`} />
      <span>{showShort ? config.shortLabel : config.label}</span>
    </span>
  );
};

export const formatDate = (dateStr: string | null | undefined, lang: 'es' | 'en'): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (lang === 'es') {
      return `${day}/${month}/${year}`;
    } else {
      return `${month}/${day}/${year}`;
    }
  }
  return dateStr;
};

export const INITIAL_ROSTER_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);

export const isModelFeatured = (model: Model | null | undefined): boolean => {
  if (!model) return false;
  if (model.destacada === true) return true;
  if (model.instagram && typeof model.instagram === 'string') {
    const parts = model.instagram.split('|');
    return parts[5] === 'featured' || parts.includes('featured');
  }
  return false;
};

export const isModelNew = (model: Model | null | undefined): boolean => {
  if (!model) return false;
  // Las 17 modelos iniciales del catálogo base no muestran el badge 'NUEVA'
  if (typeof model.id === 'number' && model.id <= 17) return false;
  
  if (model.created_at) {
    const createdTime = new Date(model.created_at).getTime();
    if (!isNaN(createdTime)) {
      const diffDays = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }
  }
  // Si es un modelo nuevo recién creado en sesión actual (id > 17) sin timestamp de DB aún
  if (typeof model.id === 'number' && model.id > 17 && !model.created_at) {
    return true;
  }
  return false;
};

export const NewModelRibbon: React.FC<{ lang: 'es' | 'en'; className?: string }> = ({ lang, className = '' }) => {
  return (
    <div 
      className={`absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none z-15 ${className}`}
      aria-label={lang === 'es' ? 'Nueva modelo registrada recientemente' : 'Newly registered model'}
    >
      <div 
        className="absolute top-3.5 -right-8 w-28 rotate-45 bg-gradient-to-r from-[#B45309] via-[#F59E0B] to-[#D97706] text-stone-950 font-black text-[7.5px] sm:text-[8px] tracking-[0.22em] uppercase py-0.5 text-center shadow-[0_2px_8px_rgba(0,0,0,0.8),0_0_12px_rgba(245,158,11,0.4)] border-y border-amber-200/60 select-none"
      >
        {lang === 'es' ? 'NUEVA' : 'NEW'}
      </div>
    </div>
  );
};

const MODELS: Model[] = [
  { id: 1, nombre: "Cristal", apellidos: "López Fajardo", instagram: "@cristal.lf", edad: 19, ojos: "Cafés", piel: "Blanca", estatura: 175, busto: 85, cintura: 68, caderas: 91, calzado: "38", photos: ["cristal_pool_yellow", "cristal_pool_face", "cristal_pool_brown_top", "cristal_red_dress", "cristal_bw_pool"] },
  { id: 2, nombre: "Nahomy", apellidos: "Sarmiento González", instagram: "@_nahomysarmiento", edad: 21, ojos: "Cafés", piel: "Blanca", estatura: 175, busto: 85, cintura: 70, caderas: 96, calzado: "39-40", photos: [] },
  { id: 3, nombre: "Lázara Dailanys", apellidos: "Chavez Delgado", instagram: "@hangelh_", age: 21, ojos: "Verdes", piel: "Blanca", estatura: 165, busto: 86, cintura: 63, caderas: 89, calzado: "37.5", photos: [] } as unknown as Model, // adjust according to original age key typo if any
  { id: 4, nombre: "Anyislei", apellidos: "Ramirez Rivera", instagram: "@anyisleiramirez", edad: 26, ojos: "Negros", piel: "Negra", estatura: 170, busto: 79, cintura: 59, caderas: 84, calzado: "37", photos: [] },
  { id: 5, nombre: "Andrea", apellidos: "Heredia Hernández", instagram: "@andrea_barroco", edad: 27, ojos: "Avellana", piel: "Mulata", estatura: 170, busto: 83, cintura: 68, caderas: 88, calzado: "39-40", photos: [] },
  { id: 6, nombre: "Iris", apellidos: "Santiesteban Mulet", instagram: "@santiesteban_04", edad: 20, ojos: "Verdes", piel: "Blanca", estatura: 173, busto: 79, cintura: 60, caderas: 85, calzado: "38-39", photos: [] },
  { id: 7, nombre: "Karla", apellidos: "Hernández Cumplido", instagram: "@barbiedecuba", edad: 25, ojos: "Cafés", piel: "Mestiza", estatura: 165, busto: 74, cintura: 58, caderas: 80, calzado: "36", photos: [] },
  { id: 8, nombre: "Karolina", apellidos: "Zayas Gómez", instagram: "@_caro_zafiro", edad: 22, ojos: "Cafés", piel: "Mestiza", estatura: 175, busto: 83, cintura: 66, caderas: 87, calzado: "40-41", photos: [] },
  { id: 9, nombre: "Sheyle Maria", apellidos: "Morales Pita", instagram: "@shell_mraless", edad: 19, ojos: "Cafés", piel: "Mestiza", estatura: 168, busto: 76, cintura: 61, caderas: 94, calzado: "38", photos: [] },
  { id: 10, nombre: "Maureen", apellidos: "Fustier Santiesteban", instagram: "@mau_fustier", edad: 22, ojos: "Grises", piel: "Blanca", estatura: 176, busto: 81, cintura: 66, caderas: 97, calzado: "38", photos: [] },
  { id: 11, nombre: "Ana Maura", apellidos: "González Castillo", instagram: "@azzucar_morena_", edad: 24, ojos: "Negros", piel: "Negra", estatura: 170, busto: 85, cintura: 60, caderas: 85, calzado: "39-40", photos: [] },
  { id: 12, nombre: "Jennifer", apellidos: "Moreno Pacheco", instagram: "@fitkitsune._.uwu", edad: 25, ojos: "Cafés", piel: "Blanca", estatura: 175, busto: 87, cintura: 69, caderas: 95, calzado: "38.5", photos: [] },
  { id: 13, nombre: "Meliza", apellidos: "González Eduardo", instagram: "@_mel_gi_", edad: 25, ojos: "Negros", piel: "Negra", estatura: 162, busto: 88, cintura: 68, caderas: 92, calzado: "38", photos: [] },
  { id: 14, nombre: "Amanda", apellidos: "Piquero Zambrano", instagram: "@artinayyy", edad: 24, ojos: "Cafés", piel: "Mestiza", estatura: 175, busto: 85, cintura: 70, caderas: 85, calzado: "40", photos: [] },
  { id: 15, nombre: "Yeni", apellidos: "Cánovas Cartaya", instagram: "@la_nena_canovas", edad: 25, ojos: "Cafés", piel: "Blanca", estatura: 168, busto: 84, cintura: 68, caderas: 92, calzado: "38", photos: [] },
  { id: 16, nombre: "Yanisleydi", apellidos: "Ulacia Mustelier", instagram: "@frodita_a", edad: 25, ojos: "Negros", piel: "Negra", estatura: 174, busto: 76, cintura: 66, caderas: 80, calzado: "40-41", photos: [] },
  { id: 17, nombre: "Alexandra Maria", apellidos: "Ponsoda Barceló", instagram: "@xandra_ponsoda", edad: 18, ojos: "Cafés", piel: "Blanca", estatura: 175, busto: null, cintura: null, caderas: null, calzado: "39-40", photos: [] }
].map(item => {
  // Correct any structure variations
  return {
    ...item,
    edad: item.edad || (item as any).age || 21
  };
});

const playBookingNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First note (warm, high chime - E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Second note (brighter, ringing chime - B5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, ctx.currentTime + 0.12); // B5
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.8);
  } catch (err) {
    console.warn('Audio Context is blocked or not supported yet:', err);
  }
};

const TRANSLATIONS = {
  es: {
    agency: 'Agencia de Modelos',
    mySelection: 'Mi Selección',
    bookEditorial: 'PLANET TALENT · AGENCIA DE MODELOS',
    our: 'Nuestras',
    models: 'Modelos',
    officialCatalog: 'Catálogo Oficial · 2026',
    explore: 'Explorar',
    filterBy: 'Filtrar por piel o estatura',
    clearAll: 'Borrar filtros',
    all: 'Todas',
    whiteSkin: 'Piel Blanca',
    blackSkin: 'Piel Negra',
    mestizaSkin: 'Mestiza',
    mulataSkin: 'Mulata',
    heightTag: 'Estatura (175cm+)',
    searchPlaceholder: 'Buscar modelo...',
    sortDefault: 'Orden por defecto',
    sortLevel: 'Nivel (Mayor a menor)',
    sortName: 'Nombre (A-Z)',
    sortHeight: 'Estatura (Mayor a menor)',
    sortAge: 'Edad (Menor a mayor)',
    shortlistTitle: 'Mi Selección de Casting',
    shortlistDesc: (count: number) => `Tienes ${count} modelo${count !== 1 ? 's' : ''} seleccionada${count !== 1 ? 's' : ''} para tu propuesta.`,
    copySelection: 'Copiar Selección',
    copiedSelection: '¡Copiado!',
    bookGroup: 'Solicitar Booking Grupal',
    downloadSelectionPDF: 'Descargar PDF de mi selección',
    availableModels: 'Nuestras Modelos',
    savedSelection: 'Mi Selección Guardada',
    modelCount: (count: number) => `${count} modelo${count !== 1 ? 's' : ''}`,
    noModelsFound: 'No se encontraron modelos',
    noModelsDesc: 'Prueba ajustando los filtros o borrando la búsqueda para encontrar el perfil que necesitas.',
    viewAllBtn: 'Ver Todas las Modelos',
    bookInPrep: 'Book en preparación',
    age: 'Edad',
    birthday: 'Fecha de Nacimiento',
    modelLevel: 'Nivel de la Modelo',
    years: (num: number) => `${num} años`,
    yearsAbbr: (num: number) => `${num} a.`,
    height: 'Estatura',
    eyes: 'Ojos',
    skinTone: 'Tono de Piel',
    eyeColor: 'Color de Ojos',
    shoeSize: 'Talla de Calzado',
    busto: 'Busto',
    cintura: 'Cintura',
    caderas: 'Caderas',
    removeFav: 'Quitar de mi Selección',
    addFav: 'Añadir a mi Selección',
    requestBooking: 'Solicitar Booking',
    techSheet: 'Perfil Profesional',
    similarModels: 'Modelos Similares',
    prepPortfolio: 'Portafolio en Preparación',
    prepPortfolioDesc: 'Próximamente disponible el book de fotos profesionales en exteriores.',
    bookingForm: 'Formulario de Booking',
    castingRequest: 'Solicitud de Casting',
    fullName: 'Nombre Completo',
    fullNamePlaceholder: 'Ingresa tu nombre',
    email: 'Correo Electrónico',
    emailPlaceholder: 'tu@correo.com',
    phone: 'Teléfono o WhatsApp',
    phonePlaceholder: 'Ej: +53 5 000 0000',
    company: 'Empresa o Productora',
    companyPlaceholder: 'Nombre comercial',
    eventDate: 'Fecha del Evento',
    projectDetails: 'Detalles del Proyecto',
    projectPlaceholder: 'Indica el tipo de producción (editorial de moda, desfile, comercial, etc.)',
    sendRequest: 'Enviar Solicitud de Booking',
    sending: 'Enviando...',
    requestSent: 'Solicitud Enviada',
    requestSentDesc: 'Hemos recibido tus requerimientos de casting. Un agente de booking se pondrá en contacto contigo en las próximas 24 horas.',
    footerText: `© ${new Date().getFullYear()} Planet Talent. Todos los derechos reservados.`,
    bookingMsgSingle: (name: string, ig?: string) => `Hola, me gustaría solicitar presupuesto e información sobre disponibilidad para la modelo ${name}.`,
    bookingMsgGroup: (names: string) => `Hola, me gustaría solicitar presupuesto e información sobre disponibilidad para la selección de las siguientes modelos:\n\n${names}`,
    copiedClipboard: 'Mi selección de modelos de Planet Talent:\n\n',
    managerAccess: 'Acceso Manager',
    password: 'Contraseña',
    passwordPlaceholder: 'Tu contraseña',
    enterPanel: 'Acceder al Panel',
    invalidCreds: 'Credenciales inválidas (Fase 1)',
    cmsSubtitle: 'Panel de Administración',
    followers: 'Seguidores de Instagram',
    loadingCatalog: 'Cargando catálogo oficial...',
    loadingFromDb: 'Conectando con la base de datos de modelos...',
    addedToFavorites: 'Añadido a favoritos',
    removedFromFavorites: 'Eliminado de favoritos',
    viewExtendedProfile: 'Ver Perfil Extendido',
    styleAnalysis: 'Análisis de Estilo',
    close: 'Cerrar',
    aestheticVibe: 'Vibra Estética',
    colorPalette: 'Paleta Cromática (Instagram)',
    recommendedFor: 'Casting Recomendado',
    styleKeywords: 'Etiquetas de Estilo',
    agentNotes: 'Notas del Agente',
    agentNotesDesc: 'Presenta una presencia escénica y actitud excepcional ante la cámara. Altamente profesional en sesiones, con adaptabilidad para proyectos editoriales, comerciales y de moda de alto nivel.',
    advancedFilters: 'Filtros Avanzados',
    hideFilters: 'Ocultar Filtros',
    showFilters: 'Filtros Avanzados',
    filterBySkin: 'Tono de Piel',
    filterByEyes: 'Color de Ojos',
    filterByHeight: 'Estatura',
    filterByAge: 'Edad',
    filterByShoes: 'Talla de Calzado',
    minHeightLabel: 'Mín',
    maxHeightLabel: 'Máx',
    minAgeLabel: 'Mín',
    maxAgeLabel: 'Máx',
    resetFilters: 'Limpiar Filtros',
    allSkins: 'Todos',
    allEyes: 'Todos',
    allShoes: 'Todas',
    matchingModels: 'Coincidencias'
  },
  en: {
    agency: 'Model Agency',
    mySelection: 'My Selection',
    bookEditorial: 'PLANET TALENT · MODEL AGENCY',
    our: 'Our',
    models: 'Models',
    officialCatalog: 'Official Catalog · 2026',
    explore: 'Explore',
    filterBy: 'Filter by skin tone or height',
    clearAll: 'Clear all',
    all: 'All',
    whiteSkin: 'White Skin',
    blackSkin: 'Black Skin',
    mestizaSkin: 'Mestiza',
    mulataSkin: 'Mulata',
    heightTag: 'Height (175cm+)',
    searchPlaceholder: 'Search model...',
    sortDefault: 'Default order',
    sortLevel: 'Level (Highest to lowest)',
    sortName: 'Name (A-Z)',
    sortHeight: 'Height (Max to Min)',
    sortAge: 'Age (Min to Max)',
    shortlistTitle: 'My Casting Selection',
    shortlistDesc: (count: number) => `You have ${count} model${count !== 1 ? 's' : ''} selected for your proposal.`,
    copySelection: 'Copy Selection',
    copiedSelection: 'Copied!',
    bookGroup: 'Book Group',
    downloadSelectionPDF: 'Download Selection PDF',
    availableModels: 'Our Models',
    savedSelection: 'My Saved Selection',
    modelCount: (count: number) => `${count} model${count !== 1 ? 's' : ''}`,
    noModelsFound: 'No models found',
    noModelsDesc: 'Try adjusting the filters or clearing the search to find the profile you need.',
    viewAllBtn: 'View All Models',
    bookInPrep: 'Book in preparation',
    age: 'Age',
    birthday: 'Date of Birth',
    modelLevel: 'Model Level',
    years: (num: number) => `${num} years old`,
    yearsAbbr: (num: number) => `${num} y.o.`,
    height: 'Height',
    eyes: 'Eyes',
    skinTone: 'Skin Tone',
    eyeColor: 'Eye Color',
    shoeSize: 'Shoe Size',
    busto: 'Bust',
    cintura: 'Waist',
    caderas: 'Hips',
    removeFav: 'Remove from Selection',
    addFav: 'Add to Selection',
    requestBooking: 'Request Booking',
    techSheet: 'Professional Profile',
    similarModels: 'Similar Models',
    prepPortfolio: 'Portfolio in Preparation',
    prepPortfolioDesc: 'Professional outdoor photo book available soon.',
    bookingForm: 'Booking Form',
    castingRequest: 'Casting Request',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your name',
    email: 'Email Address',
    emailPlaceholder: 'you@example.com',
    phone: 'Phone or WhatsApp',
    phonePlaceholder: 'e.g. +1 (555) 000-0000',
    company: 'Company or Production',
    companyPlaceholder: 'Business name',
    eventDate: 'Event Date',
    projectDetails: 'Project Details',
    projectPlaceholder: 'Indicate type of production (fashion editorial, runway show, commercial, etc.)',
    sendRequest: 'Send Booking Request',
    sending: 'Sending...',
    requestSent: 'Request Sent',
    requestSentDesc: 'We have received your casting requirements. A booking agent will contact you within the next 24 hours.',
    footerText: `© ${new Date().getFullYear()} Planet Talent. All rights reserved.`,
    bookingMsgSingle: (name: string, ig?: string) => `Hello, I would like to request a quote and availability information for model ${name}.`,
    bookingMsgGroup: (names: string) => `Hello, I would like to request a quote and availability information for the selection of the following models:\n\n${names}`,
    copiedClipboard: 'My model selection from Planet Talent:\n\n',
    managerAccess: 'Manager Login',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    enterPanel: 'Enter Panel',
    invalidCreds: 'Invalid credentials (Phase 1)',
    cmsSubtitle: 'CMS Dashboard',
    followers: 'Instagram Followers',
    loadingCatalog: 'Loading official catalog...',
    loadingFromDb: 'Connecting to models database...',
    addedToFavorites: 'Added to favorites',
    removedFromFavorites: 'Removed from favorites',
    viewExtendedProfile: 'View Extended Profile',
    styleAnalysis: 'Style Analysis',
    close: 'Close',
    aestheticVibe: 'Aesthetic Vibe',
    colorPalette: 'Chromatic Palette (Instagram)',
    recommendedFor: 'Recommended Casting Focus',
    styleKeywords: 'Style Keywords',
    agentNotes: 'Agent Notes',
    agentNotesDesc: 'Presents an exceptional stage presence and camera attitude. Highly professional in shoots, with superb versatility for editorial, commercial, and luxury fashion projects.',
    advancedFilters: 'Advanced Filters',
    hideFilters: 'Hide Filters',
    showFilters: 'Advanced Filters',
    filterBySkin: 'Skin Tone',
    filterByEyes: 'Eye Color',
    filterByHeight: 'Height',
    filterByAge: 'Age',
    filterByShoes: 'Shoe Size',
    minHeightLabel: 'Min',
    maxHeightLabel: 'Max',
    minAgeLabel: 'Min',
    maxAgeLabel: 'Max',
    resetFilters: 'Clear Filters',
    allSkins: 'All',
    allEyes: 'All',
    allShoes: 'All',
    matchingModels: 'Matches'
  }
};

const translateValue = (val: string | undefined | null, lang: 'es' | 'en') => {
  if (!val) return '';
  if (lang === 'es') return val;
  const map: Record<string, string> = {
    'Blanca': 'Fair',
    'Negra': 'Black',
    'Mestiza': 'Mestiza',
    'Mulata': 'Mulata',
    'Cafés': 'Brown',
    'Verdes': 'Green',
    'Negros': 'Black',
    'Avellana': 'Hazel',
    'Grises': 'Grey'
  };
  return map[val] || val;
};

export interface EditorialBio {
  quote: string;
  vibe: string;
  palette: { name: string; hex: string }[];
  tags: string[];
  recommendations: string[];
}

export const getModelBio = (model: Model, lang: 'es' | 'en'): EditorialBio => {
  const parts = (model.instagram || '').split('|');
  const [igUser, _, __, igBio] = parts;
  
  let vibe = '';
  let palette: { name: string; hex: string }[] = [];
  let tags: string[] = [];
  let recommendations: string[] = [];
  let quote = '';

  const eyeStr = (model.ojos || '').toLowerCase();
  const skinStr = (model.piel || '').toLowerCase();
  const height = model.estatura;
  
  if (eyeStr.includes('clar') || eyeStr.includes('azul') || eyeStr.includes('verd') || eyeStr.includes('avellana') || eyeStr.includes('grise') || eyeStr.includes('green') || eyeStr.includes('grey') || eyeStr.includes('hazel')) {
    vibe = lang === 'es' ? 'Editorial Premium & Mirada Magnética' : 'Premium Editorial & Magnetic Gaze';
    palette = [
      { name: 'Pure White', hex: '#FFFFFF' },
      { name: 'Cosmic Ivory', hex: '#EAE6DF' },
      { name: 'Muted Sky', hex: '#6D8294' },
      { name: 'Midnight Charcoal', hex: '#1C1C1C' }
    ];
    tags = ['#HighFashion', '#Editorial', '#VogueStyle', '#MagneticLook'];
    recommendations = lang === 'es' 
      ? ['Campañas de Joyería y Belleza', 'Portadas de Revista', 'Moda de Alta Costura']
      : ['Jewelry & Beauty Campaigns', 'Magazine Covers', 'Haute Couture Fashion'];
  } else if (height >= 175) {
    vibe = lang === 'es' ? 'Estética Avant-Garde & Alta Costura' : 'Avant-Garde & Haute Couture Aesthetic';
    palette = [
      { name: 'Ebony Black', hex: '#0B0B0C' },
      { name: 'Warm Cream', hex: '#F0EBE1' },
      { name: 'Sartorial Grey', hex: '#4B4D52' },
      { name: 'Bordeaux Accent', hex: '#6B1621' }
    ];
    tags = ['#RunwayElite', '#Sartorial', '#HighContrast', '#ParisVibe'];
    recommendations = lang === 'es'
      ? ['Pasarela de Alta Costura', 'Lookbooks de Lujo', 'Moda Conceptual']
      : ['Haute Couture Runway', 'Luxury Lookbooks', 'Conceptual Fashion'];
  } else {
    vibe = lang === 'es' ? 'Chic Urbano & Estilo Minimalista' : 'Urban Chic & Minimalist Style';
    palette = [
      { name: 'Terracotta', hex: '#B85C4B' },
      { name: 'Warm Oatmeal', hex: '#D2C9BD' },
      { name: 'Deep Sage', hex: '#3E4D41' },
      { name: 'Onyx Black', hex: '#121212' }
    ];
    tags = ['#Minimalist', '#UrbanChic', '#Streetwise', '#Contemporary'];
    recommendations = lang === 'es'
      ? ['Campañas Prêt-à-Porter', 'E-commerce Premium', 'Estilo de Vida Urbano']
      : ['Prêt-à-Porter Campaigns', 'Premium E-commerce', 'Urban Lifestyle'];
  }

  // Generar citas descriptivas únicas y personalizadas basadas en características reales
  const formatSkinSpanish = (skin: string): string => {
    const s = (skin || '').toLowerCase().trim();
    if (s.includes('blanca')) return 'su tez clara y de gran luminosidad';
    if (s.includes('negra')) return 'su hermosa piel de matices oscuros';
    if (s.includes('mestiza')) return 'su cálido tono de piel mestizo';
    if (s.includes('mulata')) return 'su magnética y cálida piel mulata';
    if (s.includes('trigueña') || s.includes('triguena')) return 'su piel trigueña de tonos dorados';
    if (s.includes('morena')) return 'su atractiva piel morena';
    if (s) return `su piel de tono ${s}`;
    return 'su sofisticado perfil físico';
  };

  const formatEyesSpanish = (eyes: string): string => {
    const e = (eyes || '').toLowerCase().trim();
    if (e.includes('cafés') || e.includes('cafes') || e.includes('marrón') || e.includes('marron')) return 'una mirada profunda en tonos café';
    if (e.includes('negros') || e.includes('negro')) return 'unos expresivos ojos oscuros de gran fuerza';
    if (e.includes('verdes') || e.includes('verde')) return 'una cautivadora mirada de ojos verdes';
    if (e.includes('azules') || e.includes('azul')) return 'unos hipnotizantes ojos azules';
    if (e.includes('grises') || e.includes('gris')) return 'una sofisticada mirada de ojos grises';
    if (e.includes('avellana')) return 'unos expresivos ojos de tonalidad avellana';
    if (e) return `una mirada de ojos de tonalidad ${e}`;
    return 'una mirada sumamente expresiva';
  };

  const formatSkinEnglish = (skin: string): string => {
    const s = (skin || '').toLowerCase().trim();
    if (s.includes('blanca') || s.includes('white') || s.includes('fair')) return 'her radiant, fair complexion';
    if (s.includes('negra') || s.includes('black') || s.includes('dark')) return 'her beautiful dark skin tone';
    if (s.includes('mestiza') || s.includes('mixed')) return 'her warm olive complexion';
    if (s.includes('mulata')) return 'her stunning rich warm skin tone';
    if (s.includes('trigueña') || s.includes('triguena')) return 'her golden tanned complexion';
    if (s.includes('morena')) return 'her beautiful brunette skin';
    if (s) return `her ${s} skin tone`;
    return 'her sophisticated physical profile';
  };

  const formatEyesEnglish = (eyes: string): string => {
    const e = (eyes || '').toLowerCase().trim();
    if (e.includes('cafés') || e.includes('cafes') || e.includes('brown') || e.includes('marrón') || e.includes('marron')) return 'a deep brown gaze';
    if (e.includes('negros') || e.includes('black') || e.includes('dark') || e.includes('negro')) return 'expressive dark eyes with great intensity';
    if (e.includes('verdes') || e.includes('green') || e.includes('verde')) return 'a captivating green-eyed gaze';
    if (e.includes('azules') || e.includes('blue') || e.includes('azul')) return 'mesmerizing blue eyes';
    if (e.includes('grises') || e.includes('grey') || e.includes('gray') || e.includes('gris')) return 'a sophisticated grey-eyed gaze';
    if (e.includes('avellana') || e.includes('hazel')) return 'expressive hazel eyes';
    if (e) return `expressive ${e} eyes`;
    return 'an incredibly expressive gaze';
  };

  if (lang === 'es') {
    let lead = '';
    if (height >= 175) {
      lead = `${model.nombre} destaca en la industria por su imponente estatura de ${height} cm, proyectando un porte distinguido y elegante.`;
    } else if (height >= 170) {
      lead = `Con una esbelta figura de ${height} cm y gran dinamismo, ${model.nombre} personifica una versatilidad sumamente demandada.`;
    } else {
      lead = `La presencia escénica de ${model.nombre} se define por su frescura y carisma, sustentada en una proporción armónica de ${height} cm de estatura.`;
    }

    const skinFormatted = formatSkinSpanish(skinStr);
    const eyesFormatted = formatEyesSpanish(eyeStr);
    const body = `La armonía entre ${skinFormatted} y ${eyesFormatted} genera un contraste visual extraordinario, idóneo para capturar la atención en cámara.`;

    let styleGoal = '';
    if (height >= 175) {
      styleGoal = 'alta costura y pasarela internacional';
    } else if (eyeStr.includes('clar') || eyeStr.includes('azul') || eyeStr.includes('verd') || eyeStr.includes('avellana') || eyeStr.includes('grise')) {
      styleGoal = 'campañas de belleza y editoriales de moda premium';
    } else {
      styleGoal = 'moda contemporánea, lookbooks urbanos y publicidad comercial';
    }

    let tail = `Su estilo visual, óptimo para ${styleGoal}, la posiciona como una elección estelar para firmas que buscan sofisticación y autenticidad en cada toma.`;

    quote = `"${lead} ${body} ${tail}"`;
  } else {
    let lead = '';
    if (height >= 175) {
      lead = `${model.nombre} stands out in the industry with her commanding height of ${height} cm, projecting a distinguished and elegant carriage.`;
    } else if (height >= 170) {
      lead = `With a slender figure of ${height} cm and great dynamism, ${model.nombre} embodies a highly sought-after versatility.`;
    } else {
      lead = `${model.nombre}'s stage presence is defined by freshness and charisma, backed by a harmonious proportion at ${height} cm in height.`;
    }

    const skinFormatted = formatSkinEnglish(skinStr);
    const eyesFormatted = formatEyesEnglish(eyeStr);
    const body = `The harmony between ${skinFormatted} and ${eyesFormatted} creates an extraordinary visual contrast, ideal for capturing attention in front of the lens.`;

    let styleGoal = '';
    if (height >= 175) {
      styleGoal = 'haute couture and international runway';
    } else if (eyeStr.includes('clar') || eyeStr.includes('azul') || eyeStr.includes('verd') || eyeStr.includes('avellana') || eyeStr.includes('grise') || eyeStr.includes('green') || eyeStr.includes('grey') || eyeStr.includes('hazel')) {
      styleGoal = 'beauty campaigns and premium fashion editorials';
    } else {
      styleGoal = 'contemporary fashion, urban lookbooks, and commercial advertising';
    }

    let tail = `Her visual style, optimal for ${styleGoal}, positions her as a stellar choice for brands seeking sophistication and authenticity in every frame.`;

    quote = `"${lead} ${body} ${tail}"`;
  }

  // Si tiene biografía personalizada (en el 4to elemento de instagram), usarla como quote
  if (igBio && igBio.trim()) {
    quote = igBio.trim();
  }

  return { quote, vibe, palette, tags, recommendations };
};

function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, { stiffness: 80, damping: 15 });
  const rounded = useTransform(springValue, (latest) => Math.round(latest));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return rounded.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = String(latest);
      }
    });
  }, [rounded]);

  return <span ref={ref}>{value}</span>;
}

const panelContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const panelItemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 80,
      damping: 20,
      mass: 1
    } 
  },
  hover: {
    opacity: 1,
    y: -8,
    scale: 1.02,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  }
};

const detailsOverlayVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  },
  hover: {
    opacity: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
  }
};

const detailsHeaderVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    y: 16,
    opacity: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  hover: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, delay: 0.04, ease: [0.16, 1, 0.3, 1] }
  }
};

const detailsLineVariants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 0,
    opacity: 0,
    originX: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
  },
  hover: {
    scaleX: 1,
    opacity: 1,
    originX: 0,
    transition: { duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }
  }
};

const detailsSpecsVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    y: 16,
    opacity: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  hover: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }
  }
};

const detailsMeasurementsVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    y: 12,
    opacity: 0,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
  },
  hover: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }
  }
};

const defaultBottomBarVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
  },
  hover: {
    y: 20,
    opacity: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  }
};

const getImageDataUrl = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (url.startsWith('data:')) {
      resolve(url);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg');
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error('Could not get 2d context'));
      }
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
};

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : direction < 0 ? '-100%' : '0%',
    opacity: 0,
    scale: 1
  }),
  center: {
    x: '0%',
    opacity: 1,
    scale: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : direction > 0 ? '-100%' : '0%',
    opacity: 0,
    scale: 1
  })
};


const CardImages = ({ mainPhoto, secondPhoto, model, isTouchActive, lang }: any) => {
  const [isMainLoaded, setIsMainLoaded] = useState(false);
  const [isSecondLoaded, setIsSecondLoaded] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#121212]">
      {/* Skeleton / placeholder loader before image finishes loading */}
      {!isMainLoaded && mainPhoto && (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#111111] via-[#1a1a1a] to-[#111111] bg-[length:200%_100%] animate-[pulse_1.5s_ease-in-out_infinite] z-0" />
      )}

      {mainPhoto ? (
        <img 
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out ${
            !isMainLoaded ? 'opacity-0 scale-105' : (isTouchActive ? 'opacity-0 scale-100' : 'opacity-100 scale-105 group-hover:opacity-0 group-hover:scale-100')
          }`}
          src={mainPhoto} 
          alt={model.nombre} 
          loading="lazy" 
          onLoad={() => setIsMainLoaded(true)}
          onError={(e) => { 
            setIsMainLoaded(true);
            e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23111"/><text x="50" y="50" font-family="sans-serif" font-size="10" fill="%23555" text-anchor="middle" dominant-baseline="middle">N/A</text></svg>'; 
            e.currentTarget.className = e.currentTarget.className + ' object-contain p-8'; 
          }} 
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-[#161616] flex flex-col items-center justify-center gap-6">
          <span className="font-serif text-3xl sm:text-5xl text-white/10 select-none tracking-wider font-light">
            {(model.nombre && model.nombre[0]) || ''}{(model.apellidos && model.apellidos[0]) || ''}
          </span>
          <span className="text-[8px] sm:text-[9px] tracking-[0.25em] uppercase text-white/20 font-semibold text-center px-2">
            {lang === 'es' ? 'FOTOS EN PREPARACIÓN' : 'PHOTOS IN PREP'}
          </span>
        </div>
      )}
      {/* Segunda foto en hover */}
      {mainPhoto && secondPhoto && (
        <div className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out ${isTouchActive ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-105 group-hover:scale-100'}`}>
          <img 
            className={`w-full h-full object-cover transition-all duration-700 ease-out ${isSecondLoaded ? 'opacity-100' : 'opacity-0'}`}
            src={secondPhoto} 
            alt={model.nombre} 
            loading="lazy" 
            onLoad={() => setIsSecondLoaded(true)}
            onError={(e) => { 
              setIsSecondLoaded(true);
              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23111"/><text x="50" y="50" font-family="sans-serif" font-size="10" fill="%23555" text-anchor="middle" dominant-baseline="middle">N/A</text></svg>'; 
              e.currentTarget.className = e.currentTarget.className + ' object-contain p-8'; 
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroScrollOpacity = useTransform(heroScrollProgress, [0, 0.6, 0.95], [1, 0.35, 0]);
  const heroScrollBlur = useTransform(heroScrollProgress, [0, 0.6, 0.95], ["blur(0px)", "blur(6px)", "blur(18px)"]);
  const heroScrollScale = useTransform(heroScrollProgress, [0, 1], [1, 0.94]);
  const heroScrollY = useTransform(heroScrollProgress, [0, 1], [0, 60]);

  // Transformaciones dinámicas de navbar y logo al hacer scroll
  const navBg = useTransform(
    scrollY, 
    [0, 300], 
    ["rgba(10, 10, 10, 0.65)", "rgba(10, 10, 10, 0.92)"]
  );
  const navBackdropBlur = useTransform(
    scrollY, 
    [0, 300], 
    ["blur(12px)", "blur(28px)"]
  );
  const navPaddingY = useTransform(
    scrollY,
    [0, 300],
    ["12px", "8px"]
  );
  const navBorderColor = useTransform(
    scrollY,
    [0, 300],
    ["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.16)"]
  );
  const logoScale = useTransform(
    scrollY, 
    [0, 300], 
    [1, 0.9]
  );

  const yParallaxLeft = useTransform(scrollY, [0, 800], [0, -100]);
  const yParallaxRight = useTransform(scrollY, [0, 800], [0, -60]);
  const yParallaxCenter = useTransform(scrollY, [0, 800], [0, -140]);

  const [lang, setLang] = useState<'es' | 'en'>(() => {
    const saved = localStorage.getItem('pt_lang');
    return (saved === 'en' || saved === 'es') ? saved : 'es';
  });

  const changeLang = (l: 'es' | 'en') => {
    setLang(l);
    localStorage.setItem('pt_lang', l);
  };

  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const storedSession = localStorage.getItem('adminSession');
    if (storedSession) {
      try {
        setSession(JSON.parse(storedSession));
      } catch (e) {
        console.warn("Error parsing adminSession:", e);
        localStorage.removeItem('adminSession');
      }
    }
  }, []);

  const [dbModels, setDbModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [modelsLoadError, setModelsLoadError] = useState<boolean>(false);

  const fetchPublicModels = async (forceRefresh = false) => {
    setLoadingModels(true);
    setModelsLoadError(false);
    try {
      if (forceRefresh) {
        invalidateModelsCache();
      }
      const data = await getCachedModels((updatedData) => {
        setDbModels(updatedData as Model[]);
        setModelsLoadError(false);
      }, forceRefresh);
      setDbModels(data as Model[]);
      setModelsLoadError(false);
    } catch (err) {
      console.error("Error fetching public models:", err);
      // Only set error if we don't have any cached/local models shown already, to avoid breaking experience if old cached data exists
      if (dbModels.length === 0) {
        setModelsLoadError(true);
      } else {
        toast.error(lang === 'es' ? 'Error al actualizar base de datos' : 'Error updating database');
      }
    } finally {
      setLoadingModels(false);
    }
  };

  // Real-time synchronization and auto-revalidation (focus, visibility, storage, and Supabase Realtime)
  useEffect(() => {
    let active = true;

    const refreshModelsNow = async (force: boolean = false) => {
      try {
        if (force) {
          invalidateModelsCache();
        }
        const data = await getCachedModels(undefined, force);
        if (active) {
          setDbModels(data as Model[]);
          setModelsLoadError(false);
        }
      } catch (err) {
        console.error("Error auto-refreshing models:", err);
      }
    };

    // 1. Supabase Realtime subscription for instant multi-device / multi-tab synchronization
    const channel = supabase
      .channel('public-models-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'models' },
        (payload) => {
          console.log('Realtime change detected in models table:', payload);
          refreshModelsNow(true);
        }
      )
      .subscribe();

    // 2. Revalidate when tab becomes focused or visible (SWR behavior)
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Run a background revalidation to make sure the user has fresh data
        refreshModelsNow(false);
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    // 3. Revalidate on storage events (e.g., changes made in another tab/admin view of the same browser)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pt_models_cache' || e.key === 'adminSession') {
        refreshModelsNow(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Also run a periodic background poll as a safety net (every 30 seconds)
    const interval = setInterval(() => {
      refreshModelsNow(false);
    }, 30000);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [dbModels.length]);

  useEffect(() => {
    fetchPublicModels();
  }, [session]);

  const [publicBookings, setPublicBookings] = useState<any[]>([]);

  useEffect(() => {
    getCachedBookings()
      .then(data => {
        if (data && Array.isArray(data)) setPublicBookings(data);
      })
      .catch(() => {});
  }, [session]);

  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Advanced Filters & Guide State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [showLevelGuideModal, setShowLevelGuideModal] = useState<boolean>(false);
  const [selectedSkins, setSelectedSkins] = useState<string[]>([]);
  const [selectedEyes, setSelectedEyes] = useState<string[]>([]);
  const [selectedShoes, setSelectedShoes] = useState<string[]>([]);
  const [minHeight, setMinHeight] = useState<number>(150);
  const [maxHeight, setMaxHeight] = useState<number>(200);
  const [minAge, setMinAge] = useState<number>(15);
  const [maxAge, setMaxAge] = useState<number>(50);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Cerrar sugerencias al hacer click fuera del contenedor de búsqueda
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [sortBy, setSortBy] = useState<string>('default');
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showBioDrawer, setShowBioDrawer] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedModel) {
      setShowBioDrawer(false);
    }
  }, [selectedModel]);

  const [activeCardId, setActiveCardId] = useState<number | null>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      // If the click is not on a card, reset activeCardId
      const target = e.target as HTMLElement;
      if (!target.closest('.group.cursor-pointer')) {
        setActiveCardId(null);
      }
    };
    
    if (activeCardId !== null) {
      document.addEventListener('touchstart', handleGlobalClick);
      document.addEventListener('mousedown', handleGlobalClick);
    }
    
    return () => {
      document.removeEventListener('touchstart', handleGlobalClick);
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [activeCardId]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  const [currentHeroIdx, setCurrentHeroIdx] = useState(0);
  const HERO_IMAGES = [
    "/photo_2026-07-08_11-26-18.jpg",
    "/photo_2026-07-08_11-26-15.jpg",
    "/IMG-20260624-WA0012(1).jpg",
    "/IMG-20260624-WA0015.jpg",
    "/IMG-20260624-WA0052(1).jpg",
    "/IMG-20260624-WA0059(1).jpg",
    "/IMG-20260708-WA0007.jpg"
  ].filter(Boolean) as string[];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHeroIdx((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [HERO_IMAGES.length]);

  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  
  useEffect(() => {
    setIsFiltering(true);
    const timeout = setTimeout(() => {
      setIsFiltering(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [filter, searchQuery, sortBy, showFavoritesOnly, selectedSkins, selectedEyes, selectedShoes, minHeight, maxHeight, minAge, maxAge]);
  
  // Booking Form State
  const [showBookingForm, setShowBookingForm] = useState<boolean>(false);
  const [bookingName, setBookingName] = useState<string>('');
  const [bookingEmail, setBookingEmail] = useState<string>('');
  const [bookingPhone, setBookingPhone] = useState<string>('');
  const [bookingCompany, setBookingCompany] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingMsg, setBookingMsg] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string>('');
  
  // Main View Navigation State ('catalog' or 'course')
  const [currentView, setCurrentView] = useState<'catalog' | 'course'>('catalog');

  // Lightbox State
  const [showLightbox, setShowLightbox] = useState<boolean>(false);

  // Manager Login State
  const [showManagerLogin, setShowManagerLogin] = useState<boolean>(false);
  const [managerEmail, setManagerEmail] = useState<string>('');
  const [managerPassword, setManagerPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);

  // Back button / gesture interception for modal views
  const openModalsRef = useRef<string[]>([]);
  const ignorePopstateCountRef = useRef<number>(0);

  useEffect(() => {
    const expectedStack: string[] = [];
    if (selectedModel) expectedStack.push('profile');
    if (showLightbox) expectedStack.push('lightbox');
    if (showBookingForm) expectedStack.push('booking');
    if (showManagerLogin) expectedStack.push('login');
    if (showLevelGuideModal) expectedStack.push('levelGuide');

    const currentStack = openModalsRef.current;

    if (expectedStack.length > currentStack.length) {
      const diff = expectedStack.length - currentStack.length;
      for (let i = 0; i < diff; i++) {
        window.history.pushState({ modalOpen: true, index: currentStack.length + i }, '');
      }
    } else if (expectedStack.length < currentStack.length) {
      const diff = currentStack.length - expectedStack.length;
      ignorePopstateCountRef.current += diff;
      for (let i = 0; i < diff; i++) {
        window.history.back();
      }
    }

    openModalsRef.current = expectedStack;
  }, [selectedModel, showLightbox, showBookingForm, showManagerLogin, showLevelGuideModal]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (ignorePopstateCountRef.current > 0) {
        ignorePopstateCountRef.current--;
        return;
      }
      const currentStack = openModalsRef.current;
      if (currentStack.length > 0) {
        const updatedStack = [...currentStack];
        const popped = updatedStack.pop();
        if (popped === 'booking') {
          setShowBookingForm(false);
        } else if (popped === 'lightbox') {
          setShowLightbox(false);
        } else if (popped === 'profile') {
          setSelectedModel(null);
        } else if (popped === 'login') {
          setShowManagerLogin(false);
        } else if (popped === 'levelGuide') {
          setShowLevelGuideModal(false);
        }
        openModalsRef.current = updatedStack;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const [showFloatingScrollBtn, setShowFloatingScrollBtn] = useState<boolean>(false);
  const [scrollDirectionUp, setScrollDirectionUp] = useState<boolean>(false);
  const [isNearBottom, setIsNearBottom] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowH = window.innerHeight || 800;
      const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 2000;
      const maxScroll = Math.max(1, docHeight - windowH);
      const scrollProgress = scrollY / maxScroll; // 0.0 at top, 1.0 at bottom
      
      // Show the floating scroll button once user starts scrolling down from the hero (scrollY > 150)
      const shouldShow = scrollY > 150;
      setShowFloatingScrollBtn(shouldShow);

      // Direction logic:
      // Change arrow to point UP ONLY when the footer element (#footer) has actually entered into view on the screen.
      const footerElem = document.getElementById('footer');
      let hasReachedFooter = false;

      if (footerElem) {
        const footerRect = footerElem.getBoundingClientRect();
        // The top of the footer has entered into the visible viewport
        hasReachedFooter = footerRect.top <= windowH + 20;
      } else {
        // Fallback if footer element is not yet found: user is at the absolute bottom of document
        hasReachedFooter = (docHeight - (scrollY + windowH)) <= 80;
      }

      setScrollDirectionUp(hasReachedFooter);
      setIsNearBottom(hasReachedFooter);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Swipe State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe || isRightSwipe) {
      if (selectedModel && selectedModel.photos.length > 1) {
        if (isLeftSwipe) {
          handleNextPhoto(selectedModel.photos.length);
        } else {
          handlePrevPhoto(selectedModel.photos.length);
        }
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', managerEmail)
        .eq('password', managerPassword)
        .single();

      if (error || !data) {
        throw new Error('Credenciales inválidas');
      }
      
      const newSession = { email: data.email };
      setSession(newSession);
      localStorage.setItem('adminSession', JSON.stringify(newSession));
      setShowManagerLogin(false);
      setManagerEmail('');
      setManagerPassword('');
    } catch (error: any) {
      setLoginError(error.message || 'Credenciales inválidas');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    invalidateModelsCache();
    setSession(null);
    localStorage.removeItem('adminSession');
  };

  // Active Photo in Modal Showcase
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<number>(0); // 1 = next/left swipe, -1 = prev/right swipe

  const handleNextPhoto = (photosCount: number) => {
    setSlideDirection(1);
    setActivePhotoIdx((prev) => (prev < photosCount - 1 ? prev + 1 : 0));
  };

  const handlePrevPhoto = (photosCount: number) => {
    setSlideDirection(-1);
    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : photosCount - 1));
  };

  // Auto-carousel effect for model photos in detail view
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedModel && selectedModel.photos.length > 1 && !showLightbox) {
      interval = setInterval(() => {
        handleNextPhoto(selectedModel.photos.length);
      }, 3500); // changes every 3.5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedModel, showLightbox]);

  // Load favorites from local storage
  useEffect(() => {
    const saved = localStorage.getItem('pt_favs');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Smart cart management (purging ghost/inactive IDs from localStorage)
  useEffect(() => {
    if (dbModels.length > 0 && favorites.length > 0) {
      const activeIds = new Set(dbModels.filter(m => m.activo !== false && m.photos && m.photos.length > 0).map(m => m.id));
      const filteredFavs = favorites.filter(id => activeIds.has(id));
      if (filteredFavs.length !== favorites.length) {
        setFavorites(filteredFavs);
        localStorage.setItem('pt_favs', JSON.stringify(filteredFavs));
      }
    }
  }, [dbModels]); // Only run when dbModels updates

  const saveFavorites = (newFavs: number[]) => {
    setFavorites(newFavs);
    localStorage.setItem('pt_favs', JSON.stringify(newFavs));
  };

  const triggerHapticFeedback = (pattern: number | number[] = 40) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Haptic feedback not available or permission restricted
      }
    }
  };

  const toggleFavorite = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (favorites.includes(id)) {
      saveFavorites(favorites.filter(fId => fId !== id));
      triggerHapticFeedback(25);
      toast(TRANSLATIONS[lang].removedFromFavorites || 'Eliminado de favoritos', { icon: '💔' });
    } else {
      saveFavorites([...favorites, id]);
      triggerHapticFeedback([45, 30, 45]);
      toast(TRANSLATIONS[lang].addedToFavorites || 'Añadido a favoritos', { icon: '❤️' });
    }
  };

  // Copy Shortlist Clipboard
  const copyShortlist = () => {
    const selectedModels = activeModels.filter(m => favorites.includes(m.id));
    const text = selectedModels.map(m => `- ${m.nombre} ${m.apellidos}`).join('\n');
    const header = TRANSLATIONS[lang].copiedClipboard;
    navigator.clipboard.writeText(`${header}${text}`);
    setCopied(true);
    toast.success(lang === 'es' ? '¡Selección copiada al portapapeles!' : 'Selection copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Export Selection of Casting as PDF
  const exportSelectionPDF = async () => {
    const selectedModels = activeModels.filter(m => favorites.includes(m.id));
    if (selectedModels.length === 0) {
      toast.error(lang === 'es' ? 'No tienes modelos seleccionadas en tu casting' : 'You have no models in your casting selection');
      return;
    }

    const toastId = toast.loading(lang === 'es' ? 'Generando PDF de tu selección...' : 'Generating selection PDF...');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [10, 10, 10];
      const textWhite = [255, 255, 255];
      const textMuted = [150, 150, 150];

      // --- COVER PAGE ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 297, 'F');

      // Collage in background (up to 6 photos from selected models)
      doc.setGState(new (doc as any).GState({opacity: 0.12}));
      let coverPhotoIdx = 0;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          if (coverPhotoIdx < selectedModels.length) {
            const m = selectedModels[coverPhotoIdx];
            if (m.photos && m.photos.length > 0) {
              const base64Data = resolvePhoto(m.photos[0]);
              try {
                doc.addImage(base64Data, 'JPEG', i * 105, j * 99, 105, 99, `cover_sel_${m.id}`, 'FAST');
              } catch(e) {}
            }
            coverPhotoIdx++;
          }
        }
      }
      doc.setGState(new (doc as any).GState({opacity: 1.0}));

      // Overlay darkening
      doc.setFillColor(0, 0, 0);
      doc.setGState(new (doc as any).GState({opacity: 0.7}));
      doc.rect(0, 0, 210, 297, 'F');
      doc.setGState(new (doc as any).GState({opacity: 1.0}));

      // Logo
      const headerFontSize = 40;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(headerFontSize);
      const planetWidth = doc.getTextWidth('planet');
      doc.setFont('times', 'italic');
      doc.setFontSize(headerFontSize);
      const talentWidth = doc.getTextWidth('talent');
      const gap = 1.5;
      const totalHeaderWidth = planetWidth + talentWidth + gap;
      const startHeaderX = 105 - (totalHeaderWidth / 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(headerFontSize);
      doc.setTextColor(255, 255, 255);
      doc.text('planet', startHeaderX, 110);

      doc.setFont('times', 'italic');
      doc.setFontSize(headerFontSize);
      doc.setTextColor(204, 0, 0);
      doc.text('talent', startHeaderX + planetWidth + gap, 110);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('AGENCIA DE MODELOS', 105, 124, { align: 'center', charSpace: 3 });

      doc.setDrawColor(204, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(95, 134, 115, 134);

      // Title & Date of Generation
      doc.setFont('times', 'italic');
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text(lang === 'es' ? 'Selección de Casting' : 'Casting Selection', 105, 150, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(204, 0, 0);
      doc.text('Planet Talent', 105, 160, { align: 'center' });

      // Generation date
      const formattedDate = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text(lang === 'es' ? `Fecha de generación: ${formattedDate}` : `Date of generation: ${formattedDate}`, 105, 175, { align: 'center' });

      // Number of models in selection
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(lang === 'es' ? `${selectedModels.length} modelo${selectedModels.length !== 1 ? 's' : ''} seleccionada${selectedModels.length !== 1 ? 's' : ''}` : `${selectedModels.length} model${selectedModels.length !== 1 ? 's' : ''} selected`, 105, 190, { align: 'center' });

      // --- MODEL PAGES ---
      let yOffset = 20;
      let modelsOnPage = 0;

      for (let i = 0; i < selectedModels.length; i++) {
        const model = selectedModels[i];
        
        if (modelsOnPage === 2) {
          doc.addPage();
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
          doc.rect(0, 0, 210, 297, 'F');
          yOffset = 20;
          modelsOnPage = 0;
        }

        if (modelsOnPage === 0 && i === 0) {
            doc.addPage();
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, 210, 297, 'F');
        }

        // Photo
        let photoRendered = false;
        if (model.photos && model.photos.length > 0) {
          try {
            const base64Data = resolvePhoto(model.photos[0]);
            doc.addImage(base64Data, 'JPEG', 20, yOffset, 75, 105, `sel_model_img_${model.id}`, 'FAST');
            photoRendered = true;
          } catch(e) { console.log(e); }
        }

        if (!photoRendered) {
          doc.setFillColor(30, 30, 30);
          doc.rect(20, yOffset, 75, 105, 'F');
        }

        const infoX = 105;
        let currentY = yOffset + 15;

        // Name
        doc.setFont('times', 'normal');
        doc.setFontSize(26);
        doc.setTextColor(255, 255, 255);
        doc.text(model.nombre.toUpperCase(), infoX, currentY);
        currentY += 10;
        
        doc.setFont('times', 'italic');
        doc.setFontSize(20);
        doc.setTextColor(200, 200, 200);
        doc.text(model.apellidos, infoX, currentY);
        currentY += 12;

        // Red line
        doc.setDrawColor(204, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(infoX, currentY - 5, infoX + 20, currentY - 5);
        currentY += 3;

        // Indicador discreto si no está disponible actualmente
        if (model.disponible === false) {
          doc.setFillColor(204, 0, 0);
          doc.roundedRect(infoX, currentY - 4, 50, 5.5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(255, 255, 255);
          doc.text('NO DISPONIBLE ACTUALMENTE', infoX + 2.5, currentY, { charSpace: 0.2 });
          currentY += 8;
        }

        // Instagram
        if (model.instagram) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(204, 0, 0);
          doc.text(`@${model.instagram.split('|')[0].replace('@', '')}`, infoX, currentY);
          currentY += 12;
        }

        // Attributes
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        
        const attributes = [
          { label: 'EDAD', value: model.fecha_nacimiento ? `${calculateAge(model.fecha_nacimiento)} años` : (model.edad ? `${model.edad} años` : 'N/A') },
          { label: 'ESTATURA', value: model.estatura ? `${model.estatura} cm` : 'N/A' },
          { label: 'PIEL', value: model.piel || 'N/A' },
          { label: 'BUSTO', value: model.busto ? `${model.busto} cm` : 'N/A' },
          { label: 'CINTURA', value: model.cintura ? `${model.cintura} cm` : 'N/A' },
          { label: 'CADERAS', value: model.caderas ? `${model.caderas} cm` : 'N/A' },
          { label: 'OJOS', value: model.ojos || 'N/A' }
        ];

        let attrY = currentY;
        attributes.forEach(attr => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(textWhite[0], textWhite[1], textWhite[2]);
          doc.text(`${attr.label}:`, infoX, attrY);
          
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.text(attr.value, infoX + 25, attrY);
          
          attrY += 7;
        });

        // Si es el último modelo y es impar (único modelo en esta página)
        if (i === selectedModels.length - 1 && modelsOnPage === 0) {
          const closingY = 150;

          // Separador rojo sutil
          doc.setDrawColor(204, 0, 0);
          doc.setLineWidth(0.5);
          doc.line(20, closingY, 190, closingY);

          // Fondo decorativo sutil en la mitad inferior
          doc.setFillColor(15, 15, 15);
          doc.roundedRect(20, closingY + 8, 170, 112, 2, 2, 'F');

          // Logo planet talent en el cierre
          const logoY = closingY + 30;
          const cLogoFontSize = 26;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(cLogoFontSize);
          const cPlanetW = doc.getTextWidth('planet');
          doc.setFont('times', 'italic');
          doc.setFontSize(cLogoFontSize);
          const cTalentW = doc.getTextWidth('talent');
          const cGap = 1.5;
          const cTotalW = cPlanetW + cTalentW + cGap;
          const cStartX = 105 - (cTotalW / 2);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(cLogoFontSize);
          doc.setTextColor(255, 255, 255);
          doc.text('planet', cStartX, logoY);

          doc.setFont('times', 'italic');
          doc.setFontSize(cLogoFontSize);
          doc.setTextColor(204, 0, 0);
          doc.text('talent', cStartX + cPlanetW + cGap, logoY);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
          doc.text('AGENCIA DE MODELOS', 105, logoY + 8, { align: 'center', charSpace: 2 });

          // Texto de cierre elegante
          doc.setFont('times', 'italic');
          doc.setFontSize(15);
          doc.setTextColor(255, 255, 255);
          doc.text('Gracias por tu interés en Planet Talent', 105, logoY + 26, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(204, 0, 0);
          doc.text('talent@planetrecords.it  ·  @planet_talent_agency', 105, logoY + 38, { align: 'center' });

          doc.setFont('times', 'italic');
          doc.setFontSize(11);
          doc.setTextColor(255, 255, 255);
          doc.text('Agencia de Modelos #1 de Cuba', 105, logoY + 48, { align: 'center' });

          // Línea decorativa inferior
          doc.setDrawColor(204, 0, 0);
          doc.setLineWidth(0.3);
          doc.line(85, logoY + 56, 125, logoY + 56);
        }

        yOffset += 135;
        modelsOnPage++;
      }

      // --- BACK COVER (Only if selected models count is even, since odd already has the closing block on the last model page) ---
      if (selectedModels.length % 2 === 0) {
        doc.addPage();
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, 210, 297, 'F');

        const closingY = 80; // Centered on the page

        // Separador rojo sutil
        doc.setDrawColor(204, 0, 0);
        doc.setLineWidth(0.5);
        doc.line(20, closingY, 190, closingY);

        // Fondo decorativo sutil
        doc.setFillColor(15, 15, 15);
        doc.roundedRect(20, closingY + 8, 170, 112, 2, 2, 'F');

        // Logo planet talent en el cierre
        const logoY = closingY + 30;
        const cLogoFontSize = 32;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(cLogoFontSize);
        const cPlanetW = doc.getTextWidth('planet');
        doc.setFont('times', 'italic');
        doc.setFontSize(cLogoFontSize);
        const cTalentW = doc.getTextWidth('talent');
        const cGap = 1.5;
        const cTotalW = cPlanetW + cTalentW + cGap;
        const cStartX = 105 - (cTotalW / 2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(cLogoFontSize);
        doc.setTextColor(255, 255, 255);
        doc.text('planet', cStartX, logoY);

        doc.setFont('times', 'italic');
        doc.setFontSize(cLogoFontSize);
        doc.setTextColor(204, 0, 0);
        doc.text('talent', cStartX + cPlanetW + cGap, logoY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text('AGENCIA DE MODELOS', 105, logoY + 10, { align: 'center', charSpace: 2 });

        // Texto de cierre elegante
        doc.setFont('times', 'italic');
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text('Gracias por tu interés en Planet Talent', 105, logoY + 30, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(204, 0, 0);
        doc.text('talent@planetrecords.it  ·  @planet_talent_agency', 105, logoY + 42, { align: 'center' });

        doc.setFont('times', 'italic');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text('Agencia de Modelos #1 de Cuba', 105, logoY + 54, { align: 'center' });

        // Línea decorativa inferior
        doc.setDrawColor(204, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(85, logoY + 64, 125, logoY + 64);
      }

      doc.save('PlanetTalent_Seleccion_Casting.pdf');
      toast.success(lang === 'es' ? 'PDF de tu selección generado con éxito' : 'Selection PDF generated successfully', { id: toastId });

    } catch (error) {
      console.error(error);
      toast.error(lang === 'es' ? 'Error al generar el PDF de selección' : 'Error generating selection PDF', { id: toastId });
    }
  };

  // Export Model Composite Card as PDF
  const exportModelPDF = async (model: Model) => {
    const toastId = toast.loading(lang === 'es' ? 'Generando ficha profesional en PDF...' : 'Generating professional PDF...');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Color definitions
      const primaryColor = [20, 20, 20]; // Deep Charcoal
      const accentColor = [204, 0, 0]; // Red #CC0000
      const textMuted = [110, 110, 110]; // Gray #6E6E6E
      const borderLight = [230, 230, 230]; // Light gray border

      // --- 1. HEADER BRANDING (TYPOGRAPHY ONLY) ---
      const headerFontSize = 24;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(headerFontSize);
      const planetWidth = doc.getTextWidth('planet');
      
      doc.setFont('times', 'italic');
      doc.setFontSize(headerFontSize);
      const talentWidth = doc.getTextWidth('talent');
      
      const gap = 0.6; // replicates the ml-0.5 gap in CSS
      const totalHeaderWidth = planetWidth + talentWidth + gap;
      const startHeaderX = 105 - (totalHeaderWidth / 2);

      // Print "planet" (black/dark gray)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(headerFontSize);
      doc.setTextColor(20, 20, 20);
      doc.text('planet', startHeaderX, 18);

      // Print "talent" (red #CC0000, italic, same size, immediately after)
      doc.setFont('times', 'italic');
      doc.setFontSize(headerFontSize);
      doc.setTextColor(204, 0, 0);
      doc.text('talent', startHeaderX + planetWidth + gap, 18);

      // Sub-header "AGENCIA DE MODELOS" (dark gray #555555, widely spaced, small)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(85, 85, 85);
      doc.text('A G E N C I A   D E   M O D E L O S', 105, 24, { align: 'center' });

      // Header divider line
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.6);
      doc.line(15, 28, 195, 28);

      // --- 2. MODEL IDENTITY ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`${model.nombre} ${model.apellidos}`.toUpperCase(), 15, 38);

      const [igUser] = (model.instagram || '').split('|');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(igUser || '', 15, 43);

      // --- PRE-LOAD IMAGES TO DETERMINE LAYOUT DYNAMICALLY ---
      let mainPhotoDataUrl = '';
      const mainPhotoName = model.photos && model.photos[0];
      if (mainPhotoName) {
        const resolved = resolvePhoto(mainPhotoName);
        if (resolved) {
          try {
            mainPhotoDataUrl = await getImageDataUrl(resolved);
          } catch (e) {
            console.error("Failed to load main image for PDF", e);
          }
        }
      }

      const secPhotosRaw = (model.photos || []).slice(1);
      const loadedSecPhotos: string[] = [];
      for (const pName of secPhotosRaw) {
        if (loadedSecPhotos.length >= 3) break;
        if (pName) {
          const resolved = resolvePhoto(pName);
          if (resolved) {
            try {
              const dataUrl = await getImageDataUrl(resolved);
              if (dataUrl) {
                loadedSecPhotos.push(dataUrl);
              }
            } catch (e) {
              console.error("Failed to load secondary image for PDF", e);
            }
          }
        }
      }

      // --- DYNAMIC LAYOUT CONFIGURATION BASED ON PHOTO COUNT ---
      const numSecondary = loadedSecPhotos.length;
      
      let startY = 52;
      let rightColY = 52;
      let rightColX = 100;
      let photoW = 95;
      let photoH = 120;
      let leftColX = 15;
      let colWidth = 80;
      let specsRowHeight = 10;

      if (numSecondary === 0) {
        // No secondary photos - make the main photo much larger to fill the space
        startY = 52;
        rightColY = 52;
        rightColX = 95;
        photoW = 100;
        photoH = 145;
        leftColX = 15;
        colWidth = 72;
        specsRowHeight = 11.5;
      }

      // Function to truncate quote intelligently so it always ends with a full sentence
      const getIntelligentTruncatedBio = (rawText: string, width: number): string[] => {
        let text = rawText.trim();
        let hasOuterQuotes = false;
        if (text.startsWith('"') && text.endsWith('"')) {
          text = text.substring(1, text.length - 1).trim();
          hasOuterQuotes = true;
        }

        // Split by sentences (handling standard punctuation followed by space or end of string)
        const sentences = text.split(/(?<=[.!?])\s+/);
        let currentText = "";
        let bestLines: string[] = [];

        for (let i = 0; i < sentences.length; i++) {
          const sentence = sentences[i].trim();
          if (!sentence) continue;

          const proposedText = currentText ? `${currentText} ${sentence}` : sentence;
          const textWithQuotes = hasOuterQuotes ? `"${proposedText}"` : proposedText;
          const lines = doc.splitTextToSize(textWithQuotes, width);

          if (lines.length <= 3) {
            currentText = proposedText;
            bestLines = lines;
          } else {
            break;
          }
        }

        // Fallback: If not even one single sentence fits within 3 lines,
        // we must cut word-by-word and force a period at the end (never "...").
        if (bestLines.length === 0 && sentences.length > 0) {
          const firstSentence = sentences[0];
          const words = firstSentence.split(/\s+/);
          let currentSentenceText = "";

          for (let w = 0; w < words.length; w++) {
            const word = words[w];
            const testSentenceText = currentSentenceText ? `${currentSentenceText} ${word}` : word;
            const testWithPeriod = testSentenceText.replace(/[\s.,;!?-]+$/, '') + '.';
            const testWithQuotes = hasOuterQuotes ? `"${testWithPeriod}"` : testWithPeriod;
            const lines = doc.splitTextToSize(testWithQuotes, width);

            if (lines.length <= 3) {
              currentSentenceText = testSentenceText;
            } else {
              break;
            }
          }

          if (currentSentenceText) {
            const finalWithPeriod = currentSentenceText.replace(/[\s.,;!?-]+$/, '') + '.';
            const finalWithQuotes = hasOuterQuotes ? `"${finalWithPeriod}"` : finalWithPeriod;
            bestLines = doc.splitTextToSize(finalWithQuotes, width);
          } else {
            // Absolute last resort fallback
            const rawWithQuotes = hasOuterQuotes ? `"${firstSentence}"` : firstSentence;
            const lines = doc.splitTextToSize(rawWithQuotes, width);
            bestLines = lines.slice(0, 3);
            if (bestLines[2]) {
              bestLines[2] = bestLines[2].replace(/[\s.,;!?-]+$/, '') + '.';
            } else if (bestLines[1]) {
              bestLines[1] = bestLines[1].replace(/[\s.,;!?-]+$/, '') + '.';
            } else if (bestLines[0]) {
              bestLines[0] = bestLines[0].replace(/[\s.,;!?-]+$/, '') + '.';
            }
          }
        }

        return bestLines;
      };

      // Pre-compute quote lines (limited to max 3 lines) to use in sizing decisions
      const bioText = getModelBio(model, lang).quote;
      let quoteWidth = colWidth - 4;
      if (numSecondary === 0) {
        quoteWidth = 168;
      } else if (numSecondary === 1) {
        quoteWidth = 78;
      }

      const splitBio = getIntelligentTruncatedBio(bioText, quoteWidth);

      // Let's determine if the layout fits on the page for numSecondary >= 2
      // Standard page limit before the footer (at 282mm)
      let secY = 178; // Default
      if (numSecondary >= 2) {
        const maxPhotoEnd = 274;
        const secPhotoH = numSecondary === 2 ? 88 : 80;
        const maxSecY = maxPhotoEnd - 6 - secPhotoH; // 180 for 2 photos, 188 for 3 photos

        // Initial positions based on default parameters
        let currentY = startY + 6 + (8 * specsRowHeight);
        let quoteY = currentY + 4;
        let quoteEnd = quoteY + (splitBio.length * 4.5) + 2;
        let minSecY = quoteEnd + 8; // Margin of 8mm

        if (minSecY > maxSecY) {
          // If it doesn't fit, reduce the size of the main photo and specs height
          const deficit = minSecY - maxSecY;
          const reduction = Math.min(deficit, 15); // reduce up to 15mm
          photoH -= reduction;
          photoW = Math.round(photoH * (95 / 120));
          rightColX = 195 - photoW; // Keep aligned to right margin

          // Scale specs row height down proportionally to save vertical space
          specsRowHeight = 10 - (reduction * 0.1);
          specsRowHeight = Math.max(specsRowHeight, 8.5); // don't go below 8.5mm

          // Recalculate positions with smaller dimensions
          currentY = startY + 6 + (8 * specsRowHeight);
          quoteY = currentY + 4;
          quoteEnd = quoteY + (splitBio.length * 4.5) + 2;
          minSecY = quoteEnd + 8;
        }

        // Apply final secY ensuring at least 8mm margin
        secY = Math.max(178, quoteEnd + 8);
        if (secY > maxSecY) {
          secY = maxSecY;
        }
      }

      // --- 3. SPECS (LEFT COLUMN) ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(lang === 'es' ? 'PERFIL PROFESIONAL' : 'PROFESSIONAL SPECS', leftColX, startY);

      const calculatedAge = calculateAge(model.fecha_nacimiento);
      const finalAge = calculatedAge !== null ? calculatedAge : model.edad;

      const specs = [
        [TRANSLATIONS[lang].age, TRANSLATIONS[lang].years(finalAge)],
        [TRANSLATIONS[lang].skinTone, translateValue(model.piel, lang)],
        [TRANSLATIONS[lang].eyeColor, translateValue(model.ojos, lang)],
        [TRANSLATIONS[lang].height, `${model.estatura} cm`],
        [TRANSLATIONS[lang].busto, model.busto ? `${model.busto} cm` : '—'],
        [TRANSLATIONS[lang].cintura, model.cintura ? `${model.cintura} cm` : '—'],
        [TRANSLATIONS[lang].caderas, model.caderas ? `${model.caderas} cm` : '—'],
        [TRANSLATIONS[lang].shoeSize, `${model.calzado}`],
      ];

      let currentY = startY + 6;
      specs.forEach(([label, value]) => {
        // Draw horizontal separator
        doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
        doc.setLineWidth(0.25);
        doc.line(leftColX, currentY, leftColX + colWidth, currentY);

        // Red bullet square or point
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(leftColX, currentY + 3.2, 1.5, 1.5, 'F');

        // Label (Gray)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(label.toUpperCase(), leftColX + 4, currentY + 4.5);

        // Value (Black)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(value, leftColX + colWidth - 2, currentY + 4.5, { align: 'right' });

        currentY += specsRowHeight;
      });

      // Bio/Editorial Quote - placement depends on whether there are secondary photos
      if (numSecondary >= 2) {
        // Draw standard bio card below specs for models with 2 or 3 secondary photos
        const quoteY = currentY + 4;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(0.8);
        doc.line(leftColX, quoteY, leftColX, quoteY + (splitBio.length * 4.5) + 2);
        
        doc.text(splitBio, leftColX + 3, quoteY + 4);
      }

      // --- 4. MAIN PHOTO (RIGHT COLUMN) ---
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.setLineWidth(0.3);
      doc.rect(rightColX, rightColY, photoW, photoH);

      if (mainPhotoDataUrl) {
        doc.addImage(mainPhotoDataUrl, 'JPEG', rightColX, rightColY, photoW, photoH, undefined, 'FAST');
      } else {
        // Draw initials placeholder
        doc.setFillColor(245, 245, 245);
        doc.rect(rightColX, rightColY, photoW, photoH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(32);
        doc.setTextColor(200, 200, 200);
        doc.text(`${model.nombre[0]}${model.apellidos[0]}`, rightColX + (photoW / 2), rightColY + (photoH / 2), { align: 'center' });
        doc.setFontSize(10);
        doc.text('PORTAFOLIO', rightColX + (photoW / 2), rightColY + (photoH / 2) + 12, { align: 'center' });
      }

      // --- 5. BOTTOM SECTION / SECONDARY PHOTOS ---
      if (numSecondary === 0) {
        // No secondary photos: draw a majestic full-width personalized quote card at the bottom
        const boxX = 15;
        const boxY = 203;
        const boxW = 180;
        const boxH = 68;

        // Soft background box
        doc.setFillColor(248, 248, 248);
        doc.rect(boxX, boxY, boxW, boxH, 'F');

        // Elegant thick left accent line in red
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(1.2);
        doc.line(boxX, boxY, boxX, boxY + boxH);

        // Personalized Quote text
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 30);
        doc.text(splitBio, boxX + 6, boxY + 8);

        // Subtle horizontal divider inside card
        const bioHeight = splitBio.length * 4.8;
        const divY = boxY + 11 + bioHeight;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.25);
        doc.line(boxX + 6, divY, boxX + 174, divY);

        // Visual Style/Vibe (Sub-column 1)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(lang === 'es' ? 'ESTILO VISUAL / VIBE' : 'VISUAL STYLE / VIBE', boxX + 6, divY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(getModelBio(model, lang).vibe, boxX + 6, divY + 9);

        // Recommendations (Sub-column 2) - stacked vertically as bullet points to avoid truncation
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(lang === 'es' ? 'RECOMENDACIÓN DE CASTING' : 'CASTING RECOMMENDATION', boxX + 95, divY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        const recs = getModelBio(model, lang).recommendations;
        recs.forEach((rec, idx) => {
          doc.text(`• ${rec}`, boxX + 95, divY + 9 + (idx * 4.2));
        });

      } else if (numSecondary === 1) {
        // Exactly 1 secondary photo: draw a balanced side-by-side layout at the bottom
        const bottomY = 178;
        const bottomH = 92;

        // Left Column: Beautiful Bio/Quote Box (X=15 to X=105, width=90)
        const boxX = 15;
        const boxY = bottomY;
        const boxW = 90;
        const boxH = bottomH;

        doc.setFillColor(248, 248, 248);
        doc.rect(boxX, boxY, boxW, boxH, 'F');

        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(1.2);
        doc.line(boxX, boxY, boxX, boxY + boxH);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 30, 30);
        doc.text(splitBio, boxX + 6, boxY + 10);

        const bioHeight = splitBio.length * 4.8;
        const divY = boxY + 14 + bioHeight;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.25);
        doc.line(boxX + 6, divY, boxX + 84, divY);

        // Visual Style in Bio Box
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
        doc.text(lang === 'es' ? 'ESTILO VISUAL / VIBE' : 'VISUAL STYLE / VIBE', boxX + 6, divY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(getModelBio(model, lang).vibe, boxX + 6, divY + 9);

        // Right Column: The Single Secondary Photo (X=113 to X=195, width=82)
        const pX = 113;
        const pY = bottomY;
        const pW = 82;
        const pH = bottomH;

        doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
        doc.setLineWidth(0.3);
        doc.rect(pX, pY, pW, pH);
        doc.addImage(loadedSecPhotos[0], 'JPEG', pX, pY, pW, pH, undefined, 'FAST');

      } else {
        // 2 or 3 secondary photos: draw standard headers and photos
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(lang === 'es' ? 'REPERTORIO FOTOGRÁFICO' : 'GALLERY BOOK', 15, secY);

        if (numSecondary === 2) {
          const secPhotoW = 84;
          const secPhotoH = 88;
          const secGap = 12;

          // Photo 1
          doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
          doc.setLineWidth(0.2);
          doc.rect(15, secY + 6, secPhotoW, secPhotoH);
          doc.addImage(loadedSecPhotos[0], 'JPEG', 15, secY + 6, secPhotoW, secPhotoH, undefined, 'FAST');

          // Photo 2
          doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
          doc.setLineWidth(0.2);
          doc.rect(15 + secPhotoW + secGap, secY + 6, secPhotoW, secPhotoH);
          doc.addImage(loadedSecPhotos[1], 'JPEG', 15 + secPhotoW + secGap, secY + 6, secPhotoW, secPhotoH, undefined, 'FAST');

        } else {
          // Exactly 3 secondary photos
          const secPhotoW = 54;
          const secPhotoH = 80;
          const secGap = 9;

          for (let i = 0; i < 3; i++) {
            const pX = 15 + i * (secPhotoW + secGap);
            const pY = secY + 6;

            doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
            doc.setLineWidth(0.2);
            doc.rect(pX, pY, secPhotoW, secPhotoH);
            doc.addImage(loadedSecPhotos[i], 'JPEG', pX, pY, secPhotoW, secPhotoH, undefined, 'FAST');
          }
        }
      }

      // --- 6. FOOTER BRANDING ---
      doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
      doc.setLineWidth(0.3);
      doc.line(15, 282, 195, 282);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('planet talent · Agencia de Modelos', 105, 288, { align: 'center' });

      // Save File
      doc.save(`PlanetTalent_${model.nombre}_${model.apellidos}.pdf`);
      toast.dismiss(toastId);
      toast.success(lang === 'es' ? 'Ficha profesional PDF generada con éxito' : 'Professional PDF generated successfully!', { icon: '📄' });
    } catch (error) {
      console.error("PDF generation error", error);
      toast.dismiss(toastId);
      toast.error(lang === 'es' ? 'Error al generar el PDF de la modelo.' : 'Error generating model PDF.');
    }
  };

  // Share Model details on WhatsApp/Clipboard
  const shareModelWhatsApp = (model: Model) => {
    const webUrl = window.location.origin;
    const text = lang === 'es'
      ? `Modelo: ${model.nombre} ${model.apellidos}\nPerfil completo en: ${webUrl}`
      : `Model: ${model.nombre} ${model.apellidos}\nFull profile at: ${webUrl}`;
        
    navigator.clipboard.writeText(text);
    toast.success(lang === 'es' ? '¡Resumen de la modelo copiado!' : 'Model summary copied!', { icon: '📲' });
  };

  const activeModels = dbModels.filter(m => m.photos && m.photos.length > 0);

  const modalStaggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const modalStaggerItem = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: [0.21, 1.02, 0.48, 1] }
    }
  };
  
  // Advanced Filters helpers and dynamic lists
  const availableSkins: string[] = Array.from(new Set(activeModels.map(m => m.piel).filter(Boolean))) as string[];
  const availableEyes: string[] = Array.from(new Set(activeModels.map(m => m.ojos).filter(Boolean))) as string[];
  const availableShoes: string[] = Array.from(new Set(activeModels.map(m => m.calzado).filter(Boolean))).sort() as string[];

  const activeFiltersCount = 
    selectedSkins.length + 
    selectedEyes.length + 
    selectedShoes.length + 
    (minHeight > 150 || maxHeight < 200 ? 1 : 0) + 
    (minAge > 15 || maxAge < 50 ? 1 : 0);

  const toggleSkin = (skin: string) => {
    setSelectedSkins(prev => 
      prev.includes(skin) ? prev.filter(s => s !== skin) : [...prev, skin]
    );
    setFilter('all');
  };

  const toggleEye = (eye: string) => {
    setSelectedEyes(prev => 
      prev.includes(eye) ? prev.filter(e => e !== eye) : [...prev, eye]
    );
  };

  const toggleShoe = (shoe: string) => {
    setSelectedShoes(prev => 
      prev.includes(shoe) ? prev.filter(s => s !== shoe) : [...prev, shoe]
    );
  };

  const handleQuickTagClick = (tagId: string) => {
    setFilter(tagId);
    if (tagId === 'all') {
      setSelectedSkins([]);
      setMinHeight(150);
      setMaxHeight(200);
      setSelectedEyes([]);
      setSelectedShoes([]);
      setMinAge(15);
      setMaxAge(50);
    } else if (tagId === '175+') {
      setMinHeight(175);
      setMaxHeight(200);
      setSelectedSkins([]);
    } else {
      setSelectedSkins([tagId]);
      if (minHeight === 175) {
        setMinHeight(150);
      }
    }
  };

  const handleResetFilters = () => {
    setFilter('all');
    setSearchQuery('');
    setShowFavoritesOnly(false);
    setSelectedSkins([]);
    setSelectedEyes([]);
    setSelectedShoes([]);
    setMinHeight(150);
    setMaxHeight(200);
    setMinAge(15);
    setMaxAge(50);
  };

  // Filtering & Search & Sort
  const baseModels = activeModels.filter(m => {
    // Search filter
    const matchesSearch = 
      m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.apellidos.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Favorites filter
    const matchesFavorites = showFavoritesOnly ? favorites.includes(m.id) : true;

    return matchesSearch && matchesFavorites;
  });

  const getTagCount = (tagId: string) => {
    if (tagId === 'all') return baseModels.length;
    if (tagId === '175+') return baseModels.filter(m => m.estatura >= 175).length;
    return baseModels.filter(m => m.piel === tagId).length;
  };

  const filteredModels = baseModels.filter(m => {
    // 1. Skin tone filter (multiple)
    if (selectedSkins.length > 0) {
      if (!selectedSkins.includes(m.piel)) return false;
    }

    // 2. Eye color filter (multiple)
    if (selectedEyes.length > 0) {
      if (!selectedEyes.includes(m.ojos)) return false;
    }

    // 3. Shoe size filter (multiple)
    if (selectedShoes.length > 0) {
      if (!selectedShoes.includes(m.calzado)) return false;
    }

    // 4. Height range filter
    if (m.estatura < minHeight || m.estatura > maxHeight) return false;

    // 5. Age range filter
    const mAge = calculateAge(m.fecha_nacimiento) || m.edad;
    if (mAge < minAge || mAge > maxAge) return false;

    // 6. Quick category filter
    if (filter !== 'all') {
      if (filter === '175+') {
        if (m.estatura < 175) return false;
      } else {
        if (selectedSkins.length === 0 && m.piel !== filter) return false;
      }
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'nivel') {
      const countA = getModelFollowerCount(a.instagram);
      const countB = getModelFollowerCount(b.instagram);
      if (countB !== countA) {
        return countB - countA;
      }
      return a.nombre.localeCompare(b.nombre);
    }
    if (sortBy === 'nombre') {
      return a.nombre.localeCompare(b.nombre);
    }
    if (sortBy === 'estatura') {
      return b.estatura - a.estatura;
    }
    if (sortBy === 'edad') {
      const ageA = calculateAge(a.fecha_nacimiento) || a.edad;
      const ageB = calculateAge(b.fecha_nacimiento) || b.edad;
      return ageA - ageB;
    }
    return 0; // default
  });

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setBookingError('');

    const today = new Date().toISOString().split('T')[0];
    if (bookingDate < today) {
      setBookingError(lang === 'es' ? 'La fecha del evento no puede ser anterior a la fecha de hoy.' : 'Event date cannot be in the past.');
      setBookingLoading(false);
      return;
    }

    try {
      const cleanDetails = bookingMsg.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
      const { error } = await supabase.from('bookings').insert([
        {
          nombre: bookingName,
          email: bookingEmail,
          telefono: bookingPhone || null,
          empresa: bookingCompany || null,
          fecha_evento: bookingDate,
          detalles: cleanDetails,
          estado: 'pendiente'
        }
      ]);

      if (error) {
        throw error;
      }

      // Try to send notification, but don't block the user if it fails
      try {
        let selectedModelNames = 'General';
        if (selectedModel) {
          selectedModelNames = selectedModel.nombre;
        } else if (favorites.length > 0) {
          selectedModelNames = activeModels.filter(m => favorites.includes(m.id)).map(m => m.nombre).join(', ');
        }

        const telegramBotToken = '8875004415:AAED6CX7msEFkNuqBn9Xagv4jq7KHT4WQbw';
        const telegramChatId = '-1004303735696';
        
        const escapeHTML = (str: string) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const telegramMessage = `<b>🔔 Nueva solicitud de booking</b>\n\n👤 <b>Cliente:</b> ${escapeHTML(bookingName)}\n📱 <b>Modelos:</b> ${escapeHTML(selectedModelNames)}\n📅 <b>Fecha del evento:</b> ${escapeHTML(bookingDate)}\n\nRevisa el panel de administración para más detalles`;
        
        // Direct Telegram API call from client
        fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text: telegramMessage,
            parse_mode: 'HTML'
          })
        }).then(res => res.json()).then(data => {
          if (!data.ok) {
             console.error("Telegram API error:", data);
          } else {
             console.log("Telegram notification sent successfully directly from client");
          }
        }).catch(err => {
          console.error("Fetch to Telegram failed:", err);
        });

        // Still call the backend to send WhatsApp if needed
        await fetch('/api/notify-booking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            nombre: bookingName,
            modelos: selectedModelNames,
            fecha: bookingDate
          })
        });
      } catch (notifyErr) {
        console.error("Failed to send notification:", notifyErr);
      }

      invalidateBookingsCache();
      playBookingNotificationSound();
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setShowBookingForm(false);
        // Clear fields
        setBookingName('');
        setBookingEmail('');
        setBookingPhone('');
        setBookingCompany('');
        setBookingDate('');
        setBookingMsg('');
      }, 3000);
    } catch (err: any) {
      console.error('Error submitting booking:', err);
      if (err.message && err.message.includes('Could not find the table')) {
        const errorMsg = lang === 'es'
          ? 'Error: La tabla "bookings" no existe en la base de datos de Supabase. El administrador debe ejecutar las consultas en "supabase.sql" en la consola de Supabase.'
          : 'Error: The "bookings" table does not exist in your Supabase database. The administrator must execute the SQL in "supabase.sql" in their Supabase console.';
        setBookingError(errorMsg);
      } else {
        setBookingError(err.message || (lang === 'es' ? 'Error al enviar la solicitud' : 'Error sending request'));
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const openModelDetail = async (model: Model) => {
    setSelectedModel(model);
    setActivePhotoIdx(0);
  };

  if (session) {
    return <ManagerDashboard onLogout={handleLogout} />;
  }

  return (
    <div id="root-container" className="min-h-screen bg-[#0A0A0A] text-[#F8F6F2] font-sans selection:bg-[#CC0000] selection:text-white">
      <Toaster 
        theme="dark" 
        position="bottom-center" 
        toastOptions={{ 
          style: { 
            background: '#0A0A0A', 
            color: '#FFFFFF', 
            border: '1px solid rgba(204, 0, 0, 0.4)',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(204, 0, 0, 0.2)',
            borderRadius: '4px'
          } 
        }} 
      />
      {/* NAVEGACIÓN DEL CATÁLOGO DE MODELOS */}
      {currentView === 'catalog' && (
        <motion.nav 
          id="nav-bar" 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            backgroundColor: navBg,
            backdropFilter: navBackdropBlur,
            WebkitBackdropFilter: navBackdropBlur,
            paddingTop: navPaddingY,
            paddingBottom: navPaddingY,
            borderBottomColor: navBorderColor
          }}
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-4 sm:px-6 md:px-12 border-b shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-[box-shadow]"
        >
          <motion.button 
            id="logo" 
            style={{ scale: logoScale, originX: 0, originY: 0.5 }}
            onClick={(e) => {
              e.preventDefault();
              setShowManagerLogin(true);
              setLoginError("");
            }}
            title={lang === "es" ? "Acceso a la gestión de la agencia" : "Agency management login"}
            className="flex items-center group appearance-none text-left cursor-pointer shrink-0 will-change-transform"
          >
            <img 
              src="/Logo de Planet Talent.PNG" 
              alt="Planet Talent" 
              className="h-7 sm:h-8 md:h-9 w-auto object-contain origin-left group-hover:opacity-80 transition-opacity duration-300 ease-out drop-shadow-md" 
            />
          </motion.button>
          
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            {/* Selector de Idioma Sutil y Minimalista */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all backdrop-blur-md select-none text-[10px] sm:text-xs">
              <Globe className="w-3 h-3 text-white/50 shrink-0" />
              <button
                onClick={() => changeLang("es")}
                title={lang === "es" ? "Idioma Español seleccionado" : "Cambiar a Español"}
                className={`transition-colors uppercase font-medium tracking-wider cursor-pointer px-0.5 ${
                  lang === "es" 
                    ? "text-white font-semibold" 
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                ES
              </button>
              <span className="text-white/20 text-[9px] font-light">|</span>
              <button
                onClick={() => changeLang("en")}
                title={lang === "es" ? "Cambiar a Inglés" : "English language selected"}
                className={`transition-colors uppercase font-medium tracking-wider cursor-pointer px-0.5 ${
                  lang === "en" 
                    ? "text-white font-semibold" 
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                EN
              </button>
            </div>

            <span id="nav-label" className="text-[10px] md:text-xs tracking-[0.25em] uppercase text-[#8A8A8A] font-medium border-l border-white/10 pl-4 md:pl-6 hidden md:inline-block">
              {TRANSLATIONS[lang].agency}
            </span>
          </div>
        </motion.nav>
      )}

      {currentView === 'course' ? (
        <CourseLanding 
          lang={lang} 
          onGoToCatalog={() => setCurrentView('catalog')} 
          onGoToAdminLogin={() => {
            setShowManagerLogin(true);
            setLoginError('');
          }} 
        />
      ) : (
        <>
          {/* HERO SECTION */}
      <section 
        id="hero-section" 
        ref={heroRef}
        className="relative h-[100dvh] min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Background Slideshow con efecto Ken Burns y desenfoque al scroll */}
        <motion.div 
          style={{ opacity: heroScrollOpacity, filter: heroScrollBlur }}
          className="absolute inset-0 z-0 bg-[#0A0A0A] overflow-hidden pointer-events-none"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={currentHeroIdx}
              initial={{ opacity: 0, filter: "blur(20px)" }}
              animate={{ opacity: 0.25, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(20px)" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full"
            >
              <motion.img
                src={HERO_IMAGES[currentHeroIdx]}
                alt=""
                className="w-full h-full object-cover origin-center grayscale contrast-[1.1] brightness-[0.7]"
                initial={{ scale: 1.0, x: "-1%", y: "-1%" }}
                animate={{ scale: 1.08, x: "1%", y: "1%" }}
                transition={{ duration: 7, ease: "linear" }}
              />
            </motion.div>
          </AnimatePresence>
          {/* Degradados sutiles para mantener el contraste de texto óptimo */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/80 z-10 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/40 via-transparent to-[#0A0A0A]/40 z-10 pointer-events-none"></div>
        </motion.div>
        
        {/* Rejilla decorativa estilizada */}
        <motion.div 
          style={{ opacity: heroScrollOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(204,0,0,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(204,0,0,0.08)_1px,transparent_1px)] bg-[size:60px_60px] z-10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#CC0000] opacity-[0.06] rounded-full filter blur-[100px] z-10"></div>
        </motion.div>

        <motion.div 
          style={{ 
            opacity: heroScrollOpacity, 
            filter: heroScrollBlur,
            scale: heroScrollScale,
            y: heroScrollY
          }}
          className="relative z-10 text-center max-w-5xl px-4 flex flex-col items-center will-change-transform"
        >
          <h1 className="flex flex-col items-center justify-center leading-none text-center select-none mb-3 sm:mb-5">
            {/* 'MODELOS' / 'MODELS' - Animación inicial palabra */}
            <motion.span 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-condensed text-7xl sm:text-8xl md:text-9xl lg:text-[11rem] xl:text-[13rem] text-white leading-none tracking-wider uppercase block drop-shadow-[0_6px_28px_rgba(0,0,0,0.95)]"
            >
              {TRANSLATIONS[lang].models.toUpperCase()}
            </motion.span>

            {/* 'Planet' centrado alineado al medio */}
            <motion.div 
              initial={{ opacity: 0, y: 20, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center justify-center -mt-3 sm:-mt-5 md:-mt-8 z-20"
            >
              <span className="font-brush text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.95)] tracking-wide">
                Planet
              </span>
            </motion.div>
          </h1>
          
          {/* 'Catálogo Oficial · 2026' - Animación inicial subtítulo con acento de rojo de marca en el separador */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="font-sans font-medium text-xs sm:text-sm md:text-base tracking-[0.2em] uppercase text-white/90 mt-5 sm:mt-7 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
          >
            {lang === 'es' ? (
              <>Catálogo Oficial <span className="text-[#CC0000] font-bold">·</span> 2026</>
            ) : (
              <>Official Catalog <span className="text-[#CC0000] font-bold">·</span> 2026</>
            )}
          </motion.p>

          {/* Botón Explorar integrado armónicamente */}
          <motion.button 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => {
              const target = document.getElementById('featured-models-coverflow-section') || document.getElementById('filter-bar-container');
              target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            title={lang === 'es' ? 'Ir a modelos destacadas y catálogo' : 'Go to featured models and catalog'}
            className="mt-8 sm:mt-11 px-6 py-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-white/30 text-white/75 hover:text-white text-[11px] font-semibold tracking-[0.25em] uppercase rounded-full cursor-pointer transition-all duration-300 shadow-sm z-20 flex items-center gap-2 group"
          >
            <span>{TRANSLATIONS[lang].explore}</span>
            <ChevronDown className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-transform duration-300 group-hover:translate-y-0.5" />
          </motion.button>
        </motion.div>
      </section>

      {/* SECCIÓN MODELOS DESTACADAS (COVERFLOW CAROUSEL) */}
      <FeaturedModelsCoverflow 
        models={dbModels}
        bookings={publicBookings}
        lang={lang}
        onSelectModel={openModelDetail}
        onBookModel={(model) => {
          setBookingMsg(TRANSLATIONS[lang].bookingMsgSingle(model.nombre, model.instagram));
          setShowBookingForm(true);
        }}
      />

      {/* PANEL DE FILTROS, BÚSQUEDA Y CONTROL */}
      <motion.div 
        id="filter-bar-container" 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-16 pb-6 border-t border-white/5"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          
          {/* Categorías */}
          <div className="flex flex-col gap-3 w-full lg:w-auto overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[0.2em] uppercase text-[#8A8A8A] font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {TRANSLATIONS[lang].filterBy}
              </span>
              {(filter !== 'all' || searchQuery !== '' || showFavoritesOnly || activeFiltersCount > 0) && (
                <button
                  onClick={handleResetFilters}
                  title={lang === 'es' ? 'Limpiar todos los filtros' : 'Clear all filters'}
                  className="text-[10px] tracking-[0.15em] uppercase text-[#CC0000] font-bold hover:text-[#A00000] transition-colors"
                >
                  {TRANSLATIONS[lang].clearAll}
                </button>
              )}
            </div>
            {/* Scrollable horizontal container for tags on mobile, regular wrap on desktop */}
            <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2.5 py-1 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 lg:flex-wrap scroll-smooth">
              {[
                { id: 'all', label: TRANSLATIONS[lang].all },
                { id: 'Blanca', label: TRANSLATIONS[lang].whiteSkin },
                { id: 'Negra', label: TRANSLATIONS[lang].blackSkin },
                { id: 'Mestiza', label: TRANSLATIONS[lang].mestizaSkin },
                { id: 'Mulata', label: TRANSLATIONS[lang].mulataSkin },
                { id: '175+', label: TRANSLATIONS[lang].heightTag }
              ].map((tag) => {
                const count = getTagCount(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleQuickTagClick(tag.id)}
                    title={lang === 'es' ? `Filtrar por ${tag.label}` : `Filter by ${tag.label}`}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] text-xs tracking-wider uppercase border rounded-sm font-medium ${
                      filter === tag.id || (tag.id !== 'all' && tag.id !== '175+' && selectedSkins.includes(tag.id)) || (tag.id === '175+' && minHeight >= 175)
                        ? 'border-[#CC0000] text-[#F8F6F2] bg-[#CC0000]/10' 
                        : 'border-white/10 text-[#8A8A8A] bg-transparent hover:border-white/30 hover:text-[#F8F6F2]'
                    }`}
                  >
                    <span>{tag.label}</span>
                    <span className={`text-[10px] ${filter === tag.id || (tag.id !== 'all' && tag.id !== '175+' && selectedSkins.includes(tag.id)) || (tag.id === '175+' && minHeight >= 175) ? 'text-[#CC0000]' : 'text-[#8A8A8A]/60'}`}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Búsqueda, Ordenamiento y Filtros Avanzados */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Buscador */}
            <div ref={searchContainerRef} className="relative flex-grow sm:flex-grow-0 sm:w-64">
              <input
                type="text"
                placeholder={TRANSLATIONS[lang].searchPlaceholder}
                title={lang === 'es' ? 'Buscar modelo por nombre' : 'Search model by name'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-10 pr-4 py-3 min-h-[44px] text-xs text-[#F8F6F2] bg-black/50 border border-white/30 rounded-sm focus:outline-none focus:border-[#CC0000]/80 transition-all font-medium placeholder-[#8A8A8A]"
              />
              <Search className="w-4 h-4 text-[#8A8A8A] absolute left-3.5 top-3.5" />

              {/* Lista de Autocompletado */}
              {showSuggestions && searchQuery.trim() !== '' && (() => {
                const query = searchQuery.toLowerCase().trim();
                const suggestions = activeModels.filter(m => {
                  const fullName = `${m.nombre} ${m.apellidos}`.toLowerCase();
                  return fullName.includes(query);
                }).slice(0, 5);

                if (suggestions.length === 0) return null;

                return (
                  <div className="absolute left-0 right-0 mt-1 z-45 bg-[#0C0C0C]/95 backdrop-blur-md border border-white/10 rounded-sm shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-white/5">
                    {suggestions.map((m) => {
                      const modelPhoto = (m.photos && m.photos.length > 0) ? resolvePhoto(m.photos[0]) : '';
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSearchQuery(`${m.nombre} ${m.apellidos}`);
                            setShowSuggestions(false);
                          }}
                          title={lang === 'es' ? `Seleccionar a ${m.nombre} ${m.apellidos}` : `Select ${m.nombre} ${m.apellidos}`}
                          className="w-full text-left px-4 py-3 text-xs text-[#F8F6F2]/80 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3"
                        >
                          {modelPhoto ? (
                            <img src={modelPhoto} alt={m.nombre} className="w-6 h-6 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23111"/><text x="50" y="50" font-family="sans-serif" font-size="10" fill="%23555" text-anchor="middle" dominant-baseline="middle">N/A</text></svg>'; e.currentTarget.className = e.currentTarget.className + ' object-contain p-8'; }} />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-white/50">
                              {m.nombre[0]}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold">{m.nombre} {m.apellidos}</span>
                            {m.instagram && (
                              <span className="text-[9px] text-[#8A8A8A] font-mono">@{m.instagram.split('|')[0].replace('@', '')}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Ordenamiento */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                title={lang === 'es' ? 'Ordenar catálogo de modelos' : 'Sort model catalog'}
                className="w-full appearance-none pl-10 pr-8 py-3 min-h-[44px] text-xs text-[#8A8A8A] hover:text-[#F8F6F2] bg-black/50 border border-white/30 rounded-sm focus:outline-none focus:border-[#CC0000]/80 transition-all font-medium cursor-pointer"
              >
                <option value="default" className="bg-[#0A0A0A] text-[#8A8A8A]">{TRANSLATIONS[lang].sortDefault}</option>
                <option value="nivel" className="bg-[#0A0A0A] text-[#8A8A8A]">{TRANSLATIONS[lang].sortLevel}</option>
                <option value="nombre" className="bg-[#0A0A0A] text-[#8A8A8A]">{TRANSLATIONS[lang].sortName}</option>
                <option value="estatura" className="bg-[#0A0A0A] text-[#8A8A8A]">{TRANSLATIONS[lang].sortHeight}</option>
                <option value="edad" className="bg-[#0A0A0A] text-[#8A8A8A]">{TRANSLATIONS[lang].sortAge}</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            {/* Botón Guía Niveles de Influencer */}
            <button
              type="button"
              onClick={() => setShowLevelGuideModal(true)}
              title={lang === 'es' ? 'Ver información sobre Niveles de Influencer y Alcance' : 'View Influencer Levels & Reach Guide'}
              className="flex items-center justify-center gap-2 px-3.5 py-3 min-h-[44px] text-xs uppercase tracking-wider border border-white/15 bg-black/50 hover:bg-white/5 hover:border-white/30 text-[#8A8A8A] hover:text-[#F8F6F2] rounded-sm font-medium transition-all cursor-pointer shadow-sm"
            >
              <Crown className="w-3.5 h-3.5 text-[#F2E3C0]/80 shrink-0" />
              <span className="font-medium whitespace-nowrap">{lang === 'es' ? 'Niveles de Influencer' : 'Influencer Levels'}</span>
            </button>

            {/* Botón Mi Selección */}
            <button
              type="button"
              id="shortlist-btn"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              title={lang === 'es' ? 'Ver mi selección de casting' : 'View my casting selection'}
              className={`flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] text-xs uppercase tracking-wider border rounded-sm font-medium transition-all cursor-pointer shadow-sm ${
                showFavoritesOnly 
                  ? 'border-white/30 text-[#F8F6F2] bg-white/10' 
                  : 'border-white/15 bg-black/50 hover:bg-white/5 hover:border-white/30 text-[#8A8A8A] hover:text-[#F8F6F2]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 transition-colors shrink-0 ${favorites.length > 0 || showFavoritesOnly ? 'fill-[#CC0000] text-[#CC0000]' : 'fill-none text-[#8A8A8A]'}`} />
              <span className="whitespace-nowrap">{TRANSLATIONS[lang].mySelection} ({favorites.length})</span>
            </button>

            {/* Botón Filtros Avanzados */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              title={lang === 'es' ? 'Abrir u ocultar filtros avanzados' : 'Toggle advanced filters'}
              className={`flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] text-xs uppercase tracking-wider border rounded-sm font-medium ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'border-[#CC0000] text-[#F8F6F2] bg-[#CC0000]/10'
                  : 'border-white/10 text-[#8A8A8A] bg-transparent hover:border-white/30 hover:text-[#F8F6F2]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{TRANSLATIONS[lang].advancedFilters}</span>
              {activeFiltersCount > 0 && (
                <span className="inline-flex items-center justify-center bg-[#CC0000] text-white text-[9px] font-bold rounded-full w-5 h-5">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* PANEL DESPLEGABLE DE FILTROS AVANZADOS */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden mt-6"
            >
              <motion.div
                variants={panelContainerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-sm relative"
              >
                
                {/* 1. Tono de Piel */}
                <motion.div variants={panelItemVariants} className="flex flex-col gap-3">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#8A8A8A] font-bold">
                    {TRANSLATIONS[lang].filterBySkin}
                  </span>
                  <div className="flex flex-col gap-2">
                    {availableSkins.map(skin => {
                      const isSelected = selectedSkins.includes(skin);
                      return (
                        <button
                          key={skin}
                          type="button"
                          onClick={() => toggleSkin(skin)}
                          className={`flex items-center justify-between px-3 py-2 text-xs border rounded-sm transition-all text-left ${
                            isSelected 
                              ? 'border-[#CC0000]/60 bg-[#CC0000]/5 text-[#F8F6F2]' 
                              : 'border-white/5 bg-[#121212]/40 text-[#8A8A8A] hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span>{translateValue(skin, lang)}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#CC0000]' : 'bg-transparent'}`} />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* 2. Color de Ojos */}
                <motion.div variants={panelItemVariants} className="flex flex-col gap-3">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#8A8A8A] font-bold">
                    {TRANSLATIONS[lang].filterByEyes}
                  </span>
                  <div className="flex flex-col gap-2">
                    {availableEyes.map(eye => {
                      const isSelected = selectedEyes.includes(eye);
                      return (
                        <button
                          key={eye}
                          type="button"
                          onClick={() => toggleEye(eye)}
                          className={`flex items-center justify-between px-3 py-2 text-xs border rounded-sm transition-all text-left ${
                            isSelected 
                              ? 'border-[#CC0000]/60 bg-[#CC0000]/5 text-[#F8F6F2]' 
                              : 'border-white/5 bg-[#121212]/40 text-[#8A8A8A] hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span>{translateValue(eye, lang)}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#CC0000]' : 'bg-transparent'}`} />
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* 3. Talla de Calzado */}
                <motion.div variants={panelItemVariants} className="flex flex-col gap-3 col-span-1 sm:col-span-2 lg:col-span-1">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#8A8A8A] font-bold">
                    {TRANSLATIONS[lang].filterByShoes}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {availableShoes.map(shoe => {
                      const isSelected = selectedShoes.includes(shoe);
                      return (
                        <button
                          key={shoe}
                          type="button"
                          onClick={() => toggleShoe(shoe)}
                          className={`py-1.5 text-xs text-center border rounded-sm transition-all font-mono ${
                            isSelected 
                              ? 'border-[#CC0000]/60 bg-[#CC0000]/10 text-[#F8F6F2]' 
                              : 'border-white/5 bg-[#121212]/40 text-[#8A8A8A] hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {shoe}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* 4. Rango de Estatura */}
                <motion.div variants={panelItemVariants} className="flex flex-col gap-3">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#8A8A8A] font-bold flex items-center justify-between">
                    <span>{TRANSLATIONS[lang].filterByHeight}</span>
                    <span className="text-[#CC0000] font-mono text-[11px] normal-case font-medium">{minHeight} - {maxHeight} cm</span>
                  </span>
                  <div className="flex flex-col gap-4 bg-[#121212]/40 border border-white/5 p-3 rounded-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] font-mono">
                        <span>{TRANSLATIONS[lang].minHeightLabel}</span>
                        <span>{minHeight} cm</span>
                      </div>
                      <input
                        type="range"
                        min="150"
                        max="200"
                        value={minHeight}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setMinHeight(val);
                          if (val > maxHeight) setMaxHeight(val);
                        }}
                        className="w-full accent-[#CC0000] h-1 bg-white/10 rounded-lg cursor-pointer animate-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] font-mono">
                        <span>{TRANSLATIONS[lang].maxHeightLabel}</span>
                        <span>{maxHeight} cm</span>
                      </div>
                      <input
                        type="range"
                        min="150"
                        max="200"
                        value={maxHeight}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setMaxHeight(val);
                          if (val < minHeight) setMinHeight(val);
                        }}
                        className="w-full accent-[#CC0000] h-1 bg-white/10 rounded-lg cursor-pointer animate-none"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* 5. Rango de Edad */}
                <motion.div variants={panelItemVariants} className="flex flex-col gap-3">
                  <span className="text-[10px] tracking-[0.15em] uppercase text-[#8A8A8A] font-bold flex items-center justify-between">
                    <span>{TRANSLATIONS[lang].filterByAge}</span>
                    <span className="text-[#CC0000] font-mono text-[11px] normal-case font-medium">{minAge} - {maxAge} {lang === 'es' ? 'años' : 'yrs'}</span>
                  </span>
                  <div className="flex flex-col gap-4 bg-[#121212]/40 border border-white/5 p-3 rounded-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] font-mono">
                        <span>{TRANSLATIONS[lang].minAgeLabel}</span>
                        <span>{minAge} {lang === 'es' ? 'años' : 'yrs'}</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="50"
                        value={minAge}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setMinAge(val);
                          if (val > maxAge) setMaxAge(val);
                        }}
                        className="w-full accent-[#CC0000] h-1 bg-white/10 rounded-lg cursor-pointer animate-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] font-mono">
                        <span>{TRANSLATIONS[lang].maxAgeLabel}</span>
                        <span>{maxAge} {lang === 'es' ? 'años' : 'yrs'}</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="50"
                        value={maxAge}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setMaxAge(val);
                          if (val < minAge) setMinAge(val);
                        }}
                        className="w-full accent-[#CC0000] h-1 bg-white/10 rounded-lg cursor-pointer animate-none"
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Bottom Bar inside layout for actions */}
                <motion.div variants={panelItemVariants} className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-5 flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                  <span className="text-[10px] text-[#8A8A8A] font-mono uppercase tracking-wider">
                    {TRANSLATIONS[lang].matchingModels}: <span className="text-[#CC0000] font-bold font-sans text-xs ml-1"><AnimatedNumber value={filteredModels.length} /></span>
                  </span>
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[10px] tracking-widest uppercase font-bold text-[#CC0000] hover:text-white transition-all bg-[#CC0000]/10 border border-[#CC0000]/20 hover:bg-[#CC0000]/20 px-3 py-1.5 rounded-sm"
                    >
                      {TRANSLATIONS[lang].resetFilters}
                    </button>
                  )}
                </motion.div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shortlist Action Bar */}
        {showFavoritesOnly && (
          <div className="mt-6 p-4 rounded bg-black/50 border border-white/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5 text-[#CC0000] fill-[#CC0000]" />
              <div>
                <h4 className="text-sm font-serif font-medium">{TRANSLATIONS[lang].shortlistTitle}</h4>
                <p className="text-xs text-[#8A8A8A]">{TRANSLATIONS[lang].shortlistDesc(favorites.length)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={copyShortlist}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider font-semibold bg-white/10 text-white rounded-sm hover:bg-white/20 transition-all min-h-[44px]"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? TRANSLATIONS[lang].copiedSelection : TRANSLATIONS[lang].copySelection}
              </button>
              <button
                onClick={exportSelectionPDF}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider font-semibold bg-black/50 border border-white/30 text-white rounded-sm hover:bg-white/10 transition-all min-h-[44px]"
              >
                <FileDown className="w-3.5 h-3.5 text-[#CC0000]" />
                {TRANSLATIONS[lang].downloadSelectionPDF}
              </button>
              <button
                onClick={() => {
                  setShowBookingForm(true);
                  setBookingMsg(TRANSLATIONS[lang].bookingMsgGroup(
                    activeModels.filter(m => favorites.includes(m.id)).map(m => `- ${m.nombre} ${m.apellidos}`).join('\n')
                  ));
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 text-xs uppercase tracking-wider font-semibold bg-[#CC0000] text-white rounded-sm hover:bg-[#CC0000]/90 transition-all min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {TRANSLATIONS[lang].bookGroup}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* GRID DE MODELOS */}
      <section id="models-grid-section" className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 border-b border-white/5 pb-6"
        >
          <div className="flex flex-col items-start justify-center">
            {/* Tagline superior tipo 'Selección Exclusiva' */}
            <motion.div 
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2 mb-2 sm:mb-2.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#CC0000] animate-pulse shrink-0"></span>
              <span className="font-sans font-medium text-[11px] sm:text-xs md:text-sm tracking-[0.2em] uppercase text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {showFavoritesOnly ? (lang === 'es' ? 'Selección Guardada' : 'Saved Selection') : (lang === 'es' ? 'Catálogo Oficial' : 'Official Catalog')}
              </span>
            </motion.div>
            
            {/* 'Nuestras Modelos' con exactamente la misma tipografía font-condensed de 'Modelos Destacadas' */}
            <motion.h2 
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-baseline gap-2 sm:gap-3.5 select-none"
            >
              <span className="font-condensed text-3xl sm:text-5xl md:text-6xl text-white tracking-wider leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                {lang === 'es' ? 'Nuestras' : 'Our'}
              </span>
              <span className="font-condensed text-3xl sm:text-5xl md:text-6xl text-white tracking-wider leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                {lang === 'es' ? 'Modelos' : 'Models'}
              </span>
            </motion.h2>
          </div>

          <span id="model-count-label" className="font-sans text-xs sm:text-sm text-[#8A8A8A] tracking-wider font-medium border border-white/10 px-3.5 py-1.5 rounded-full bg-white/5 backdrop-blur-md self-start sm:self-auto">
            <AnimatedNumber value={filteredModels.length} /> {filteredModels.length === 1 ? (lang === 'es' ? 'modelo' : 'model') : (lang === 'es' ? 'modelos' : 'models')}
          </span>
        </motion.div>

        {modelsLoadError ? (
          <div className="py-16 px-6 max-w-md mx-auto text-center bg-[#141414] border border-white/5 rounded-sm relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#CC0000]"></div>
            <div className="relative mb-6 inline-flex w-16 h-16 rounded-full bg-[#CC0000]/10 items-center justify-center text-[#CC0000] font-bold text-2xl border border-[#CC0000]/20 animate-pulse">
              ⚠️
            </div>
            <h3 className="font-serif text-xl text-white mb-2 font-light">
              {lang === 'es' ? 'Error al conectar con la base de datos' : 'Database Connection Error'}
            </h3>
            <p className="text-xs text-[#8A8A8A] mb-8 leading-relaxed">
              {lang === 'es' 
                ? 'No pudimos recuperar el catálogo de modelos en este momento debido a un problema de conexión temporal. El sistema de autoreintento de fondo está activo, o puedes presionar el botón de abajo.' 
                : 'We could not retrieve the models catalog at this moment due to a temporary connection issue. The background auto-retry system is active, or you can press the button below.'}
            </p>
            <button 
              onClick={() => fetchPublicModels(true)}
              className="px-6 py-3 text-xs tracking-[0.2em] uppercase font-bold bg-[#CC0000] hover:bg-[#A30000] text-white rounded-sm shadow-md transition-all active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
              {lang === 'es' ? 'REINTENTAR CONEXIÓN' : 'RETRY CONNECTION'}
            </button>
          </div>
        ) : loadingModels ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-[#CC0000]/10 blur-xl animate-pulse"></div>
              <div className="relative w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-black/40 overflow-hidden">
                <img src="/favicon.svg" className="h-8 w-8 object-contain animate-pulse" alt="Planet Talent Loading" />
                <Loader2 className="absolute w-12 h-12 text-[#CC0000] animate-spin" />
              </div>
            </div>
            <h3 className="font-poppins text-xl text-white mb-2 tracking-wide font-light">
              {TRANSLATIONS[lang].loadingCatalog}
            </h3>
            <p className="text-xs text-[#8A8A8A] max-w-sm mx-auto">
              {TRANSLATIONS[lang].loadingFromDb}
            </p>
          </div>
        ) : (!isFiltering && filteredModels.length === 0) ? (
          <div className="py-24 text-center">
            <p className="font-serif text-2xl text-[#8A8A8A] mb-4">{TRANSLATIONS[lang].noModelsFound}</p>
            <p className="text-xs text-[#8A8A8A] max-w-md mx-auto">{TRANSLATIONS[lang].noModelsDesc}</p>
            {showFavoritesOnly && (
              <button 
                onClick={() => setShowFavoritesOnly(false)} 
                className="mt-6 px-5 py-2.5 text-xs tracking-widest uppercase border border-white/10 text-white rounded-sm hover:border-[#CC0000] transition-colors"
              >
                {TRANSLATIONS[lang].viewAllBtn}
              </button>
            )}
          </div>
        ) : (
          <LayoutGroup>
            <motion.div 
              layout
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6"
            >
              <AnimatePresence mode="popLayout">
              {isFiltering ? (
                Array.from({ length: 12 }).map((_, idx) => (
                  <motion.div
                    key={`skeleton-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative bg-[#111] aspect-[3/4] border border-white/5 rounded-sm overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#111] via-[#1a1a1a] to-[#111] bg-[length:200%_100%] animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                    
                    {/* Fake content for layout consistency */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 flex flex-col gap-2 z-10">
                      <div className="h-5 sm:h-6 bg-white/10 rounded w-1/2"></div>
                      <div className="h-3 sm:h-4 bg-white/5 rounded w-1/3"></div>
                      <div className="flex items-center gap-2 mt-1 sm:mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#CC0000]/20"></div>
                        <div className="h-2.5 sm:h-3 bg-white/5 rounded w-1/4"></div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
              filteredModels.map((model, index) => {
                const mPhotos = model.photos || [];
                const mainPhoto = resolvePhoto(mPhotos[0]);
                const secondPhoto = resolvePhoto(mPhotos[1]);
                const isFav = favorites.includes(model.id);
                const isTouchActive = activeCardId === model.id;

                return (
                  <motion.div
                    key={model.id}
                    layout
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-40px" }}
                    animate={isTouchActive ? "hover" : "visible"}
                    whileHover="hover"
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
                    onClick={(e) => {
                      const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                      if (isTouchDevice) {
                        if (activeCardId !== model.id) {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveCardId(model.id);
                          return;
                        }
                      }
                      openModelDetail(model);
                    }}
                    onMouseLeave={() => {
                      if (!('ontouchstart' in window) && navigator.maxTouchPoints === 0) {
                        setActiveCardId(null);
                      }
                    }}
                    className={`group relative cursor-pointer overflow-hidden bg-[#111] aspect-[3/4] border border-white/5 rounded-sm transition-all duration-500 ${isTouchActive ? 'border-[#CC0000]/50 shadow-[0_0_20px_rgba(204,0,0,0.2)]' : 'hover:border-[#CC0000]/50 hover:shadow-[0_0_20px_rgba(204,0,0,0.2)]'}`}
                  >
                    {/* Fotografías */}
                    <CardImages 
                      mainPhoto={mainPhoto} 
                      secondPhoto={secondPhoto} 
                      model={model} 
                      isTouchActive={isTouchActive} 
                      lang={lang} 
                    />

                    {/* Gradientes para asegurar legibilidad del texto */}
                    <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/80 via-black/35 to-transparent pointer-events-none z-10" />
                    <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-black/90 via-black/50 via-40% to-transparent pointer-events-none z-10" />

                    {/* Botón de favoritos rápido - reubicado debajo de la cinta si la modelo es NUEVA */}
                    <button
                      onClick={(e) => toggleFavorite(model.id, e)}
                      title={isFav ? (lang === 'es' ? 'Quitar de mi selección' : 'Remove from my selection') : (lang === 'es' ? 'Añadir a mi selección' : 'Add to my selection')}
                      className={`absolute ${isModelNew(model) ? 'top-12 sm:top-14' : 'top-3 sm:top-4'} right-3 sm:right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-black/50 border border-white/20 backdrop-blur-md text-white/80 hover:text-white transition-all duration-300 min-h-[36px] shadow-lg ${isTouchActive ? 'opacity-100' : ''}`}
                    >
                      <motion.div
                        initial={false}
                        animate={isFav ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'text-[#CC0000] fill-[#CC0000]' : ''}`} />
                      </motion.div>
                    </button>

                    {/* Cinta diagonal 'NUEVA' (Ribbon) en esquina superior derecha */}
                    {isModelNew(model) && (
                      <NewModelRibbon lang={lang} />
                    )}

                    {/* Top badges - Disponibilidad en esquina superior izquierda */}
                    <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 flex items-center pointer-events-auto transition-all duration-300">
                      <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-lg" title={model.disponible !== false ? (lang === 'es' ? 'Disponible' : 'Available') : (lang === 'es' ? 'No disponible' : 'Not available')}>
                        <span className={`w-1.5 h-1.5 rounded-full ${model.disponible !== false ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-[#777]'}`} />
                        <span className="text-[9px] text-white font-medium tracking-wider uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {model.disponible !== false ? (lang === 'es' ? 'Disponible' : 'Available') : (lang === 'es' ? 'No disp.' : 'Unavailable')}
                        </span>
                      </div>
                    </div>

                    {/* Tarjeta de información en hover / touch */}
                    <div 
                      className={`absolute inset-0 flex flex-col justify-end p-3 sm:p-4 z-20 transition-all duration-500 ease-out bg-gradient-to-t from-black/95 via-black/80 via-40% to-transparent ${isTouchActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'}`}
                    >
                      <div className={`transition-all duration-500 ease-out ${isTouchActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif text-base sm:text-lg font-light text-white leading-[1.1] mb-1 line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {model.nombre}<br />{model.apellidos}
                          </h3>
                          {(() => {
                            const level = getModelLevel(model.instagram);
                            if (!level) return null;
                            return <ModelLevelBadge level={level} size="xs" iconOnly className="shadow-lg cursor-help shrink-0 mt-0.5" />;
                          })()}
                        </div>
                        {(() => {
                          const parts = (model.instagram || "").split("|");
                          const igUser = parts[0];
                          const igFollowers = parts[1];
                          const updatedAt = parts[4];
                          return (
                            <div className="mb-2 flex flex-col gap-0.5">
                              <div className="text-[9px] sm:text-[10px] text-[#FF3333] tracking-wide flex items-center gap-1.5 flex-wrap drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                <span className="font-semibold">{igUser}</span>
                                {igFollowers ? (
                                  <span className="text-[7px] sm:text-[8px] bg-white/15 border border-white/25 px-1 py-0.5 rounded-full text-white font-mono tracking-wider backdrop-blur-sm whitespace-nowrap">
                                    {formatFollowersDisplay(model.instagram)}
                                  </span>
                                ) : (
                                  <span className="text-[7px] sm:text-[8px] bg-white/5 border border-white/10 px-1 py-0.5 rounded-full text-white/50 font-mono tracking-wider backdrop-blur-sm whitespace-nowrap">
                                    {lang === "es" ? "Pendiente" : "Pending"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div 
                        className={`w-8 sm:w-10 h-[1px] bg-[#CC0000] mb-2 sm:mb-3 origin-left transition-all duration-500 ease-out delay-75 ${isTouchActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} 
                      />

                      <div 
                        className={`flex items-center justify-between gap-1 mb-2 sm:mb-3 transition-all duration-500 ease-out delay-100 ${isTouchActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[7px] sm:text-[8px] tracking-wider uppercase text-gray-400 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{TRANSLATIONS[lang].age}</span>
                          <span className="text-[9px] sm:text-[10px] text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{TRANSLATIONS[lang].yearsAbbr(calculateAge(model.fecha_nacimiento) || model.edad)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] sm:text-[8px] tracking-wider uppercase text-gray-400 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{TRANSLATIONS[lang].height}</span>
                          <span className="text-[9px] sm:text-[10px] text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{model.estatura} cm</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[7px] sm:text-[8px] tracking-wider uppercase text-gray-400 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{TRANSLATIONS[lang].eyes}</span>
                          <span className="text-[9px] sm:text-[10px] text-white font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate max-w-[45px] sm:max-w-[60px]" title={translateValue(model.ojos, lang)}>{translateValue(model.ojos, lang)}</span>
                        </div>
                      </div>
                      {model.busto && (
                        <div 
                          className={`flex gap-2 sm:gap-4 text-[9px] sm:text-[10px] text-white/80 tracking-wider font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] transition-all duration-500 ease-out delay-150 ${isTouchActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}
                        >
                          <span>B {model.busto}</span>
                          <span>{lang === 'es' ? 'C' : 'W'} {model.cintura}</span>
                          <span>{lang === 'es' ? 'C' : 'H'} {model.caderas}</span>
                        </div>
                      )}
                    </div>

                    {/* Barra inferior por defecto */}
                    <div 
                      className={`absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-20 flex items-end justify-between gap-2 transition-all duration-500 ease-out ${isTouchActive ? 'translate-y-4 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100 group-hover:translate-y-4 group-hover:opacity-0 group-hover:pointer-events-none'}`}
                    >
                      <div>
                        <h4 className="font-serif text-base sm:text-xl font-normal text-white leading-tight mb-1 drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)]">{model.nombre}</h4>
                        <p className="text-[9px] sm:text-[10px] tracking-widest uppercase text-white/80 font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{model.apellidos}</p>
                      </div>
                      {(() => {
                        const level = getModelLevel(model.instagram);
                        if (!level) return null;
                        return <ModelLevelBadge level={level} size="xs" iconOnly className="shadow-lg cursor-help shrink-0 mb-0.5" />;
                      })()}
                    </div>
                  </motion.div>
                );
              })
              )}
            </AnimatePresence>
          </motion.div>
         </LayoutGroup>
        )}
      </section>

      {/* DETALLE DEL MODELO (MODAL) */}
      <AnimatePresence>
        {selectedModel && (
          <motion.div 
            id="modal"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-[#050505]/85 overflow-y-auto flex items-start justify-center pt-10 pb-10"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedModel(null);
            }}
          >
            {/* Botón cerrar */}
            <button 
              onClick={() => setSelectedModel(null)}
              title={lang === 'es' ? 'Cerrar ficha de la modelo' : 'Close model profile'}
              className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[60] text-[#8A8A8A] hover:text-[#F8F6F2] text-2xl transition-all w-12 h-12 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-lg active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-6 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 md:gap-16 items-start z-10"
            >
              {/* Fotos del Modelo */}
              <div className="flex flex-col gap-4">
                {(selectedModel.photos || []).length > 0 ? (
                  <>
                    <div 
                      className="relative w-full aspect-[3/4] bg-[#111] border border-white/5 overflow-hidden rounded-sm group select-none"
                    >
                      {/* Photo counter overlay */}
                      <div className="absolute top-3 right-3 z-30 bg-[#0A0A0A]/85 backdrop-blur-md text-[10px] text-[#F8F6F2] px-2.5 py-1 rounded-sm border border-white/10 font-mono font-medium tracking-wider pointer-events-none">
                        {activePhotoIdx + 1}/{(selectedModel.photos || []).length}
                      </div>

                      {/* Swipe gesture hint badge on mobile */}
                      {(selectedModel.photos || []).length > 1 && (
                        <div className="absolute top-3 left-3 z-30 bg-[#0A0A0A]/70 backdrop-blur-md text-[9px] text-white/70 px-2 py-0.5 rounded-xs border border-white/10 font-mono tracking-wider pointer-events-none sm:hidden flex items-center gap-1">
                          <span>Swipe 👈👉</span>
                        </div>
                      )}

                      <AnimatePresence initial={false} custom={slideDirection} mode="wait">
                        <motion.div
                          key={activePhotoIdx}
                          custom={slideDirection}
                          variants={slideVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          transition={{ type: "spring", damping: 30, stiffness: 300 }}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.6}
                          onDragEnd={(_, { offset, velocity }) => {
                            const swipe = offset.x;
                            const count = (selectedModel.photos || []).length;
                            if (count > 1) {
                              if (swipe < -40 || velocity.x < -200) {
                                handleNextPhoto(count);
                              } else if (swipe > 40 || velocity.x > 200) {
                                handlePrevPhoto(count);
                              }
                            }
                          }}
                          onTap={() => setShowLightbox(true)}
                          className="absolute inset-0 w-full h-full cursor-zoom-in touch-pan-y"
                        >
                          <motion.img 
                            id="modal-main-photo" 
                            src={resolvePhoto((selectedModel.photos || [])[activePhotoIdx])} 
                            alt={selectedModel.nombre}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-cover pointer-events-none select-none"
                            initial={{ scale: 1 }}
                            animate={{ scale: 1.08 }}
                            transition={{ duration: 6, ease: "linear" }}
                          />
                        </motion.div>
                      </AnimatePresence>

                      {/* Subtle manual arrows */}
                      {(selectedModel.photos || []).length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrevPhoto((selectedModel.photos || []).length);
                            }}
                            title={lang === 'es' ? 'Ver foto anterior' : 'View previous photo'}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/50 text-white/50 hover:text-white transition-all duration-200 backdrop-blur-sm border border-white/5 sm:opacity-0 sm:group-hover:opacity-100 opacity-70"
                            aria-label="Previous"
                          >
                            <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextPhoto((selectedModel.photos || []).length);
                            }}
                            title={lang === 'es' ? 'Ver siguiente foto' : 'View next photo'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/50 text-white/50 hover:text-white transition-all duration-200 backdrop-blur-sm border border-white/5 sm:opacity-0 sm:group-hover:opacity-100 opacity-70"
                            aria-label="Next"
                          >
                            <ChevronRight className="w-4 h-4 stroke-[1.5]" />
                          </button>
                        </>
                      )}
                      
                      {(selectedModel.photos || []).length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                          {(selectedModel.photos || []).map((_, idx) => (
                            <button
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (idx !== activePhotoIdx) {
                                  setSlideDirection(idx > activePhotoIdx ? 1 : -1);
                                  setActivePhotoIdx(idx);
                                }
                              }}
                              className={`w-1.5 h-1.5 rounded-full ${
                                idx === activePhotoIdx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {(selectedModel.photos || []).length > 1 && (
                      <div 
                        id="modal-thumbs" 
                        className="flex overflow-x-auto gap-2 pb-2 snap-x snap-proximity scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                      >
                        {(selectedModel.photos || []).map((p, i) => (
                          <button
                            key={p}
                            onClick={() => {
                              if (i !== activePhotoIdx) {
                                setSlideDirection(i > activePhotoIdx ? 1 : -1);
                                setActivePhotoIdx(i);
                              }
                            }}
                            className={`group flex-shrink-0 w-16 sm:w-20 aspect-[3/4] border overflow-hidden transition-all rounded-sm snap-start ${
                              i === activePhotoIdx ? 'border-[#CC0000] opacity-100 scale-102' : 'border-transparent opacity-50 hover:opacity-100'
                            }`}
                          >
                            <img 
                              src={resolvePhoto(p)} 
                              alt="" 
                              loading="lazy" 
                              decoding="async" 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                              onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23111"/><text x="50" y="50" font-family="sans-serif" font-size="10" fill="%23555" text-anchor="middle" dominant-baseline="middle">N/A</text></svg>'; e.currentTarget.className = e.currentTarget.className + ' object-contain p-8'; }} 
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full aspect-[3/4] bg-[#161616] border border-white/5 flex flex-col items-center justify-center gap-8 rounded-sm">
                    <span className="font-serif text-8xl text-white/5 select-none tracking-widest font-light">
                      {selectedModel.nombre[0]}{selectedModel.apellidos[0]}
                    </span>
                    <div className="text-center">
                      <span className="block text-xs tracking-[0.25em] uppercase text-white/30 font-bold mb-2">
                        {TRANSLATIONS[lang].prepPortfolio}
                      </span>
                      <p className="text-[10px] text-white/20 max-w-xs mx-auto">{TRANSLATIONS[lang].prepPortfolioDesc}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Ficha Técnica / Info */}
              <motion.div 
                variants={modalStaggerContainer}
                initial="hidden"
                animate="visible"
                className="flex flex-col justify-between h-full pt-4"
              >
                <div>
                  <motion.p variants={modalStaggerItem} className="text-[10px] tracking-[0.25em] uppercase text-[#CC0000] font-semibold mb-4">{TRANSLATIONS[lang].techSheet}</motion.p>
                  <motion.h2 variants={modalStaggerItem} id="modal-name" className="font-serif text-5xl md:text-6xl font-light text-[#F8F6F2] leading-none mb-3">
                    {selectedModel.nombre}<br /><span className="italic font-serif">{selectedModel.apellidos}</span>
                  </motion.h2>
                  {(() => {
                    const [igUser, igFollowers] = (selectedModel.instagram || '').split('|');
                    return (
                      <motion.a 
                        variants={modalStaggerItem}
                        id="modal-ig" 
                        href={`https://instagram.com/${igUser.replace('@','')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-[#CC0000] hover:text-[#CC0000]/80 tracking-wider font-semibold transition-colors mb-4"
                      >
                        <Instagram className="w-4 h-4" />
                        {igUser}
                      </motion.a>
                    );
                  })()}

                  {/* Badges: Disponibilidad, Nivel & Nueva Incorporación */}
                  <motion.div variants={modalStaggerItem} className="flex flex-wrap items-center gap-2 mb-6">
                    {isModelNew(selectedModel) && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181204]/90 border border-amber-500/50 text-amber-300 backdrop-blur-sm text-[10px] sm:text-xs tracking-wider uppercase font-semibold shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{lang === 'es' ? 'Nueva' : 'New'}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/30 backdrop-blur-sm text-[10px] sm:text-xs tracking-wider uppercase font-semibold">
                      <span className={`w-2 h-2 rounded-full ${selectedModel.disponible !== false ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-400'}`} />
                      <span className={selectedModel.disponible !== false ? 'text-emerald-400' : 'text-gray-400'}>
                        {selectedModel.disponible !== false ? (lang === 'es' ? 'Disponible para trabajos' : 'Available for jobs') : (lang === 'es' ? 'No disponible' : 'Not available')}
                      </span>
                    </div>

                    {(() => {
                      const level = getModelLevel(selectedModel.instagram);
                      if (!level) return null;
                      return <ModelLevelBadge level={level} size="sm" />;
                    })()}
                  </motion.div>

                  <motion.div variants={modalStaggerItem} className="w-12 h-[1.5px] bg-[#CC0000] mb-6"></motion.div>

                  {/* Editorial Blockquote */}
                  <motion.div 
                    variants={modalStaggerItem}
                    className="relative pl-6 py-1 mb-8 border-l-2 border-[#CC0000]/60 select-none"
                  >
                    <span className="absolute left-1 top-0 text-3xl font-serif text-[#CC0000]/40 leading-none">“</span>
                    <p className="font-serif italic text-white/80 text-sm leading-relaxed tracking-wide font-light">
                      {getModelBio(selectedModel, lang).quote}
                    </p>
                  </motion.div>

                  <motion.div variants={modalStaggerItem} id="modal-specs" className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                    {(() => {
                      const parts = (selectedModel.instagram || "").split("|");
                      const igFollowers = parts[1];
                      const updatedAt = parts[4];
                      const calculatedAge = calculateAge(selectedModel.fecha_nacimiento);
                      const finalAge = calculatedAge !== null ? calculatedAge : selectedModel.edad;
                      const specs = [
                        [TRANSLATIONS[lang].age, TRANSLATIONS[lang].years(finalAge)],
                        [TRANSLATIONS[lang].skinTone, translateValue(selectedModel.piel, lang)],
                        [TRANSLATIONS[lang].eyeColor, translateValue(selectedModel.ojos, lang)],
                        [TRANSLATIONS[lang].height, `${selectedModel.estatura} cm`],
                        [TRANSLATIONS[lang].busto, selectedModel.busto ? `${selectedModel.busto} cm` : "—"],
                        [TRANSLATIONS[lang].cintura, selectedModel.cintura ? `${selectedModel.cintura} cm` : "—"],
                        [TRANSLATIONS[lang].caderas, selectedModel.caderas ? `${selectedModel.caderas} cm` : "—"],
                        [TRANSLATIONS[lang].shoeSize, `${selectedModel.calzado}`],
                      ];

                      if (igFollowers) {
                        specs.push([TRANSLATIONS[lang].followers, formatFollowersDisplay(selectedModel.instagram)]);
                      }

                      return specs.map(([label, val]) => (
                        <div key={label} className="border-b border-white/5 py-3 flex flex-col gap-1">
                          <span className="text-[9px] tracking-widest uppercase text-[#8A8A8A] font-bold">{label}</span>
                          <div className="flex flex-col">
                            <span className="text-sm text-white font-medium">{val}</span>
                            {label === TRANSLATIONS[lang].followers && (
                               <span className="text-[9px] text-[#888] italic mt-0.5">
                                 {formatUpdatedAgo(updatedAt, lang)}
                               </span>
                            )}
                          </div>
                        </div>
                      ));
                    })()}
                  </motion.div>
                </div>

                {/* Acciones */}
                <motion.div variants={modalStaggerItem} className="flex flex-col gap-3 pt-6 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => toggleFavorite(selectedModel.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 border border-white/10 hover:bg-white/5 rounded-sm hover:border-white/30 text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                    >
                      <motion.div
                        initial={false}
                        animate={favorites.includes(selectedModel.id) ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Heart className={`w-4 h-4 ${favorites.includes(selectedModel.id) ? 'text-[#CC0000] fill-[#CC0000]' : ''}`} />
                      </motion.div>
                      {favorites.includes(selectedModel.id) ? TRANSLATIONS[lang].removeFav : TRANSLATIONS[lang].addFav}
                    </button>
                    <button
                      onClick={() => {
                        setBookingMsg(TRANSLATIONS[lang].bookingMsgSingle(selectedModel.nombre, selectedModel.instagram));
                        setShowBookingForm(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 bg-[#CC0000] hover:bg-[#CC0000]/90 text-white rounded-sm text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      {TRANSLATIONS[lang].requestBooking}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => exportModelPDF(selectedModel)}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-white/10 hover:bg-white/5 rounded-sm hover:border-white/30 text-xs uppercase tracking-wider font-bold transition-all text-white/90 hover:text-white cursor-pointer"
                    >
                      <FileDown className="w-4 h-4 text-[#CC0000]" />
                      {lang === 'es' ? 'Exportar PDF' : 'Export PDF'}
                    </button>
                    <button
                      onClick={() => shareModelWhatsApp(selectedModel)}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-white/10 hover:bg-white/5 rounded-sm hover:border-white/30 text-xs uppercase tracking-wider font-bold transition-all text-white/90 hover:text-white cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-[#CC0000]" />
                      {lang === 'es' ? 'Compartir' : 'Share'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>

              {/* Modelos Similares */}
              {(() => {
                const similarModels = activeModels
                  .filter(m => m.id !== selectedModel.id)
                  .map(m => {
                    let score = 0;
                    if (m.piel === selectedModel.piel) score += 10;
                    const heightDiff = Math.abs(m.estatura - selectedModel.estatura);
                    score += Math.max(0, 10 - heightDiff);
                    return { model: m, score };
                  })
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 3)
                  .map(item => item.model);

                if (similarModels.length === 0) return null;

                return (
                  <div className="col-span-1 md:col-span-2 pt-10 mt-6 border-t border-white/5">
                    <h3 className="font-serif text-2xl font-light text-white mb-6 flex items-center gap-3">
                      <span className="w-1 h-5 bg-[#CC0000] inline-block"></span>
                      {TRANSLATIONS[lang].similarModels}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {similarModels.map(model => {
                        const firstPic = model.photos && model.photos[0] ? resolvePhoto(model.photos[0]) : null;
                        return (
                          <div 
                            key={model.id}
                            onClick={() => openModelDetail(model)}
                            className="bg-white/[0.02] border border-white/5 hover:border-[#CC0000]/30 rounded-sm p-4 cursor-pointer group flex items-center gap-4"
                          >
                            <div className="w-12 h-16 bg-white/5 rounded-sm overflow-hidden shrink-0 border border-white/5">
                              {firstPic ? (
                                <img 
                                  src={firstPic} 
                                  alt={model.nombre} 
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"  
                                  onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23111"/><text x="50" y="50" font-family="sans-serif" font-size="10" fill="%23555" text-anchor="middle" dominant-baseline="middle">N/A</text></svg>'; e.currentTarget.className = e.currentTarget.className + ' object-contain p-8'; }} 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-serif text-sm text-white/10">
                                  {model.nombre[0]}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-serif text-sm font-light text-[#F8F6F2] truncate group-hover:text-[#CC0000] transition-colors">
                                {model.nombre} <span className="italic font-normal">{model.apellidos}</span>
                              </h4>
                              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mt-1 flex flex-wrap gap-x-2">
                                <span>{translateValue(model.piel, lang)}</span>
                                <span className="text-[#CC0000]/50">•</span>
                                <span>{model.estatura} cm</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </motion.div>


          </motion.div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX DE IMAGEN CON SOPORTE PINCH-TO-ZOOM, SWIPE Y NAVEGACIÓN COMPLETA */}
      <TouchLightbox
        isOpen={showLightbox && !!selectedModel}
        onClose={() => setShowLightbox(false)}
        photos={selectedModel ? selectedModel.photos || [] : []}
        activeIndex={activePhotoIdx}
        onChangeIndex={setActivePhotoIdx}
        resolvePhoto={resolvePhoto}
      />

      {/* FORMULARIO DE SOLICITUD / BOOKING MODAL */}
      <AnimatePresence>
        {showBookingForm && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[70] bg-[#050505]/85 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              className="bg-[#0D0D0D] border border-white/10 p-6 md:p-10 rounded-sm max-w-lg w-full relative"
            >
              <button 
                onClick={() => {
                  setShowBookingForm(false);
                  setBookingSuccess(false);
                }}
                className="absolute top-4 right-4 text-[#8A8A8A] hover:text-[#F8F6F2] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {bookingSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-6" />
                  </motion.div>
                  <h3 className="font-serif text-3xl font-light text-white mb-3">{TRANSLATIONS[lang].requestSent}</h3>
                  <p className="text-xs text-[#8A8A8A] max-w-sm">{TRANSLATIONS[lang].requestSentDesc}</p>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="flex flex-col gap-5">
                  <div className="text-center mb-2">
                    <p className="text-[10px] tracking-[0.25em] uppercase text-[#CC0000] font-semibold mb-2">{TRANSLATIONS[lang].bookingForm}</p>
                    <h3 className="font-serif text-3xl font-light text-white">{TRANSLATIONS[lang].castingRequest}</h3>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-[10px] tracking-widest uppercase text-gray-200 font-bold">{TRANSLATIONS[lang].fullName}</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={bookingName}
                        onChange={(e) => setBookingName(e.target.value)}
                        className="w-full bg-black/50 border border-white/30 px-10 py-3 text-xs text-white rounded-sm focus:outline-none focus:border-[#CC0000]"
                        placeholder={TRANSLATIONS[lang].fullNamePlaceholder}
                      />
                      <User className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3.5 top-4" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-[10px] tracking-widest uppercase text-gray-200 font-bold">{TRANSLATIONS[lang].email}</label>
                    <div className="relative">
                      <input 
                        type="email" 
                        required
                        value={bookingEmail}
                        onChange={(e) => setBookingEmail(e.target.value)}
                        className="w-full bg-black/50 border border-white/30 px-10 py-3 text-xs text-white rounded-sm focus:outline-none focus:border-[#CC0000]"
                        placeholder={TRANSLATIONS[lang].emailPlaceholder}
                      />
                      <Mail className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3.5 top-4" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <label className="text-[10px] tracking-widest uppercase text-gray-200 font-bold">{TRANSLATIONS[lang].phone}</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        required
                        value={bookingPhone}
                        onChange={(e) => setBookingPhone(e.target.value)}
                        className="w-full bg-black/50 border border-white/30 px-10 py-3 text-xs text-white rounded-sm focus:outline-none focus:border-[#CC0000]"
                        placeholder={TRANSLATIONS[lang].phonePlaceholder}
                      />
                      <Phone className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3.5 top-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 relative">
                      <label className="text-[10px] tracking-widest uppercase text-gray-200 font-bold">{TRANSLATIONS[lang].company}</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={bookingCompany}
                          onChange={(e) => setBookingCompany(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs text-[#F8F6F2] bg-black/50 border border-white/30 rounded-sm focus:outline-none focus:border-[#CC0000]"
                          placeholder={TRANSLATIONS[lang].companyPlaceholder}
                        />
                        <Building className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3.5 top-3.5" />
                      </div>
                    </div>
                    <div className="relative">
                      <span className="text-[10px] tracking-widest uppercase text-gray-200 font-bold block mb-1">{TRANSLATIONS[lang].eventDate}</span>
                      <div className="relative">
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().split('T')[0]}
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 text-xs text-[#F8F6F2] bg-black/50 border border-white/30 rounded-sm focus:outline-none focus:border-[#CC0000]"
                        />
                        <Calendar className="w-3.5 h-3.5 text-[#8A8A8A] absolute left-3.5 top-3.5 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] tracking-widest uppercase text-gray-200 font-bold">{TRANSLATIONS[lang].projectDetails}</label>
                      <span className="text-[9px] text-[#8A8A8A] font-mono">{bookingMsg.length}/1000</span>
                    </div>
                    <textarea 
                      required
                      maxLength={1000}
                      value={bookingMsg}
                      onChange={(e) => {
                        const normalized = e.target.value.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
                        setBookingMsg(normalized.slice(0, 1000));
                      }}
                      rows={4}
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:outline-none focus:border-[#CC0000] resize-none"
                      placeholder={TRANSLATIONS[lang].projectPlaceholder}
                    />
                  </div>

                  {bookingError && (
                    <div className="bg-red-950/40 border border-red-500/20 rounded-sm p-3 text-red-400 text-xs text-center leading-relaxed">
                      {bookingError}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full py-4 bg-[#CC0000] hover:bg-[#CC0000]/90 disabled:opacity-50 text-white rounded-sm text-xs uppercase tracking-wider font-bold transition-all mt-2 flex items-center justify-center gap-2"
                  >
                    {bookingLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {TRANSLATIONS[lang].sending}
                      </>
                    ) : (
                      TRANSLATIONS[lang].sendRequest
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <motion.footer 
        id="footer" 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={{
          hidden: { opacity: 0, y: 40 },
          visible: {
            opacity: 1, 
            y: 0,
            transition: {
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
              staggerChildren: 0.2
            }
          }
        }}
        className="border-t border-white/5 py-3.5 sm:py-5 md:py-8 px-4 sm:px-6 md:px-12 flex flex-col items-center justify-between gap-2 md:flex-row md:gap-6"
      >
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
          }}
          onClick={() => {
            setShowManagerLogin(true);
            setLoginError('');
          }}
          className="font-sans text-[10px] md:text-xs tracking-[0.2em] uppercase text-[#8A8A8A] font-medium flex-1 text-center md:text-left cursor-pointer hover:text-white transition-colors py-0.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 justify-center md:justify-start"
        >
          <span>PLANET<span className="text-[#CC0000]">TALENT</span> · {TRANSLATIONS[lang].agency}</span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="text-white/40 text-[9px] sm:text-[10px] tracking-wider font-normal">
            {lang === 'es' ? 'Agencia de Modelos #1 de Cuba' : "Cuba's #1 Model Agency"}
          </span>
        </motion.div>
        
        {/* REDES SOCIALES */}
        <motion.div 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
          }}
          className="flex items-center justify-center gap-3 sm:gap-5"
        >
          <a 
            href="mailto:talent@planetrecords.it" 
            className="p-1 text-[#8A8A8A] hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] transition-all duration-300 ease-out transform hover:scale-125 active:scale-95 inline-flex items-center justify-center cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black" 
            aria-label={lang === 'es' ? 'Contactar por correo electrónico a Planet Talent' : 'Contact Planet Talent via email'}
            title={lang === 'es' ? 'Contactar por email (talent@planetrecords.it)' : 'Contact via email (talent@planetrecords.it)'}
          >
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ease-out" aria-hidden="true" />
          </a>
          <a 
            href="https://www.instagram.com/planet_talent_agency?igsh=MTUzZzhwZzV5Yng0ZA==" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-1 text-[#8A8A8A] hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] transition-all duration-300 ease-out transform hover:scale-125 active:scale-95 inline-flex items-center justify-center cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black" 
            aria-label={lang === 'es' ? 'Visitar perfil oficial de Instagram de Planet Talent Agency' : 'Visit Planet Talent Agency official Instagram profile'}
            title={lang === 'es' ? 'Visitar perfil de Instagram (@planet_talent_agency)' : 'Visit Instagram profile (@planet_talent_agency)'}
          >
            <Instagram className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ease-out" aria-hidden="true" />
          </a>
        </motion.div>

        <motion.p 
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
          }}
          className="text-[10px] md:text-xs text-white/30 tracking-wider flex-1 text-center md:text-right py-0.5"
        >
          {TRANSLATIONS[lang].footerText}
        </motion.p>
      </motion.footer>
        </>
      )}

      {/* MODAL DE LOGIN MANAGER (FASE 1) */}
      <AnimatePresence>
        {showManagerLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
          >
            {/* Logo encima del modal sin fondo blanco */}
            <div className="mb-6 sm:mb-8 flex flex-col items-center">
              <img 
                src="/Logo de Planet Talent.PNG" 
                alt="Planet Talent" 
                className="h-10 sm:h-12 md:h-14 w-auto object-contain block drop-shadow-xl" 
              />
            </div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0A0A0A] border border-white/10 p-8 rounded-sm w-full max-w-md relative"
            >
              <button
                onClick={() => setShowManagerLogin(false)}
                className="absolute top-6 right-6 text-[#8A8A8A] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-8 text-center mt-2">
                <h3 className="font-sans text-xl tracking-wide font-medium text-white mb-2 uppercase">{TRANSLATIONS[lang].managerAccess}</h3>
                <p className="text-xs text-gray-400">{TRANSLATIONS[lang].cmsSubtitle}</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2 relative">
                  <label className="text-[10px] tracking-widest uppercase text-gray-200 font-bold">{TRANSLATIONS[lang].email}</label>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    className="w-full bg-white border border-gray-300 px-4 py-3 text-sm text-black placeholder:text-gray-400 rounded-sm focus:outline-none focus:border-[#CC0000] transition-colors"
                    placeholder={TRANSLATIONS[lang].emailPlaceholder}
                  />
                </div>

                <div className="flex flex-col gap-2 relative">
                  <label className="text-[10px] tracking-widest uppercase text-gray-200 font-bold">{TRANSLATIONS[lang].password}</label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    className="w-full bg-white border border-gray-300 px-4 py-3 text-sm text-black placeholder:text-gray-400 rounded-sm focus:outline-none focus:border-[#CC0000] transition-colors"
                    placeholder={TRANSLATIONS[lang].passwordPlaceholder}
                  />
                </div>

                {loginError && (
                  <p className="text-[#CC0000] text-[10px] tracking-wider mt-1 text-center font-bold max-w-xs mx-auto leading-tight">{loginError}</p>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-4 bg-[#CC0000] hover:bg-[#CC0000]/90 disabled:opacity-50 text-white rounded-sm text-xs uppercase tracking-wider font-bold transition-all mt-4"
                >
                  {loginLoading ? '...' : TRANSLATIONS[lang].enterPanel}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Guía de Niveles */}
      <AnimatePresence>
        {showLevelGuideModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowLevelGuideModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0C0C0C] border border-white/10 rounded-sm p-6 sm:p-8 max-w-2xl w-full relative shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setShowLevelGuideModal(false)}
                title={lang === 'es' ? 'Cerrar guía' : 'Close guide'}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 text-[#8A8A8A] hover:text-white transition-colors p-2 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <span className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300">
                  <Crown size={22} />
                </span>
                <div>
                  <h3 className="font-serif text-2xl sm:text-3xl font-light text-white">
                    {lang === 'es' ? 'Niveles de Modelo & Alcance' : 'Model Levels & Reach'}
                  </h3>
                  <p className="text-xs text-[#8A8A8A] font-mono mt-0.5">
                    {lang === 'es' ? 'Clasificación basada en seguidores verificados de Instagram' : 'Classification based on verified Instagram followers'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                {/* Premium */}
                <div className="p-4 bg-[#181204]/90 border border-amber-500/40 rounded-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-amber-300" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Influencer Premium</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      100K+
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80 leading-relaxed font-light">
                    {lang === 'es' 
                      ? 'Modelos con más de 100,000 seguidores. Máximo impacto mediático internacional, proyección estelar y campañas globales.' 
                      : 'Models with 100,000+ followers. Maximum international media impact, stellar projection and global campaigns.'}
                  </p>
                </div>

                {/* Macro */}
                <div className="p-4 bg-[#140a1d]/90 border border-purple-500/40 rounded-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-300" />
                      <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Macro Influencer</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                      50K - 99K
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/80 leading-relaxed font-light">
                    {lang === 'es' 
                      ? 'De 50,000 a 99,999 seguidores. Alto engagement y presencia sólida ideal para firmas consolidadas y campañas de gran alcance.' 
                      : 'From 50,000 to 99,999 followers. High engagement and solid presence ideal for established brands and major campaigns.'}
                  </p>
                </div>

                {/* Mid */}
                <div className="p-4 bg-[#08151d]/90 border border-cyan-500/40 rounded-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-cyan-300" />
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Mid Influencer</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      15K - 49K
                    </span>
                  </div>
                  <p className="text-xs text-cyan-200/80 leading-relaxed font-light">
                    {lang === 'es' 
                      ? 'De 15,000 a 49,999 seguidores. Audiencia nicho con excelente interacción, ideal para moda editorial y comerciales regionales.' 
                      : 'From 15,000 to 49,999 followers. Niche audience with high interaction, ideal for fashion editorial and commercial projects.'}
                  </p>
                </div>

                {/* Micro */}
                <div className="p-4 bg-[#061811]/90 border border-emerald-500/40 rounded-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-300" />
                      <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Micro Influencer</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      10K - 14K
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 leading-relaxed font-light">
                    {lang === 'es' 
                      ? 'De 10,000 a 14,999 seguidores. Perfiles emergentes con contenido fresco y alto nivel de cercanía y autenticidad.' 
                      : 'From 10,000 to 14,999 followers. Emerging talents with fresh content and authentic audience connection.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between gap-4">
                <span className="text-[10px] text-[#8A8A8A]">
                  {lang === 'es' ? 'Los datos de seguidores se sincronizan periódicamente.' : 'Follower data is periodically synchronized.'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLevelGuideModal(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-sm uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  {lang === 'es' ? 'Entendido' : 'Got it'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Bidirectional Floating Scroll Button (visible only when scrolled past the hero section and no modal is active) */}
      <AnimatePresence>
        {showFloatingScrollBtn && !showManagerLogin && !selectedModel && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => {
              if (scrollDirectionUp) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                const filterElem = document.getElementById('filter-bar-container');
                const gridElem = document.getElementById('models-grid-section');
                const currentScrollY = window.scrollY;

                if (filterElem && gridElem) {
                  const filterTop = filterElem.getBoundingClientRect().top + currentScrollY - 70;
                  const gridTop = gridElem.getBoundingClientRect().top + currentScrollY - 70;

                  // 1. Si está en la sección de modelos destacadas (antes de los filtros): desplazar al inicio de los filtros
                  if (currentScrollY < filterTop - 50) {
                    window.scrollTo({ top: Math.max(0, filterTop), behavior: 'smooth' });
                  }
                  // 2. Si está en la sección de filtros: desplazar al inicio del catálogo público ("Nuestras modelos")
                  else if (currentScrollY < gridTop - 50) {
                    window.scrollTo({ top: Math.max(0, gridTop), behavior: 'smooth' });
                  }
                  // 3. De lo contrario, continuar bajando progresivamente por la grilla del catálogo
                  else {
                    const scrollStep = Math.max(350, (window.innerHeight || 800) * 0.75);
                    window.scrollBy({ top: scrollStep, behavior: 'smooth' });
                  }
                } else {
                  const scrollStep = Math.max(350, (window.innerHeight || 800) * 0.75);
                  window.scrollBy({ top: scrollStep, behavior: 'smooth' });
                }
              }
            }}
            title={
              scrollDirectionUp 
                ? (lang === 'es' ? 'Volver arriba' : 'Scroll to top')
                : (lang === 'es' ? 'Seguir bajando' : 'Scroll down')
            }
            className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[60] bg-black/45 hover:bg-black/70 backdrop-blur-md px-3.5 py-2 md:px-4 md:py-2.5 rounded-full border transition-all duration-300 shadow-xl flex items-center justify-center cursor-pointer group active:scale-95 ${
              isNearBottom 
                ? 'border-[#CC0000] shadow-[0_0_15px_rgba(204,0,0,0.3)] animate-gentle-pulse' 
                : 'border-white/15 hover:border-[#CC0000]/60 hover:-translate-y-0.5'
            }`}
            aria-label={
              scrollDirectionUp 
                ? (lang === 'es' ? 'Volver arriba' : 'Scroll to top')
                : (lang === 'es' ? 'Seguir bajando' : 'Scroll down')
            }
          >
            <motion.div
              animate={{ 
                rotate: scrollDirectionUp ? 0 : 180,
                y: scrollDirectionUp ? [0, -3.5, 0] : [0, 3.5, 0]
              }}
              transition={{
                rotate: { type: "spring", stiffness: 200, damping: 18 },
                y: {
                  repeat: Infinity,
                  duration: 1.8,
                  ease: "easeInOut"
                }
              }}
              className="flex items-center justify-center"
            >
              <ChevronUp className="w-5 h-5 text-[#CC0000] stroke-[1.75] transition-transform duration-300 group-hover:scale-110" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

