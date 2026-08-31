import { motion, AnimatePresence } from "motion/react";
import React, { useState, useEffect, useRef } from 'react';
import { toast, Toaster } from 'sonner';
import { supabase, getCachedModels, getCachedBookings, invalidateModelsCache, invalidateBookingsCache } from '../lib/supabase';
import { Model } from '../types';
import { 
  Trash2, 
  Edit2, 
  Plus, 
  LogOut, 
  Loader2, 
  X, 
  Search, 
  Camera, 
  User, 
  Sparkles,
  SlidersHorizontal,
  Instagram,
  Check,
  RefreshCw,
  HelpCircle,
  Calendar,
  Mail,
  Building,
  CheckCircle2,
  XCircle,
  Archive,
  Clock,
  AlertCircle,
  AlertTriangle,
  Phone,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Award,
  TrendingUp,
  Menu,
  ArrowUp,
  Compass,
  FileDown,
  Copy,
  GripVertical,
  Star,
  Upload,
  Link,
  Move, 
  ImageOff,
  ShieldCheck,
  Bell,
  Filter,
  Eye,
  LayoutGrid,
  List,
  ExternalLink,
  MessageSquare,
  MessageCircle,
  Sparkle,
  Zap,
  CloudUpload,
  HardDrive
} from 'lucide-react';
import { resolvePhoto, calculateAge, formatDate, getModelLevel, getModelBio, ModelLevelBadge, formatUpdatedAgo, formatFollowersDisplay, isModelNew, isModelFeatured, NewModelRibbon } from '../App';
import { 
  compressImageFile, 
  bulkOptimizeSupabaseModels, 
  optimizePhotoArray 
} from '../lib/imageOptimizer';
import { 
  uploadImageToSupabaseStorage, 
  migrateAllBase64PhotosToStorage 
} from '../lib/storage';

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 2.137.672 4.116 1.82 5.74L2 22l4.38-1.782A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.808 0-3.488-.508-4.922-1.385l-.353-.215-2.607 1.061.986-2.529-.236-.375A7.957 7.957 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
  </svg>
);

export function getModelsForBooking(detalles: string, allModels: Model[]): Model[] {
  if (!detalles) return [];
  const text = detalles.toLowerCase();
  
  return allModels.filter(model => {
    const fullName = `${model.nombre} ${model.apellidos}`.toLowerCase();
    const firstName = model.nombre.toLowerCase();
    const lastName = model.apellidos.toLowerCase();
    const [igUser] = (model.instagram || '').split('|');
    const igClean = igUser ? igUser.replace('@', '').trim().toLowerCase() : '';
    
    // Si contiene el nombre completo
    if (text.includes(fullName)) {
      return true;
    }
    
    // Si contiene el primer nombre y el apellido por separado (si son lo suficientemente largos)
    if (firstName.length > 2 && lastName.length > 2 && text.includes(firstName) && text.includes(lastName)) {
      return true;
    }
    
    // Si contiene el primer nombre y el usuario de instagram
    if (firstName.length > 2 && igClean && igClean.length > 2 && text.includes(firstName) && text.includes(igClean)) {
      return true;
    }
    
    // Si el mensaje tiene "- Nombre" o similar
    if (firstName.length > 2 && (text.includes(`- ${firstName}`) || text.includes(`modelo ${firstName}`) || text.includes(`model ${firstName}`))) {
      return true;
    }

    return false;
  });
}

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

interface ManagerDashboardProps {
  onLogout: () => void;
}

export function ManagerDashboard({ onLogout }: ManagerDashboardProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string>('');

  // Tabs & Views State
  const [activeTab, setActiveTab] = useState<'models' | 'bookings' | 'stats'>('models');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);
  const [bookingsError, setBookingsError] = useState<string>('');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'pendiente' | 'aceptado' | 'rechazado' | 'archivado'>('all');
  const [bookingViewMode, setBookingViewMode] = useState<'detail' | 'list'>('detail');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewModel, setPreviewModel] = useState<Model | null>(null);
  const [showLightbox, setShowLightbox] = useState<boolean>(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [showFloatingScrollBtn, setShowFloatingScrollBtn] = useState<boolean>(false);
  const [scrollDirectionUp, setScrollDirectionUp] = useState<boolean>(false);
  const [isNearBottom, setIsNearBottom] = useState<boolean>(false);

  // Form Dirtiness & Unsaved Changes Tracking
  const [initialFormJson, setInitialFormJson] = useState<string>('');
  const [showUnsavedConfirmModal, setShowUnsavedConfirmModal] = useState<boolean>(false);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<number | null>(null);

  // Deletion & Action Confirmation States
  const [showConfirmRecalculate, setShowConfirmRecalculate] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<any | null>(null);

  // Form State
  const [dbHasFechaNacimiento, setDbHasFechaNacimiento] = useState(false);
  const [formModel, setFormModel] = useState<Partial<Model>>({
    nombre: '',
    apellidos: '',
    instagram: '',
    edad: 0,
    fecha_nacimiento: '',
    estatura: 0,
    busto: null,
    cintura: null,
    caderas: null,
    ojos: '',
    piel: '',
    calzado: '',
    photos: [],
    disponible: true,
    destacada: false
  });

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500"><rect width="100%" height="100%" fill="%231a1a1a"/><text x="50%" y="50%" font-family="sans-serif" font-size="15" font-weight="500" fill="%238a8a8a" text-anchor="middle" dominant-baseline="middle">Imagen no disponible</text></svg>';
  };

  const isFormDirty = () => {
    if (!showModal || !initialFormJson) return false;
    return JSON.stringify(formModel) !== initialFormJson;
  };

  const requestCloseModal = () => {
    if (isFormDirty()) {
      setShowUnsavedConfirmModal(true);
    } else {
      setShowModal(false);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showModal && initialFormJson && JSON.stringify(formModel) !== initialFormJson) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showModal, formModel, initialFormJson]);

  // Back button / gesture interception for manager modal views
  const openModalsRef = useRef<string[]>([]);
  const ignorePopstateCountRef = useRef<number>(0);

  useEffect(() => {
    const expectedStack: string[] = [];
    if (showModal) expectedStack.push('editForm');
    if (previewModel) expectedStack.push('preview');
    if (showLightbox) expectedStack.push('lightbox');
    if (showUnsavedConfirmModal) expectedStack.push('unsavedConfirm');
    if (selectedBookingId !== null) expectedStack.push('bookingDetail');
    if (bookingToDelete) expectedStack.push('bookingDeleteConfirm');
    if (modelToDelete) expectedStack.push('modelDeleteConfirm');
    if (showConfirmRecalculate) expectedStack.push('recalculateConfirm');

    const currentStack = openModalsRef.current;

    if (expectedStack.length > currentStack.length) {
      const diff = expectedStack.length - currentStack.length;
      for (let i = 0; i < diff; i++) {
        window.history.pushState({ managerModalOpen: true, index: currentStack.length + i }, '');
      }
    } else if (expectedStack.length < currentStack.length) {
      const diff = currentStack.length - expectedStack.length;
      ignorePopstateCountRef.current += diff;
      for (let i = 0; i < diff; i++) {
        window.history.back();
      }
    }

    openModalsRef.current = expectedStack;
  }, [
    showModal, previewModel, showLightbox, showUnsavedConfirmModal,
    selectedBookingId, bookingToDelete, modelToDelete, showConfirmRecalculate
  ]);

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

        if (popped === 'editForm') {
          if (isFormDirty()) {
            // Push history back so the editForm state remains in history
            window.history.pushState({ managerModalOpen: true, index: currentStack.length - 1 }, '');
            setShowUnsavedConfirmModal(true);
          } else {
            setShowModal(false);
          }
        } else if (popped === 'preview') {
          setPreviewModel(null);
        } else if (popped === 'lightbox') {
          setShowLightbox(false);
        } else if (popped === 'unsavedConfirm') {
          setShowUnsavedConfirmModal(false);
        } else if (popped === 'bookingDetail') {
          setSelectedBookingId(null);
        } else if (popped === 'bookingDeleteConfirm') {
          setBookingToDelete(null);
        } else if (popped === 'modelDeleteConfirm') {
          setModelToDelete(null);
        } else if (popped === 'recalculateConfirm') {
          setShowConfirmRecalculate(false);
        }

        openModalsRef.current = updatedStack;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowH = window.innerHeight || 800;
      const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 2000;
      const maxScroll = Math.max(1, docHeight - windowH);
      const scrollProgress = scrollY / maxScroll; // 0.0 at top, 1.0 at bottom
      
      // In Manager dashboard: show immediately whenever there is scrollable content on the page
      const hasScrollableContent = docHeight > windowH + 60;
      setShowFloatingScrollBtn(hasScrollableContent);

      // Point UP only when the user is genuinely near the end of the page (< 20% remaining or within 450px of bottom)
      const isNearEnd = scrollProgress >= 0.80 || (docHeight - (scrollY + windowH) <= 450);
      setScrollDirectionUp(isNearEnd);

      // Check if user is at the very bottom (within 250px) for the subtle pulse
      const isBottom = docHeight - (scrollY + windowH) <= 250;
      setIsNearBottom(isBottom);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    handleScroll();
    const timer = setTimeout(handleScroll, 300);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(timer);
    };
  }, [models, bookings, activeTab, viewMode]);

  // Auto-carousel effect for model photos in detail view
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (previewModel && previewModel.photos && previewModel.photos.length > 1 && !showLightbox) {
      interval = setInterval(() => {
        setActivePhotoIdx((prev) => (prev < previewModel.photos.length - 1 ? prev + 1 : 0));
      }, 3500); // changes every 3.5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [previewModel, showLightbox]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'nombre' | 'edad' | 'estatura' | 'nivel'>('nombre');
  const [pielFilter, setPielFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState<'all' | 'micro' | 'mid' | 'macro' | 'premium'>('all');
  const [saving, setSaving] = useState(false);

  // Photo Drag & Drop & Upload State
  const [draggedPhotoIdx, setDraggedPhotoIdx] = useState<number | null>(null);
  const [dragOverPhotoIdx, setDragOverPhotoIdx] = useState<number | null>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState<boolean>(false);
  const [isDraggingFileOverDropzone, setIsDraggingFileOverDropzone] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);

  const isInitialLoadRef = useRef(true);
  const bookingsRef = useRef<any[]>([]);

  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  const handleNewBookingsDetection = (incomingBookings: any[]) => {
    if (isInitialLoadRef.current) {
      if (incomingBookings && incomingBookings.length > 0) {
        isInitialLoadRef.current = false;
      }
      return;
    }

    const currentBookings = bookingsRef.current;
    if (currentBookings.length > 0 && incomingBookings && incomingBookings.length > 0) {
      const existingIds = new Set(currentBookings.map(b => b.id));
      const hasNewPendientes = incomingBookings.some(
        b => !existingIds.has(b.id) && (b.estado === 'pendiente' || b.estado === 'pending' || b.estado === 'new')
      );
      
      if (hasNewPendientes) {
        playBookingNotificationSound();
      }
    }
  };

  useEffect(() => {
    fetchModels();
    fetchBookings(false, false);

    // Poll for new bookings in background silently every 15 seconds
    const interval = setInterval(() => {
      fetchBookings(true, true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const fetchBookings = async (forceRefresh = false, silent = false) => {
    if (!silent) {
      setLoadingBookings(true);
    }
    setBookingsError('');
    try {
      const data = await getCachedBookings((updatedData) => {
        handleNewBookingsDetection(updatedData);
        setBookings(updatedData);
      }, forceRefresh);
      handleNewBookingsDetection(data);
      setBookings(data);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      if (error.message && error.message.includes('Could not find the table')) {
        setBookingsError('La tabla "bookings" no está creada en Supabase. El administrador del sistema debe copiar y ejecutar el archivo "supabase.sql" en la pestaña SQL Editor del panel de control de Supabase.');
      } else {
        setBookingsError(error.message);
      }
    } finally {
      if (!silent) {
        setLoadingBookings(false);
      }
    }
  };

  const updateBookingStatus = async (id: number, status: string) => {
    setUpdatingBookingId(id);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ estado: status })
        .eq('id', id);

      if (error) {
        console.error('Error updating booking status:', error);
        toast.error('Error al actualizar el estado: ' + error.message);
      } else {
        invalidateBookingsCache();
        setBookings(prev => prev.map(b => b.id === id ? { ...b, estado: status } : b));
        toast.success('Estado de solicitud actualizado con éxito');
      }
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const deleteBooking = async (id: number) => {
    if (!bookingToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting booking:', error);
        toast.error('Error al eliminar: ' + error.message);
      } else {
        invalidateBookingsCache();
        setBookings(prev => prev.filter(b => b.id !== id));
        toast('Eliminación completada', {
          description: 'La solicitud de booking ha sido eliminada permanentemente.',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          style: {
            background: '#0A0A0A',
            border: '1px solid rgba(16,185,129,0.2)',
            color: '#F8F6F2'
          }
        });
      }
      setBookingToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const [isOptimizingImages, setIsOptimizingImages] = useState(false);
  const [isMigratingStorage, setIsMigratingStorage] = useState(false);

  const handleMigratePhotosToStorage = async () => {
    if (isMigratingStorage) return;
    setIsMigratingStorage(true);
    const toastId = toast.loading('Iniciando migración de imágenes a Supabase Storage en formato WebP...');

    try {
      const result = await migrateAllBase64PhotosToStorage(models, (processed, total, modelName, migratedCount) => {
        toast.loading(`Migrando a Storage (${processed}/${total}): ${modelName} (${migratedCount} fotos registradas)...`, { id: toastId });
      });

      toast.dismiss(toastId);
      if (result.totalPhotosMigrated > 0) {
        toast.success(`¡Éxito! Se migraron ${result.totalPhotosMigrated} fotos en ${result.totalModelsMigrated} modelos a Supabase Storage en formato WebP con URL directa.`, { duration: 6000 });
        fetchModels(true);
      } else {
        toast.success('Todas las imágenes del catálogo ya están alojadas en Supabase Storage con URLs directas.', { duration: 5000 });
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Error durante la migración a Supabase Storage: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsMigratingStorage(false);
    }
  };

  const handleBulkOptimizeImages = async () => {
    if (isOptimizingImages) return;
    setIsOptimizingImages(true);
    const toastId = toast.loading('Analizando catálogo de imágenes para optimización WebP...');

    try {
      const result = await bulkOptimizeSupabaseModels(models, (current, total, optimizedCount) => {
        toast.loading(`Optimizando fotos WebP (${current}/${total}): ${optimizedCount} modelos optimizados...`, { id: toastId });
      });

      toast.dismiss(toastId);
      if (result.totalOptimized > 0) {
        toast.success(`¡Éxito! Se optimizaron y comprimieron las fotos de ${result.totalOptimized} modelos a formato WebP ultraligero.`, { duration: 5000 });
        fetchModels(true);
      } else {
        toast.success('Todas las fotos del catálogo ya están 100% optimizadas en formato WebP de alta velocidad.', { duration: 4000 });
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Error al optimizar catálogo: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsOptimizingImages(false);
    }
  };

  const calculateAge = (birthdayStr: string): number => {
    if (!birthdayStr) return 0;
    const birthDate = new Date(birthdayStr);
    if (isNaN(birthDate.getTime())) return 0;
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fetchModels = async (forceRefresh = false) => {
    setLoading(true);
    setModelsError('');
    try {
      const data = await getCachedModels((updatedData) => {
        setModels(updatedData as Model[]);
        setModelsError('');
        if (updatedData.length > 0) {
          setDbHasFechaNacimiento('fecha_nacimiento' in updatedData[0]);
        }
      }, forceRefresh);
      
      setModels(data as Model[]);
      setModelsError('');
      if (data.length > 0) {
        setDbHasFechaNacimiento('fecha_nacimiento' in data[0]);
      } else {
        const { error: colError } = await supabase.from('models').select('fecha_nacimiento').limit(1);
        setDbHasFechaNacimiento(!colError);
      }
    } catch (error: any) {
      console.error('Error fetching models:', error);
      setModelsError(error?.message || 'Error al conectar con la base de datos de modelos');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    const newForm = {
      nombre: '',
      apellidos: '',
      instagram: '',
      edad: 18,
      fecha_nacimiento: '',
      estatura: 170,
      busto: null,
      cintura: null,
      caderas: null,
      ojos: '',
      piel: '',
      calzado: '',
      photos: [],
      disponible: true,
      destacada: false,
      marcarNueva: true
    };
    setFormModel(newForm);
    setInitialFormJson(JSON.stringify(newForm));
    setShowModal(true);
  };

  const openEditModal = (model: Model) => {
    setEditingId(model.id);
    const isFeatured = isModelFeatured(model);
    const editForm = { 
      ...model,
      fecha_nacimiento: model.fecha_nacimiento || '',
      disponible: model.disponible !== false,
      destacada: isFeatured,
      marcarNueva: isModelNew(model)
    };
    setFormModel(editForm);
    setInitialFormJson(JSON.stringify(editForm));
    const [igUser] = (model.instagram || '').split('|');
    setShowModal(true);
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Ensure instagram includes |featured in parts[5] based on destacada
    const igParts = (formModel.instagram || '').split('|');
    while (igParts.length < 5) igParts.push('');
    igParts[5] = formModel.destacada ? 'featured' : '';
    const finalInstagram = igParts.join('|');

    // Asegurar almacenamiento en Supabase Storage para todas las fotos antes de guardar
    let modelPhotos = formModel.photos || [];
    if (modelPhotos.length > 0) {
      try {
        const folder = `models/${(formModel.nombre || 'model').toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const processedPhotos: string[] = [];
        for (const p of modelPhotos) {
          if (typeof p === 'string' && (p.startsWith('data:') || (!p.startsWith('http://') && !p.startsWith('https://') && !p.startsWith('/')))) {
            const storageUrl = await uploadImageToSupabaseStorage(p, folder);
            processedPhotos.push(storageUrl);
          } else {
            processedPhotos.push(p);
          }
        }
        modelPhotos = processedPhotos;
      } catch (optErr) {
        console.warn("Could not process photos to Supabase Storage before save:", optErr);
      }
    }

    const payload: any = {
      nombre: formModel.nombre || '',
      apellidos: formModel.apellidos || '',
      instagram: finalInstagram,
      edad: formModel.edad || 0,
      estatura: formModel.estatura || 0,
      ojos: formModel.ojos || '',
      piel: formModel.piel || '',
      busto: formModel.busto || null,
      cintura: formModel.cintura || null,
      caderas: formModel.caderas || null,
      calzado: formModel.calzado || '',
      photos: modelPhotos,
      disponible: formModel.disponible !== false,
      destacada: formModel.destacada === true
    };

    if (dbHasFechaNacimiento) {
      payload.fecha_nacimiento = formModel.fecha_nacimiento || null;
    }

    if (editingId) {
      // Manage created_at based on marcarNueva toggle
      if (formModel.marcarNueva === false) {
        payload.created_at = '2026-01-01T00:00:00.000Z';
      } else if (formModel.marcarNueva === true && !isModelNew(models.find(m => m.id === editingId))) {
        payload.created_at = new Date().toISOString();
      }

      // Update Model
      let { data, error } = await supabase
        .from('models')
        .update(payload)
        .eq('id', editingId)
        .select();

      // Graceful fallback if 'destacada' or 'created_at' column issue in DB
      if (error && (error.message.includes('destacada') || error.message.includes('created_at'))) {
        console.warn('Column issue in DB, updating with fallback...');
        const retryPayload = { ...payload };
        delete retryPayload.destacada;
        delete retryPayload.created_at;
        const retry = await supabase.from('models').update(retryPayload).eq('id', editingId).select();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        if (error.message.includes('disponible') || error.message.includes('column "disponible" of relation "models" does not exist')) {
          toast.error('Error: La columna "disponible" no existe en la tabla "models" de Supabase. Ejecuta el SQL ALTER TABLE de "supabase.sql" en tu consola de Supabase.');
        } else {
          toast.error('Error al actualizar el modelo: ' + error.message);
        }
        console.error(error);
      } else {
        invalidateModelsCache();
        let updatedRow: any = null;
        if (data && data.length > 0) {
          updatedRow = { ...data[0], destacada: formModel.destacada === true, created_at: payload.created_at || data[0]?.created_at };
        } else {
          // Fallback if select() returns empty because of RLS policies or other DB settings
          updatedRow = { ...formModel, ...payload, id: editingId };
          console.warn('Update returned empty data array. This is usually due to missing Row Level Security (RLS) select policies. Using fallback payload to update local state.');
        }
        setModels(models.map(m => m.id === editingId ? (updatedRow as Model) : m));
        setInitialFormJson(JSON.stringify(formModel));
        setShowModal(false);
        toast.success('Modelo actualizado correctamente');
      }
    } else {
      // Insert Model - Include timestamp based on marcarNueva toggle
      const insertPayload = {
        ...payload,
        created_at: formModel.marcarNueva === false ? '2026-01-01T00:00:00.000Z' : new Date().toISOString()
      };

      let { data, error } = await supabase
        .from('models')
        .insert([insertPayload])
        .select();

      // Graceful fallback if 'destacada' or 'created_at' column does not exist yet in DB
      if (error && (error.message.includes('destacada') || error.message.includes('created_at'))) {
        console.warn('Column "destacada" or "created_at" not in DB yet, inserting without them...');
        const retryPayload = { ...insertPayload };
        delete retryPayload.destacada;
        delete retryPayload.created_at;
        const retry = await supabase.from('models').insert([retryPayload]).select();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        if (error.message.includes('disponible') || error.message.includes('column "disponible" of relation "models" does not exist')) {
          toast.error('Error: La columna "disponible" no existe en la tabla "models" de Supabase. Ejecuta el SQL ALTER TABLE de "supabase.sql" en tu consola de Supabase.');
        } else {
          toast.error('Error al guardar el nuevo modelo: ' + error.message);
        }
        console.error(error);
      } else {
        invalidateModelsCache();
        if (data && data.length > 0) {
          const insertedRow = { 
            ...data[0], 
            destacada: formModel.destacada === true,
            created_at: data[0]?.created_at || insertPayload.created_at 
          };
          setModels([...models, insertedRow as Model]);
        } else {
          // Fallback: reload models to get the new id or try to update from DB
          console.warn('Insert returned empty data array. This is usually due to missing Row Level Security (RLS) select policies. Re-fetching models.');
          toast.warning('Advertencia: El modelo se creó, pero no se recibió de vuelta de la base de datos. Recargando catálogo...');
          await fetchModels(true);
        }
        setInitialFormJson(JSON.stringify(formModel));
        setShowModal(false);
        toast.success('Nuevo modelo guardado correctamente');
      }
    }
    setSaving(false);
  };

  const toggleModelFeatured = async (model: Model, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const currentlyFeatured = isModelFeatured(model);
    const newStatus = !currentlyFeatured;
    
    // Build new instagram string with |featured in parts[5]
    const parts = (model.instagram || '').split('|');
    while (parts.length < 5) parts.push('');
    parts[5] = newStatus ? 'featured' : '';
    const newInstagram = parts.join('|');

    // Optimistic update
    setModels(prev => prev.map(m => m.id === model.id ? { ...m, destacada: newStatus, instagram: newInstagram } : m));
    
    try {
      let updatePayload: any = { instagram: newInstagram, destacada: newStatus };
      let { error } = await supabase
        .from('models')
        .update(updatePayload)
        .eq('id', model.id);
        
      if (error && error.message.includes('destacada')) {
        // Retry saving into instagram column without the missing destacada column
        const retry = await supabase
          .from('models')
          .update({ instagram: newInstagram })
          .eq('id', model.id);
        error = retry.error;
      }

      if (error) {
        // Rollback
        setModels(prev => prev.map(m => m.id === model.id ? { ...m, destacada: currentlyFeatured, instagram: model.instagram } : m));
        toast.error('No se pudo actualizar destacada: ' + error.message);
      } else {
        invalidateModelsCache();
        toast.success(newStatus ? `⭐ ${model.nombre} marcada como Destacada en portada` : `${model.nombre} desmarcada de Destacadas`);
      }
    } catch (err: any) {
      setModels(prev => prev.map(m => m.id === model.id ? { ...m, destacada: currentlyFeatured, instagram: model.instagram } : m));
      toast.error('Error al actualizar estado destacada');
    }
  };

  const handleDelete = async (id: number) => {
    if (!modelToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', id);
        
      if (error) {
        toast.error('Error eliminando modelo: ' + error.message);
        console.error(error);
      } else {
        invalidateModelsCache();
        setModels(models.filter(m => m.id !== id));
        toast('Eliminación completada', {
          description: `El perfil de ${modelToDelete.nombre} ha sido eliminado permanentemente.`,
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
          style: {
            background: '#0A0A0A',
            border: '1px solid rgba(16,185,129,0.2)',
            color: '#F8F6F2'
          }
        });
      }
      setModelToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleModelAvailability = async (model: Model, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = model.disponible === false ? true : false;
    
    // Optimistic update
    setModels(prev => prev.map(m => m.id === model.id ? { ...m, disponible: newStatus } : m));
    
    try {
      const { error } = await supabase
        .from('models')
        .update({ disponible: newStatus })
        .eq('id', model.id);
        
      if (error) {
        // Rollback
        setModels(prev => prev.map(m => m.id === model.id ? { ...m, disponible: !newStatus } : m));
        toast.error('No se pudo actualizar disponibilidad: ' + error.message);
      } else {
        invalidateModelsCache();
        toast.success(`${model.nombre} ahora está ${newStatus ? 'Disponible' : 'No disponible'}`);
      }
    } catch (err: any) {
      setModels(prev => prev.map(m => m.id === model.id ? { ...m, disponible: !newStatus } : m));
      toast.error('Error al actualizar disponibilidad');
    }
  };

  const exportCatalogPDF = async () => {
    const toastId = toast.loading('Generando catálogo general PDF...');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const activeModels = modelPopularity
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return (a.model.nombre || '').localeCompare(b.model.nombre || '');
        })
        .map(item => item.model);

      if (activeModels.length === 0) {
        toast.error('No hay modelos activas para el catálogo', { id: toastId });
        return;
      }

      const primaryColor = [10, 10, 10];
      const textWhite = [255, 255, 255];
      const textMuted = [150, 150, 150];

      // --- COVER PAGE ---
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 297, 'F');

      // Collage in background
      doc.setGState(new (doc as any).GState({opacity: 0.12}));
      let coverPhotoIdx = 0;
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 3; j++) {
          if (coverPhotoIdx < activeModels.length && activeModels[coverPhotoIdx].photos && activeModels[coverPhotoIdx].photos.length > 0) {
             const base64Data = resolvePhoto(activeModels[coverPhotoIdx].photos[0]);
             try {
               // Full width is 210 -> two columns of 105. Full height is 297 -> three rows of 99.
               doc.addImage(base64Data, 'JPEG', i * 105, j * 99, 105, 99, `cover_${coverPhotoIdx}`, 'FAST');
             } catch(e) {}
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
      doc.text('planet', startHeaderX, 120);

      doc.setFont('times', 'italic');
      doc.setFontSize(headerFontSize);
      doc.setTextColor(204, 0, 0);
      doc.text('talent', startHeaderX + planetWidth + gap, 120);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('AGENCIA DE MODELOS', 105, 134, { align: 'center', charSpace: 3 });

      doc.setDrawColor(204, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(95, 144, 115, 144);

      doc.setFont('times', 'italic');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('Catálogo Oficial · 2026', 105, 157, { align: 'center' });

      // --- MODEL PAGES ---
      let yOffset = 20;
      let modelsOnPage = 0;

      for (let i = 0; i < activeModels.length; i++) {
        const model = activeModels[i];
        
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
            doc.addImage(base64Data, 'JPEG', 20, yOffset, 75, 105, `model_${model.id}`, 'FAST');
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
        if (i === activeModels.length - 1 && modelsOnPage === 0) {
          const closingY = 150;

          // Separador rojo sutil
          doc.setDrawColor(204, 0, 0);
          doc.setLineWidth(0.5);
          doc.line(20, closingY, 190, closingY);

          // Fondo decorativo sutil en la mitad inferior
          doc.setFillColor(15, 15, 15);
          doc.roundedRect(20, closingY + 8, 170, 108, 2, 2, 'F');

          // Logo planet talent en el cierre
          const logoY = closingY + 32;
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

      // --- BACK COVER ---
      doc.addPage();
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 297, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(headerFontSize);
      doc.setTextColor(255, 255, 255);
      doc.text('planet', startHeaderX, 130);

      doc.setFont('times', 'italic');
      doc.setFontSize(headerFontSize);
      doc.setTextColor(204, 0, 0);
      doc.text('talent', startHeaderX + planetWidth + gap, 130);

      doc.setFont('times', 'italic');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('Gracias por tu interés en Planet Talent', 105, 145, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(204, 0, 0);
      doc.text('talent@planetrecords.it  ·  @planet_talent_agency', 105, 158, { align: 'center' });

      doc.setFont('times', 'italic');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('Agencia de Modelos #1 de Cuba', 105, 172, { align: 'center' });

      doc.setDrawColor(204, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(85, 182, 125, 182);

      doc.save('PlanetTalent_Catalogo_General.pdf');
      toast.success('Catálogo PDF generado con éxito', { id: toastId });

    } catch (error) {
      console.error(error);
      toast.error('Error al generar el catálogo', { id: toastId });
    }
  };

  const processFiles = (filesArray: File[]) => {
    const imageFiles = filesArray.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error("Por favor selecciona archivos de imagen válidos (JPG, PNG, WebP)");
      return;
    }

    setIsUploadingPhotos(true);
    const toastId = toast.loading(`Comprimiendo a WebP y subiendo ${imageFiles.length} foto${imageFiles.length > 1 ? 's' : ''} a Supabase Storage...`);

    const modelFolder = formModel.nombre ? `models/${formModel.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'models/temp';
    const uploadPromises = imageFiles.map(file => 
      uploadImageToSupabaseStorage(file, modelFolder)
    );
    
    Promise.all(uploadPromises)
      .then(publicUrls => {
        setFormModel(prev => ({
          ...prev,
          photos: [...(prev.photos || []), ...publicUrls]
        }));
        toast.dismiss(toastId);
        toast.success(`${publicUrls.length} foto${publicUrls.length > 1 ? 's' : ''} subida${publicUrls.length > 1 ? 's' : ''} a Supabase Storage en formato WebP`);
      })
      .catch(err => {
        console.error("Error subiendo archivos a Supabase Storage:", err);
        toast.dismiss(toastId);
        toast.error("Hubo un error al procesar o subir las imágenes al almacenamiento");
      })
      .finally(() => {
        setIsUploadingPhotos(false);
      });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDropFilesOnZone = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFileOverDropzone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleAddPhotoUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;
    setFormModel(prev => ({
      ...prev,
      photos: [...(prev.photos || []), urlInput.trim()]
    }));
    setUrlInput('');
    toast.success('URL de imagen añadida');
  };

  const handlePhotoDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedPhotoIdx(index);
  };

  const handlePhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPhotoIdx !== index) {
      setDragOverPhotoIdx(index);
    }
  };

  const handlePhotoDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPhotoIdx === null || draggedPhotoIdx === targetIndex) {
      setDraggedPhotoIdx(null);
      setDragOverPhotoIdx(null);
      return;
    }

    setFormModel(prev => {
      if (!prev.photos) return prev;
      const newPhotos = [...prev.photos];
      const [draggedPhoto] = newPhotos.splice(draggedPhotoIdx, 1);
      newPhotos.splice(targetIndex, 0, draggedPhoto);
      return { ...prev, photos: newPhotos };
    });

    toast.success(`Foto movida a la posición ${targetIndex + 1}${targetIndex === 0 ? ' (Foto Principal)' : ''}`);
    setDraggedPhotoIdx(null);
    setDragOverPhotoIdx(null);
  };

  const handlePhotoDragEnd = () => {
    setDraggedPhotoIdx(null);
    setDragOverPhotoIdx(null);
  };

  const setPrimaryPhoto = (index: number) => {
    if (index === 0) return;
    setFormModel(prev => {
      if (!prev.photos) return prev;
      const newPhotos = [...prev.photos];
      const [selectedPhoto] = newPhotos.splice(index, 1);
      newPhotos.unshift(selectedPhoto);
      return { ...prev, photos: newPhotos };
    });
    toast.success('Foto establecida como Principal');
  };

  const removePhoto = (index: number) => {
    setFormModel(prev => ({
      ...prev,
      photos: prev.photos ? prev.photos.filter((_, i) => i !== index) : []
    }));
    toast('Foto eliminada', { icon: '🗑️' });
  };

  const movePhoto = (index: number, direction: 'left' | 'right') => {
    setFormModel(prev => {
      if (!prev.photos) return prev;
      const newPhotos = [...prev.photos];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newPhotos.length) return prev;
      
      const temp = newPhotos[index];
      newPhotos[index] = newPhotos[targetIndex];
      newPhotos[targetIndex] = temp;
      
      return {
        ...prev,
        photos: newPhotos
      };
    });
  };

  // Stats calculations
  const totalModels = models.length;
  const averageAge = totalModels > 0 
    ? Math.round(models.reduce((sum, m) => sum + (m.edad || 0), 0) / totalModels) 
    : 0;
  const averageHeight = totalModels > 0 
    ? Math.round(models.reduce((sum, m) => sum + (m.estatura || 0), 0) / totalModels) 
    : 0;

  // Popularity and booking stats calculations
  const modelPopularity = models.map(model => {
    const associatedBookings = bookings.filter(b => {
      const am = getModelsForBooking(b.detalles, models);
      return am.some(m => m.id === model.id);
    });
    
    const count = associatedBookings.length;
    const acceptedCount = associatedBookings.filter(b => b.estado === 'aceptado').length;
    const pendingCount = associatedBookings.filter(b => b.estado === 'pendiente' || b.estado === 'pending').length;
    
    return {
      model,
      count,
      acceptedCount,
      pendingCount
    };
  }).sort((a, b) => b.count - a.count);

  const mostRequested = modelPopularity.length > 0 && modelPopularity[0].count > 0 ? modelPopularity[0] : null;
  const modelsWithBookings = modelPopularity.filter(m => m.count > 0).length;

  // Filter & Sort logic
  const filteredModels = models
    .filter(m => {
      const fullname = `${m.nombre} ${m.apellidos}`.toLowerCase();
      const matchesSearch = fullname.includes(searchQuery.toLowerCase()) || 
                            (m.instagram && m.instagram.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesPiel = pielFilter === 'all' || m.piel === pielFilter;
      
      const level = getModelLevel(m.instagram);
      const matchesLevel = levelFilter === 'all' || 
                           (levelFilter === 'premium' && level === 'Influencer premium') ||
                           (levelFilter === 'macro' && level === 'Macro influencer') ||
                           (levelFilter === 'mid' && level === 'Mid Influencer') ||
                           (levelFilter === 'micro' && level === 'Micro influencer');
      
      return matchesSearch && matchesPiel && matchesLevel;
    })
    .sort((a, b) => {
      if (sortBy === 'nombre') {
        return a.nombre.localeCompare(b.nombre);
      }
      if (sortBy === 'edad') {
        return (a.edad || 0) - (b.edad || 0);
      }
      if (sortBy === 'estatura') {
        return (b.estatura || 0) - (a.estatura || 0);
      }
      if (sortBy === 'nivel') {
        const getWeight = (instagram: string | undefined | null) => {
          const lvl = getModelLevel(instagram);
          if (lvl === 'Influencer premium') return 4;
          if (lvl === 'Macro influencer') return 3;
          if (lvl === 'Mid Influencer') return 2;
          if (lvl === 'Micro influencer') return 1;
          return 0;
        };
        const weightA = getWeight(a.instagram);
        const weightB = getWeight(b.instagram);
        if (weightA !== weightB) {
          return weightB - weightA;
        }
        const getFollowersCount = (instagram: string | undefined | null) => {
          if (!instagram) return 0;
          const [_, followersStr] = instagram.split('|');
          if (!followersStr) return 0;
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
            clean = clean.replace(/[,.]/g, '');
            const val = parseFloat(clean);
            if (!isNaN(val)) num = val;
          }
          return num;
        };
        const fA = getFollowersCount(a.instagram);
        const fB = getFollowersCount(b.instagram);
        if (fA !== fB) {
          return fB - fA;
        }
        return a.nombre.localeCompare(b.nombre);
      }
      return 0;
    });

  // Unique skin colors for filtering
  const skinTypes = Array.from(new Set(models.map(m => m.piel).filter(Boolean)));
  const pendingBookingsCount = bookings.filter(b => b.estado === 'pendiente' || b.estado === 'pending').length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F8F6F2] font-sans selection:bg-[#CC0000] selection:text-white flex flex-col justify-between">
      <Toaster 
        theme="dark" 
        position="bottom-center" 
        toastOptions={{ 
          style: { 
            background: '#0A0A0A', 
            color: '#FFFFFF', 
            border: '1px solid rgba(204, 0, 0, 0.4)',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.9), 0 0 20px rgba(204, 0, 0, 0.2)',
            borderRadius: '6px'
          } 
        }} 
      />
      {/* Background Decor with subtle luxury pattern */}
      <div className="fixed inset-0 opacity-5 bg-[linear-gradient(rgba(204,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(204,0,0,0.05)_1px,transparent_1px)] bg-[size:50px_50px] z-0 pointer-events-none"></div>
      
      {/* STICKY TOP APP BAR (MOBILE FIRST DESIGN) */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Brand & Admin Identity Badge */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1 overflow-hidden">
            <img 
              loading="lazy" 
              src="/Logo de Planet Talent.PNG" 
              alt="Planet Talent" 
              className="h-7 sm:h-8 md:h-9 w-auto object-contain shrink-0 drop-shadow-sm" 
            />
            
            <div className="h-4 w-px bg-white/20 hidden sm:block shrink-0"></div>
            
            <h1 className="text-[11px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[#E0E0E0] font-sans truncate min-w-0">
              <span className="hidden md:inline">Panel de Administración</span>
              <span className="inline md:hidden">Administración</span>
            </h1>
          </div>

          {/* Top Actions: Booking Notification & Discreet Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            {/* Quick Link to Bookings notification if pending */}
            {pendingBookingsCount > 0 && (
              <button
                onClick={() => {
                  setActiveTab('bookings');
                  setBookingFilter('pendiente');
                }}
                className="relative flex items-center gap-1.5 bg-[#8B1A1A]/20 hover:bg-[#8B1A1A]/35 text-white/90 border border-[#8B1A1A]/40 px-3 py-1.5 rounded-sm text-xs font-medium transition-all cursor-pointer shadow-sm"
                title={`${pendingBookingsCount} solicitudes pendientes`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#992020]"></span>
                <span className="text-[10px] uppercase tracking-wider hidden xs:inline">{pendingBookingsCount} Nuevas</span>
                <span className="xs:hidden text-[10px] font-mono">{pendingBookingsCount}</span>
              </button>
            )}

            {/* Discreet Logout Button (Reduced visual prominence) */}
            <button 
              onClick={onLogout}
              title="Cerrar sesión de administrador"
              className="flex items-center gap-1.5 text-neutral-400 hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition-all text-xs px-3 py-1.5 rounded-sm cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#CC0000]" />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-medium text-[#D0D0D0]">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 relative z-10 flex-1">
        
        {/* HERO TITLE & CONTEXT */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-4 bg-[#CC0000] inline-block rounded-full"></span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#CC0000] font-bold">Consola de Gestión</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-light text-white tracking-tight">
                Panel de <span className="italic text-[#CC0000] font-normal">Administración</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A0A0A0] mt-1 max-w-2xl font-light">
                Gestiona el catálogo oficial de modelos, atiende solicitudes de clientes en tiempo real y consulta métricas de popularidad.
              </p>
            </div>

            {/* Header title area without duplicate quick action */}
          </div>
        </div>

        {/* PRIORITY ALERT BANNER: NEW PENDING BOOKING REQUESTS */}
        {pendingBookingsCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-[#0E0E0E] border border-white/10 hover:border-[#CC0000]/30 transition-all p-4 sm:p-5 rounded-sm shadow-[0_4px_25px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/25 flex items-center justify-center shrink-0 text-[#CC0000]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/5 text-neutral-300 border border-white/10">
                    Atención Requerida
                  </span>
                  <span className="text-[11px] text-[#A0A0A0]">{pendingBookingsCount} solicitud{pendingBookingsCount > 1 ? 'es' : ''} pendiente{pendingBookingsCount > 1 ? 's' : ''}</span>
                </div>
                <p className="text-xs sm:text-sm font-normal text-white mt-1">
                  Hay <strong className="text-white font-semibold">{pendingBookingsCount} solicitud{pendingBookingsCount > 1 ? 'es' : ''} de booking</strong> en espera de respuesta.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('bookings');
                setBookingFilter('pendiente');
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#8B1A1A] hover:bg-[#721212] border border-[#A82525]/30 text-white px-4 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <span>Revisar Solicitudes</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* TABS SELECTOR (MOBILE FIRST SEGMENTED CONTROL) */}
        <div className="grid grid-cols-3 gap-1.5 bg-[#050505] border border-white/10 p-1.5 rounded-sm mb-6 max-w-xl">
          <button
            onClick={() => setActiveTab('models')}
            className={`py-3 px-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'models'
                ? 'bg-[#8B1A1A] text-white shadow-sm border border-[#A82525]/40'
                : 'text-[#B0B0B0] hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="truncate">Modelos ({totalModels})</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('bookings');
              fetchBookings();
            }}
            className={`py-3 px-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 relative cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-[#8B1A1A] text-white shadow-sm border border-[#A82525]/40'
                : 'text-[#B0B0B0] hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="truncate">Solicitudes</span>
            {pendingBookingsCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-black text-[9px] font-black flex items-center justify-center animate-pulse">
                {pendingBookingsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('stats');
              fetchBookings();
            }}
            className={`py-3 px-2 rounded-sm text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-[#8B1A1A] text-white shadow-sm border border-[#A82525]/40'
                : 'text-[#B0B0B0] hover:text-white hover:bg-white/5'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span className="truncate">Popularidad</span>
          </button>
        </div>

        {/* METRICS BENTO GRID (RESPONSIVE) */}
        <div className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {activeTab === 'models' ? (
            <>
              <div className="bg-[#0A0A0A] border border-white/5 hover:border-[#CC0000]/30 transition-all p-4 sm:p-5 rounded-sm flex items-center justify-between group">
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0] font-semibold">Modelos Activas</p>
                  <h3 className="text-2xl sm:text-3xl font-sans font-bold text-white group-hover:text-[#CC0000] transition-colors tracking-tight mt-1">{totalModels}</h3>
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">{models.filter(m => m.disponible !== false).length} disponibles</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[#E0E0E0] group-hover:text-white group-hover:border-[#CC0000]/30 transition-all shrink-0">
                  <User className="w-4 h-4 text-[#CC0000]" />
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-white/5 hover:border-[#CC0000]/30 transition-all p-4 sm:p-5 rounded-sm flex items-center justify-between group">
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0] font-semibold">Edad Promedio</p>
                  <h3 className="text-2xl sm:text-3xl font-sans font-bold text-white group-hover:text-[#CC0000] transition-colors tracking-tight mt-1">
                    {averageAge} <span className="text-xs font-normal text-[#A0A0A0]">años</span>
                  </h3>
                  <span className="text-[10px] text-[#888] font-mono mt-0.5 block">Alt. {averageHeight} cm</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[#E0E0E0] group-hover:text-white group-hover:border-[#CC0000]/30 transition-all shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-[#0A0A0A] border border-white/5 hover:border-[#CC0000]/30 transition-all p-4 sm:p-5 rounded-sm flex items-center justify-between group">
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0] font-semibold">Nuevas (7 días)</p>
                  <h3 className="text-2xl sm:text-3xl font-sans font-bold text-white group-hover:text-[#CC0000] transition-colors tracking-tight mt-1">
                    {models.filter(m => isModelNew(m)).length} <span className="text-xs font-normal text-[#A0A0A0]">recientes</span>
                  </h3>
                  <span className="text-[10px] text-amber-400 font-mono mt-0.5 block">Con cinta destacada</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[#E0E0E0] group-hover:text-white group-hover:border-[#CC0000]/30 transition-all shrink-0">
                  <SlidersHorizontal className="w-4 h-4 text-[#CC0000]" />
                </div>
              </div>
            </>
          ) : activeTab === 'bookings' ? (
            <>
              <div className="bg-[#0A0A0A] border border-white/5 hover:border-[#CC0000]/30 transition-all p-4 sm:p-5 rounded-sm flex items-center justify-between group">
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0] font-semibold">Total Solicitudes</p>
                  <h3 className="text-2xl sm:text-3xl font-sans font-bold text-white group-hover:text-[#CC0000] transition-colors tracking-tight mt-1">{bookings.length}</h3>
                  <span className="text-[10px] text-[#888] font-mono mt-0.5 block">Histórico</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[#E0E0E0] shrink-0">
                  <Calendar className="w-4 h-4 text-[#CC0000]" />
                </div>
              </div>

              <div className={`p-4 sm:p-5 rounded-sm flex items-center justify-between group border transition-all ${
                pendingBookingsCount > 0 
                  ? 'bg-amber-950/20 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                  : 'bg-[#0A0A0A] border-white/5'
              }`}>
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-amber-300 font-bold">Por Revisar</p>
                  <h3 className="text-2xl sm:text-3xl font-sans font-bold text-amber-400 tracking-tight mt-1">{pendingBookingsCount}</h3>
                  <span className="text-[10px] text-amber-400/80 font-mono mt-0.5 block">Requieren atención</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-[#0A0A0A] border border-white/5 hover:border-emerald-500/30 transition-all p-4 sm:p-5 rounded-sm flex items-center justify-between group">
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-semibold">Aceptadas</p>
                  <h3 className="text-2xl sm:text-3xl font-sans font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight mt-1">
                    {bookings.filter(b => b.estado === 'aceptado' || b.estado === 'accepted').length}
                  </h3>
                  <span className="text-[10px] text-emerald-400/80 font-mono mt-0.5 block">Confirmadas</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#0A0A0A] border border-white/5 hover:border-[#CC0000]/30 transition-all p-4 sm:p-5 rounded-sm flex items-center justify-between group gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0] font-semibold">Modelo Estrella</p>
                  <h3 className="text-base sm:text-lg font-sans font-semibold text-white group-hover:text-[#CC0000] transition-colors mt-1 truncate">
                    {mostRequested ? `${mostRequested.model.nombre} ${mostRequested.model.apellidos}` : 'Ninguna'}
                  </h3>
                  <span className="text-[10px] text-[#A0A0A0] font-mono mt-0.5 block">
                    {mostRequested ? `${mostRequested.count} solicitudes` : 'Sin datos'}
                  </span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[#E0E0E0] shrink-0">
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-white/5 hover:border-[#CC0000]/30 transition-all p-4 sm:p-5 rounded-sm flex items-center justify-between group">
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0] font-semibold">Con Bookings</p>
                  <h3 className="text-2xl sm:text-3xl font-sans font-bold text-white group-hover:text-[#CC0000] transition-colors tracking-tight mt-1">
                    {modelsWithBookings} <span className="text-xs font-normal text-[#A0A0A0]">/ {totalModels}</span>
                  </h3>
                  <span className="text-[10px] text-[#A0A0A0] font-mono mt-0.5 block">Modelos con interés</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[#E0E0E0] shrink-0">
                  <TrendingUp className="w-4 h-4 text-[#CC0000]" />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-[#0A0A0A] border border-white/5 hover:border-[#CC0000]/30 transition-all p-4 sm:p-5 rounded-sm flex items-center justify-between group">
                <div>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-[#A0A0A0] font-semibold">Ratio Conversión</p>
                  <h3 className="text-2xl sm:text-3xl font-sans font-bold text-white group-hover:text-[#CC0000] transition-colors tracking-tight mt-1">
                    {totalModels > 0 ? Math.round((modelsWithBookings / totalModels) * 100) : 0}%
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">Efectividad del book</span>
                </div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[#E0E0E0] shrink-0">
                  <Sparkles className="w-4 h-4 text-[#CC0000]" />
                </div>
              </div>
            </>
          )}
          </div>
        </div>

        {/* TAB VIEWS */}
        {activeTab === 'models' ? (
          <>
            {/* CONTROLS BAR: SEARCH, FILTER, ADD MODEL */}
            <div className="flex flex-col gap-4 mb-6 sm:mb-8 bg-[#0A0A0A] border border-white/5 p-4 sm:p-5 rounded-sm">
              {/* Primary Action Row: Add + Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white tracking-wide">Gestión de Modelos</h3>
                  <span className="text-xs text-[#A0A0A0] font-mono">({filteredModels.length} de {totalModels})</span>
                </div>
                
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <button
                    onClick={() => {
                      fetchModels(true);
                      fetchBookings(true, false);
                      toast.success('Sincronizando datos...');
                    }}
                    disabled={loading || loadingBookings}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 px-3.5 py-2.5 rounded-sm text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50"
                    title="Sincronizar datos con la base de datos"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingBookings ? 'animate-spin text-[#CC0000]' : 'text-[#A0A0A0]'}`} />
                    <span>Sincronizar</span>
                  </button>

                  <button 
                    onClick={() => {
                      const templateText = `Hola 👋\nPara agregarte a nuestro catálogo necesito estos datos:\nInformación personal:\nNombre completo:\nInstagram (con @):\nFecha de nacimiento:\nColor de ojos:\nMedidas:\nEstatura (cm):\nBusto (cm):\nCintura (cm):\nCaderas (cm):\nTalla de calzado:\nTono de piel (Blanca / Negra / Mestiza / Mulata):\nRedes sociales:\nURL del perfil de Instagram:\nFotos:\nMínimo 1 foto editorial (la que aparece en la card del catálogo)\nIdealmente 3 fotos adicionales para el carrusel del perfil\nLas fotos Polaroid (fondo neutro) para el catálogo PDF`;
                      navigator.clipboard.writeText(templateText);
                      toast.success('Plantilla copiada al portapapeles');
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 px-3.5 py-2.5 rounded-sm text-[11px] font-medium transition-all cursor-pointer"
                    title="Copiar plantilla para solicitar datos a una nueva modelo"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#A0A0A0]" />
                    <span>Plantilla</span>
                  </button>

                  <button 
                    onClick={handleMigratePhotosToStorage}
                    disabled={isMigratingStorage || loading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-sky-950/20 hover:bg-sky-950/40 text-sky-300 hover:text-sky-200 border border-sky-500/20 hover:border-sky-500/40 px-3.5 py-2.5 rounded-sm text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50"
                    title="Migrar fotos en base de datos a archivos dedicados en Supabase Storage (servidas por URL directa)"
                  >
                    <CloudUpload className={`w-3.5 h-3.5 ${isMigratingStorage ? 'animate-bounce text-sky-400' : 'text-sky-400'}`} />
                    <span>{isMigratingStorage ? 'Migrando...' : 'Migrar a Storage'}</span>
                  </button>

                  <button 
                    onClick={handleBulkOptimizeImages}
                    disabled={isOptimizingImages || loading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-300 hover:text-emerald-200 border border-emerald-500/20 hover:border-emerald-500/40 px-3.5 py-2.5 rounded-sm text-[11px] font-medium transition-all cursor-pointer disabled:opacity-50"
                    title="Optimizar y convertir fotos existentes del catálogo a WebP ultraligero"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isOptimizingImages ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                    <span>{isOptimizingImages ? 'Optimizando...' : 'Optimizar Fotos WebP'}</span>
                  </button>

                  <button 
                    onClick={exportCatalogPDF}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 px-3.5 py-2.5 rounded-sm text-[11px] font-medium transition-all cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#992020]" />
                    <span>Catálogo PDF</span>
                  </button>

                  <button 
                    onClick={openAddModal}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#8B1A1A] hover:bg-[#721212] border border-[#A82525]/30 text-white px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Añadir Modelo</span>
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre o @instagram..."
                    className="w-full bg-black/60 border border-white/15 pl-10 pr-4 py-2.5 text-xs text-white rounded-sm focus:outline-none focus:border-[#CC0000] transition-all placeholder:text-neutral-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* Filter Dropdowns Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* Filter by Skin Type */}
                  <div className="relative">
                    <select
                      value={pielFilter}
                      onChange={e => setPielFilter(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-white/10 px-3 pr-8 py-2.5 text-xs text-white rounded-sm focus:outline-none focus:border-[#CC0000] appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '12px' }}
                    >
                      <option value="all" className="bg-[#0A0A0A] text-white">Todos los tonos</option>
                      {skinTypes.map(skin => (
                        <option key={skin} value={skin} className="bg-[#0A0A0A] text-white">{skin}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Level */}
                  <div className="relative">
                    <select
                      value={levelFilter}
                      onChange={e => setLevelFilter(e.target.value as any)}
                      className="w-full bg-[#0A0A0A] border border-white/10 px-3 pr-8 py-2.5 text-xs text-white rounded-sm focus:outline-none focus:border-[#CC0000] appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '12px' }}
                    >
                      <option value="all" className="bg-[#0A0A0A] text-white">Todos los niveles</option>
                      <option value="micro" className="bg-[#0A0A0A] text-white">Micro (10k-15k)</option>
                      <option value="mid" className="bg-[#0A0A0A] text-white">Mid (15k-50k)</option>
                      <option value="macro" className="bg-[#0A0A0A] text-white">Macro (50k-100k)</option>
                      <option value="premium" className="bg-[#0A0A0A] text-white">Premium (100k+)</option>
                    </select>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="w-full bg-[#0A0A0A] border border-white/10 px-3 pr-8 py-2.5 text-xs text-white rounded-sm focus:outline-none focus:border-[#CC0000] appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: '12px' }}
                    >
                      <option value="nombre" className="bg-[#0A0A0A] text-white">Nombre (A-Z)</option>
                      <option value="edad" className="bg-[#0A0A0A] text-white">Edad</option>
                      <option value="estatura" className="bg-[#0A0A0A] text-white">Estatura</option>
                      <option value="nivel" className="bg-[#0A0A0A] text-white">Nivel Modelo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* LOADING STATE */}
            {loading ? (
              <div className="flex flex-col justify-center items-center py-32 gap-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#CC0000]/10 blur-xl animate-pulse"></div>
                  <div className="relative w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-black/40 overflow-hidden">
                    <img src="/favicon.svg" className="h-8 w-8 object-contain animate-pulse" alt="Planet Talent Loading" />
                    <Loader2 className="absolute w-12 h-12 text-[#CC0000] animate-spin" />
                  </div>
                </div>
                <p className="text-[#E0E0E0] text-xs uppercase tracking-widest font-medium">Cargando catálogo...</p>
              </div>
            ) : modelsError ? (
              <div className="bg-red-950/10 border border-red-500/10 rounded-sm p-8 text-center max-w-md mx-auto my-12 flex flex-col items-center gap-4">
                <span className="text-2xl">⚠️</span>
                <h4 className="font-serif text-lg text-white font-light">Error al cargar modelos</h4>
                <p className="text-xs text-red-400/80 leading-relaxed max-w-xs">
                  {modelsError}
                </p>
                <button 
                  onClick={() => fetchModels(true)}
                  className="px-5 py-2.5 text-xs tracking-widest uppercase font-bold bg-[#CC0000] hover:bg-[#A30000] text-white rounded-sm shadow-md transition-all active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                  REINTENTAR CONEXIÓN
                </button>
              </div>
            ) : (
              /* MODERN MODELS TABLE */
              <div className="bg-[#0A0A0A] border border-white/5 rounded-sm overflow-hidden backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-[#E0E0E0] text-[10px] sm:text-xs uppercase tracking-[0.15em]">
                        <th className="p-4 sm:p-5 font-semibold">Modelo</th>
                        <th className="p-4 sm:p-5 font-semibold hidden md:table-cell">Instagram</th>
                        <th className="p-4 sm:p-5 font-semibold hidden sm:table-cell">Medidas (B/C/C)</th>
                        <th className="p-4 sm:p-5 font-semibold hidden sm:table-cell">Detalles</th>
                        <th className="p-4 sm:p-5 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredModels.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-16 text-center text-[#E0E0E0]">
                            <p className="text-sm font-serif italic mb-2">No se encontraron modelos</p>
                            <p className="text-xs text-[#555]">Intenta modificar tus filtros de búsqueda.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredModels.map((model, index) => {
                          const [igUser, igFollowers, igAvatar] = (model.instagram || '').split('|');
                          const firstPic = model.photos && model.photos[0] ? resolvePhoto(model.photos[0]) : null;
                          const hasMeasurements = model.busto || model.cintura || model.caderas;
                          
                          return (
                            <motion.tr 
                              key={model.id} 
                              custom={index}
                              initial="hidden"
                              animate="visible"
                              variants={{
                                hidden: { opacity: 0, y: 15 },
                                visible: (i: number) => ({
                                  opacity: 1,
                                  y: 0,
                                  transition: {
                                    delay: Math.min(i * 0.025, 0.35),
                                    duration: 0.5,
                                    ease: [0.16, 1, 0.3, 1], // Custom ultra-smooth cubic bezier curve
                                  }
                                })
                              }}
                              onClick={() => setPreviewModel(model)} 
                              className="border-b border-white/5 hover:bg-white/[0.01] transition-all duration-300 group cursor-pointer"
                            >
                              
                              {/* Image & Name */}
                              <td className="p-4 sm:p-5">
                                <div className="flex items-center gap-4">
                                  <div className="relative w-12 h-16 sm:w-14 sm:h-20 shrink-0 bg-[#0A0A0A] border border-white/5 rounded-sm overflow-hidden flex items-center justify-center">
                                    {firstPic ? (
                                      <img loading="lazy" 
                                        decoding="async"
                                        src={firstPic} 
                                        alt={model.nombre} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={handleImgError} />
                                    ) : (
                                      <Camera className="w-5 h-5 text-[#444]" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-serif text-lg sm:text-xl text-[#F8F6F2] font-light group-hover:text-[#CC0000] transition-colors duration-300 leading-snug">
                                      {model.nombre} <span className="italic font-light">{model.apellidos}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${model.disponible !== false ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-gray-400'}`} />
                                        <span className={`text-[10px] tracking-wider uppercase font-sans ${model.disponible !== false ? 'text-emerald-400 font-medium' : 'text-gray-400 font-medium'}`}>
                                          {model.disponible !== false ? 'Disponible' : 'No disponible'}
                                        </span>
                                      </div>
                                      {isModelFeatured(model) && (
                                        <button
                                          type="button"
                                          onClick={(e) => toggleModelFeatured(model, e)}
                                          title="Clic para alternar estado de Destacada"
                                          className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#CC0000]/20 text-[#FF5555] border border-[#CC0000]/40 hover:bg-[#CC0000]/40 transition-all cursor-pointer"
                                        >
                                          <Star className="w-2.5 h-2.5 fill-[#CC0000] text-[#CC0000]" />
                                          DESTACADA
                                        </button>
                                      )}
                                      {isModelNew(model) && (
                                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 text-stone-950 shadow-sm border border-amber-200/50 select-none inline-flex items-center">
                                          NUEVA
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-[#E0E0E0] mt-1.5 sm:hidden flex flex-wrap items-center gap-2">
                                      {(() => {
                                        const parts = (model.instagram || '').split('|');
                                        const igUser = parts[0];
                                        const igFollowers = parts[1];
                                        const updatedAt = parts[4];
                                        const level = getModelLevel(model.instagram);
                                        return (
                                          <div className="flex flex-col gap-1 w-full mt-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                              {igUser && (
                                                <span className="text-[11px] text-[#A0A0A0]">
                                                  {igUser} {igFollowers ? `(${formatFollowersDisplay(model.instagram)})` : '(Sin datos)'}
                                                </span>
                                              )}
                                              {level && <ModelLevelBadge level={level} size="xs" />}
                                            </div>
                                            {igUser && (
                                              <span className="text-[9px] text-[#888] italic">
                                                Followers · {formatUpdatedAgo(updatedAt, 'es')}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Instagram */}
                              <td className="p-4 sm:p-5 hidden md:table-cell">
                                {model.instagram ? (
                                  (() => {
                                    const parts = model.instagram.split('|');
                                    const igUser = parts[0];
                                    const igFollowers = parts[1];
                                    const updatedAt = parts[4];
                                    return (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <a 
                                            href={`https://instagram.com/${igUser.replace('@', '')}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-xs text-[#E0E0E0] hover:text-white flex items-center gap-1.5 transition-colors duration-300"
                                          >
                                            <Instagram className="w-3.5 h-3.5 text-[#CC0000]" />
                                            <span className="font-medium">{igUser}</span>
                                          </a>
                                          {igFollowers ? (
                                            <span className="text-[9px] uppercase tracking-wider bg-[#CC0000]/10 border border-[#CC0000]/20 px-2 py-0.5 rounded-full text-[#F8F6F2] font-mono">
                                              {formatFollowersDisplay(model.instagram)}
                                            </span>
                                          ) : (
                                            <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-white/50">
                                              Sin datos
                                            </span>
                                          )}
                                          {(() => {
                                            const level = getModelLevel(model.instagram);
                                            return level ? (
                                              <ModelLevelBadge level={level} size="xs" />
                                            ) : null;
                                          })()}
                                        </div>
                                        <span className="text-[9px] text-[#A0A0A0] italic">
                                          Followers · {formatUpdatedAgo(updatedAt, 'es')}
                                        </span>
                                      </div>
                                    );
                                  })()
                                ) : (
                                  <span className="text-xs text-[#E0E0E0] font-light">—</span>
                                )}
                              </td>

                              {/* Measurements */}
                              <td className="p-4 sm:p-5 hidden sm:table-cell">
                                {hasMeasurements ? (
                                  <div className="flex items-baseline gap-1.5 font-mono text-xs text-[#F8F6F2]">
                                    <span className="bg-white/5 px-2 py-1 rounded-sm border border-white/5">{model.busto || '—'}</span>
                                    <span className="text-[#E0E0E0] text-[10px]">/</span>
                                    <span className="bg-white/5 px-2 py-1 rounded-sm border border-white/5">{model.cintura || '—'}</span>
                                    <span className="text-[#E0E0E0] text-[10px]">/</span>
                                    <span className="bg-white/5 px-2 py-1 rounded-sm border border-white/5">{model.caderas || '—'}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#E0E0E0] font-light">No especificadas</span>
                                )}
                              </td>

                              {/* Details */}
                              <td className="p-4 sm:p-5 hidden sm:table-cell">
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {model.edad ? <span className="bg-black/50 border border-white/30 px-2 py-1 rounded-sm text-[#E0E0E0]"><span className="text-[9px] uppercase tracking-widest text-[#8A8A8A] mr-1.5 font-semibold">EDAD</span><span className="font-mono">{model.edad}</span></span> : null}
                                  {model.estatura ? <span className="bg-black/50 border border-white/30 px-2 py-1 rounded-sm text-[#E0E0E0]"><span className="text-[9px] uppercase tracking-widest text-[#8A8A8A] mr-1.5 font-semibold">ALT.</span><span className="font-mono">{model.estatura}</span></span> : null}
                                  {model.piel ? <span className="bg-black/50 border border-white/30 px-2 py-1 rounded-sm text-[#E0E0E0]"><span className="text-[9px] uppercase tracking-widest text-[#8A8A8A] mr-1.5 font-semibold">PIEL</span>{model.piel}</span> : null}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="p-4 sm:p-5 text-right">
                                <div className="flex items-center justify-end gap-2.5">
                                  <button 
                                    onClick={(e) => toggleModelFeatured(model, e)}
                                    disabled={saving || isDeleting}
                                    className={`p-2 rounded-sm border transition-all duration-300 shrink-0 cursor-pointer ${
                                      isModelFeatured(model) 
                                        ? 'bg-[#CC0000]/20 border-[#CC0000] text-[#FF4D4D] hover:bg-[#CC0000]/30 shadow-[0_0_10px_rgba(204,0,0,0.3)]' 
                                        : 'bg-white/5 border-white/5 text-[#8A8A8A] hover:text-white hover:border-white/20'
                                    }`}
                                    title={isModelFeatured(model) ? "Quitar de Destacadas en portada" : "Marcar como Destacada en portada"}
                                  >
                                    <Star className={`w-3.5 h-3.5 ${isModelFeatured(model) ? 'fill-current text-[#FF4D4D]' : ''}`} />
                                  </button>
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setLoadingEditId(model.id);
                                      openEditModal(model); 
                                      setTimeout(() => setLoadingEditId(null), 300);
                                    }}
                                    disabled={saving || isDeleting || loadingEditId === model.id}
                                    className="p-2 rounded-sm bg-white/5 border border-white/5 hover:border-[#CC0000]/50 hover:bg-[#CC0000]/10 text-[#E0E0E0] hover:text-white transition-all duration-300 shrink-0 disabled:opacity-40 disabled:pointer-events-none" 
                                    title="Editar Modelo"
                                  >
                                    {loadingEditId === model.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#CC0000]" />
                                    ) : (
                                      <Edit2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setModelToDelete(model); }}
                                    disabled={saving || isDeleting}
                                    className="p-2 rounded-sm bg-white/5 border border-white/5 hover:border-[#CC0000]/50 hover:bg-[#CC0000]/10 text-[#E0E0E0] hover:text-white transition-all duration-300 shrink-0 disabled:opacity-40 disabled:pointer-events-none" 
                                    title="Eliminar Modelo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>

                            </motion.tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'bookings' ? (
          <>
            {/* BOOKINGS FILTERS AND CONTROLS (Mobile Optimized, Icon Actions & View Mode Toggle) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6 bg-[#0A0A0A] border border-white/5 p-3 sm:p-4 rounded-sm">
              {/* Category Pills (Scrollable on Mobile) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar shrink-0">
                {[
                  { value: 'all', label: 'Todas' },
                  { value: 'pendiente', label: 'Pendientes' },
                  { value: 'aceptado', label: 'Aceptadas' },
                  { value: 'rechazado', label: 'Rechazadas' },
                  { value: 'archivado', label: 'Archivadas' }
                ].map((opt) => {
                  const count = opt.value === 'all' 
                    ? bookings.length 
                    : bookings.filter(b => b.estado === opt.value).length;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setBookingFilter(opt.value as any)}
                      className={`px-3 py-1.5 rounded-sm text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 border shrink-0 whitespace-nowrap cursor-pointer ${
                        bookingFilter === opt.value
                          ? 'bg-[#8B1A1A] border-[#A82525]/40 text-white shadow-sm'
                          : 'bg-white/5 border-white/10 hover:border-white/20 text-[#A0A0A0] hover:text-white'
                      }`}
                    >
                      {opt.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* View Toggle: Detalle vs Listado */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <span className="text-[10px] uppercase tracking-wider text-white/40 sm:hidden">Vista:</span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-sm">
                  <button
                    onClick={() => setBookingViewMode('detail')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                      bookingViewMode === 'detail'
                        ? 'bg-[#8B1A1A] text-white shadow-sm border border-[#A82525]/30'
                        : 'text-[#A0A0A0] hover:text-white hover:bg-white/5'
                    }`}
                    title="Vista detallada (Tarjetas)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider">Detalle</span>
                  </button>
                  <button
                    onClick={() => setBookingViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium transition-all cursor-pointer ${
                      bookingViewMode === 'list'
                        ? 'bg-[#8B1A1A] text-white shadow-sm border border-[#A82525]/30'
                        : 'text-[#A0A0A0] hover:text-white hover:bg-white/5'
                    }`}
                    title="Vista comprimida (Listado)"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider">Listado</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BOOKINGS LIST */}
            {loadingBookings ? (
              <div className="flex flex-col justify-center items-center py-32 gap-6">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-[#CC0000]/10 blur-xl animate-pulse"></div>
                  <div className="relative w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-black/40 overflow-hidden">
                    <img src="/favicon.svg" className="h-8 w-8 object-contain animate-pulse" alt="Planet Talent Loading" />
                    <Loader2 className="absolute w-12 h-12 text-[#CC0000] animate-spin" />
                  </div>
                </div>
                <p className="text-[#E0E0E0] text-xs uppercase tracking-widest font-medium">Cargando solicitudes...</p>
              </div>
            ) : bookingsError ? (
              <div className="bg-red-950/20 border border-red-500/10 rounded-sm p-8 text-center max-w-2xl mx-auto my-12 flex flex-col items-center gap-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <h4 className="font-serif text-xl text-white font-light">Acción Requerida</h4>
                <p className="text-xs text-red-400/80 leading-relaxed max-w-md">
                  {bookingsError}
                </p>
                <div className="bg-black/60 p-4 rounded-sm border border-white/5 text-left w-full font-mono text-[10px] text-[#E0E0E0] overflow-x-auto max-w-lg select-all">
                  {`/* Ejecuta esto en Supabase SQL Editor: */\n\nCREATE TABLE bookings (\n  id serial primary key,\n  nombre text not null,\n  email text not null,\n  telefono text,\n  empresa text,\n  fecha_evento date not null,\n  detalles text not null,\n  estado text default 'pendiente',\n  created_at timestamp with time zone default now()\n);\n\nALTER TABLE bookings ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Allow public insert" ON bookings FOR INSERT WITH CHECK (true);\nCREATE POLICY "Allow public select" ON bookings FOR SELECT USING (true);\nCREATE POLICY "Allow public update" ON bookings FOR UPDATE USING (true);\nCREATE POLICY "Allow public delete" ON bookings FOR DELETE USING (true);\n\n/* Si ya tienes la tabla creada, ejecuta solo esto: */\nALTER TABLE bookings ADD COLUMN IF NOT EXISTS telefono text;`}
                </div>
              </div>
            ) : bookings.filter(b => bookingFilter === 'all' || b.estado === bookingFilter).length === 0 ? (
              <div className="bg-[#0A0A0A] border border-white/5 rounded-sm p-16 text-center text-[#E0E0E0]">
                <Clock className="w-10 h-10 text-[#E0E0E0] mx-auto mb-4 animate-pulse" />
                <p className="text-sm font-serif italic mb-2">No hay solicitudes registradas</p>
                <p className="text-xs text-[#555]">Las solicitudes de booking enviadas por los clientes en esta categoría aparecerán aquí.</p>
              </div>
            ) : bookingViewMode === 'list' ? (
              /* COMPACT LIST VIEW */
              <div className="bg-[#0A0A0A] border border-white/10 rounded-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">
                        <th className="py-3 px-3 sm:px-4 w-10 text-center">Estado</th>
                        <th className="py-3 px-3 sm:px-4">Cliente / Empresa</th>
                        <th className="py-3 px-3 sm:px-4">Fechas (Evento / Recibido)</th>
                        <th className="py-3 px-3 sm:px-4 text-right">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {bookings
                        .filter(b => bookingFilter === 'all' || b.estado === bookingFilter)
                        .map((b) => {
                          const dateObj = new Date(b.created_at);
                          const formattedCreated = isNaN(dateObj.getTime()) ? '—' : dateObj.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });

                          const eventDateObj = new Date(b.fecha_evento);
                          const formattedEvent = isNaN(eventDateObj.getTime()) ? '—' : eventDateObj.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });

                          return (
                            <tr 
                              key={b.id} 
                              onClick={() => setSelectedBookingId(b.id)}
                              className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                            >
                              <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                                <span 
                                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                                    b.estado === 'aceptado'
                                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                      : b.estado === 'rechazado'
                                      ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]'
                                      : b.estado === 'archivado'
                                      ? 'bg-neutral-500'
                                      : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                  }`} 
                                  title={`Estado: ${b.estado || 'pendiente'}`}
                                />
                              </td>
                              <td className="py-3 px-3 sm:px-4">
                                <div className="font-semibold text-white group-hover:text-[#CC0000] transition-colors">{b.nombre}</div>
                                {b.empresa && <div className="text-[11px] text-[#A0A0A0]">{b.empresa}</div>}
                              </td>
                              <td className="py-3 px-3 sm:px-4 font-mono text-[11px] whitespace-nowrap">
                                <div className="text-white flex items-center gap-1.5">
                                  <span className="text-[9px] uppercase tracking-wider text-[#8A8A8A] font-sans font-medium">Evento:</span>
                                  <span>{formattedEvent}</span>
                                </div>
                                <div className="text-[#A0A0A0] flex items-center gap-1.5 text-[10px]">
                                  <span className="text-[9px] uppercase tracking-wider text-[#666666] font-sans">Recibido:</span>
                                  <span>{formattedCreated}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 text-[11px] text-white/40 group-hover:text-white transition-colors">
                                  Ver <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* DETAILED CARD VIEW */
              <div className="grid grid-cols-1 gap-6">
                {bookings
                  .filter(b => bookingFilter === 'all' || b.estado === bookingFilter)
                  .map((b) => {
                    const dateObj = new Date(b.created_at);
                    const formattedCreated = isNaN(dateObj.getTime()) ? '—' : dateObj.toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const eventDateObj = new Date(b.fecha_evento);
                    const formattedEvent = isNaN(eventDateObj.getTime()) ? '—' : eventDateObj.toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    });

                    const isPending = !b.estado || b.estado === 'pendiente';
                    const cleanPhone = b.telefono ? b.telefono.replace(/[^0-9+]/g, '') : '';
                    const isUpdating = updatingBookingId === b.id;

                    return (
                      <div 
                        key={b.id} 
                        className={`bg-[#0A0A0A] border rounded-sm transition-all duration-300 overflow-hidden ${
                          isPending 
                            ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/[0.03] to-transparent shadow-[0_0_20px_rgba(245,158,11,0.05)]' 
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Header banner for new/pending requests */}
                        {isPending && (
                          <div className="bg-amber-500/15 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-amber-300">
                            <span className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                              Nueva Solicitud Pendiente
                            </span>
                            <span className="text-[10px] text-amber-400/80 font-mono">Requiere atención</span>
                          </div>
                        )}

                        <div className="p-4 sm:p-6 flex flex-col gap-4">
                          {/* Top Row: Client Name, Company & Status Badge */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div>
                              <h4 className="font-serif text-xl sm:text-2xl font-normal text-white mb-1">
                                {b.nombre}
                              </h4>
                              {b.empresa && (
                                <p className="text-xs text-[#E0E0E0] flex items-center gap-1.5 font-medium">
                                  <Building className="w-3.5 h-3.5 text-[#CC0000]" />
                                  {b.empresa}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-sm font-bold border ${
                                b.estado === 'aceptado'
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                  : b.estado === 'rechazado'
                                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                                  : b.estado === 'archivado'
                                  ? 'text-[#A0A0A0] bg-white/5 border-white/10'
                                  : 'text-amber-400 bg-amber-500/15 border-amber-500/40'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  b.estado === 'aceptado' ? 'bg-emerald-400' :
                                  b.estado === 'rechazado' ? 'bg-rose-400' :
                                  b.estado === 'archivado' ? 'bg-gray-400' : 'bg-amber-400'
                                }`} />
                                {b.estado || 'pendiente'}
                              </span>
                            </div>
                          </div>

                          {/* Info Grid: Contact & Dates */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3.5 bg-black/40 border border-white/5 rounded-sm text-xs">
                            {/* Email */}
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-[#CC0000] shrink-0" />
                              <a 
                                href={`mailto:${b.email}?subject=Reserva de Modelos - Elite Model Agency`}
                                className="text-white hover:text-[#CC0000] underline-offset-2 hover:underline truncate"
                                title="Enviar email"
                              >
                                {b.email}
                              </a>
                            </div>

                            {/* Phone */}
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              {b.telefono ? (
                                <a 
                                  href={`tel:${cleanPhone}`}
                                  className="text-white hover:text-emerald-400 font-mono"
                                >
                                  {b.telefono}
                                </a>
                              ) : (
                                <span className="text-[#666] italic">Sin teléfono</span>
                              )}
                            </div>

                            {/* Event Date */}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="text-[#D0D0D0] truncate">
                                Evento: <strong className="text-white">{formattedEvent}</strong>
                              </span>
                            </div>

                            {/* Created At */}
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-[#888] shrink-0" />
                              <span className="text-[#A0A0A0] text-[11px]">
                                Recibido: {formattedCreated}
                              </span>
                            </div>
                          </div>

                          {/* Details / Message Box */}
                          {b.detalles && (
                            <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-sm">
                              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold mb-1">
                                Requerimientos / Modelos Solicitadas:
                              </p>
                              <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
                                {b.detalles}
                              </p>
                            </div>
                          )}

                          {/* Actions Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-white/5">
                            {/* Contact Action Shortcuts (Icons Only) */}
                            <div className="flex items-center gap-2">
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone.replace('+', '')}?text=Hola%20${encodeURIComponent(b.nombre)},%20te%20escribimos%20de%20Planet%20Talent%20respecto%20a%20tu%20solicitud%20de%20booking.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-sm transition-all cursor-pointer"
                                  title={`WhatsApp: ${b.telefono}`}
                                  aria-label="WhatsApp"
                                >
                                  <WhatsAppIcon className="w-4 h-4" />
                                </a>
                              )}
                              <a
                                href={`mailto:${b.email}?subject=Respuesta a tu solicitud de Booking&body=Hola ${encodeURIComponent(b.nombre)}, gracias por contactar con nuestra agencia...`}
                                className="p-2 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-sm transition-all cursor-pointer"
                                title={`Email: ${b.email}`}
                                aria-label="Email"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            </div>

                            {/* Status Change & Delete Buttons */}
                            <div className="flex flex-wrap items-center gap-2 ml-auto">
                              {b.estado !== 'aceptado' && (
                                <button
                                  onClick={() => updateBookingStatus(b.id, 'aceptado')}
                                  disabled={isUpdating}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-sm cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Aceptar</span>
                                </button>
                              )}

                              {b.estado !== 'rechazado' && (
                                <button
                                  onClick={() => updateBookingStatus(b.id, 'rechazado')}
                                  disabled={isUpdating}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-medium rounded-sm transition-all cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Rechazar</span>
                                </button>
                              )}

                              {b.estado !== 'archivado' && (
                                <button
                                  onClick={() => updateBookingStatus(b.id, 'archivado')}
                                  disabled={isUpdating}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 text-xs rounded-sm transition-all cursor-pointer"
                                  title="Archivar solicitud"
                                >
                                  <span>Archivar</span>
                                </button>
                              )}

                              <button
                                onClick={() => setBookingToDelete(b)}
                                disabled={isDeleting}
                                className="p-1.5 bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-sm transition-all cursor-pointer"
                                title="Eliminar solicitud permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        ) : (
          <>
            {/* POPULARITY STATS VIEW */}
            <div className="bg-[#0A0A0A] border border-white/5 rounded-sm p-6 sm:p-8">
              <div className="mb-6">
                <h3 className="font-serif text-2xl font-light text-white mb-2 flex items-center gap-2.5">
                  <span className="w-1 h-5 bg-[#CC0000] inline-block"></span>
                  Ranking de Popularidad
                </h3>
                <p className="text-xs text-[#8A8A8A]">
                  Análisis agregado en tiempo real de las solicitudes de booking recibidas para cada modelo.
                </p>
              </div>

              {modelPopularity.length === 0 ? (
                <div className="bg-white/[0.01] border border-white/5 rounded-sm p-12 text-center text-[#E0E0E0]">
                  <Award className="w-8 h-8 text-[#8A8A8A] mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-serif italic mb-1">No hay datos suficientes</p>
                  <p className="text-xs text-[#555]">Añade modelos y registra solicitudes de booking para ver las métricas de popularidad.</p>
                </div>
              ) : (
                <div className="space-y-10">
                  {(() => {
                    const maxRequests = Math.max(...modelPopularity.map(item => item.count), 1);
                    const top5 = modelPopularity.slice(0, 5).filter(item => item.count > 0);
                    
                    // Level distribution calculations for all models
                    const levelCounts = {
                      premium: 0,
                      macro: 0,
                      mid: 0,
                      micro: 0,
                      none: 0
                    };
                    models.forEach(m => {
                      const lvl = getModelLevel(m.instagram);
                      if (lvl === 'Influencer premium') levelCounts.premium++;
                      else if (lvl === 'Macro influencer') levelCounts.macro++;
                      else if (lvl === 'Mid Influencer') levelCounts.mid++;
                      else if (lvl === 'Micro influencer') levelCounts.micro++;
                      else levelCounts.none++;
                    });
                    const totalWithLevels = models.length;

                    return (
                      <>
                        {/* BENTO CHARTS SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          
                          {/* Top 5 Models Card */}
                          <div className="bg-[#050505] border border-white/5 rounded-sm p-5 sm:p-6 flex flex-col">
                            <div className="mb-6">
                              <h4 className="text-sm uppercase tracking-wider font-semibold text-white flex items-center gap-2">
                                <Award className="w-4 h-4 text-[#CC0000]" />
                                Top 5 Modelos Más Solicitadas
                              </h4>
                              <p className="text-[11px] text-[#8A8A8A] mt-1">Modelos con el mayor volumen de propuestas recibidas últimamente.</p>
                            </div>

                            {top5.length === 0 ? (
                              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-[#555]">
                                <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                                <span className="text-xs text-neutral-500">No hay datos de solicitudes aún</span>
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col gap-4 justify-center">
                                {top5.map((item, idx) => {
                                  const model = item.model;
                                  const firstPic = model.photos && model.photos[0] ? resolvePhoto(model.photos[0]) : null;
                                  
                                  return (
                                    <div key={model.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-sm hover:bg-white/[0.04] transition-colors">
                                      <div className="flex items-center gap-3">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                          idx === 0 ? 'bg-amber-500/20 text-amber-500' :
                                          idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                                          idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                                          'bg-white/5 text-[#8A8A8A]'
                                        }`}>
                                          {idx + 1}
                                        </span>
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5">
                                          {firstPic ? (
                                            <img src={firstPic} alt={model.nombre} loading="lazy" decoding="async" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center font-serif text-[10px] text-white/50">
                                              {model.nombre[0]}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-col">
                                          <span className="text-sm font-sans font-medium text-white truncate max-w-[120px] sm:max-w-[200px]">{model.nombre} {model.apellidos}</span>
                                          <span className="text-[10px] text-[#8A8A8A]">{model.estatura} cm • {model.ojos}</span>
                                        </div>
                                      </div>
                                      <div className="text-right flex flex-col items-end justify-center">
                                        <span className="text-base font-semibold text-white">{item.count}</span>
                                        <span className="text-[9px] uppercase tracking-wider text-[#8A8A8A]">solicitudes</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Level Distribution Card */}
                          <div className="bg-[#050505] border border-white/5 rounded-sm p-5 sm:p-6 flex flex-col justify-between">
                            <div>
                              <h4 className="text-sm uppercase tracking-wider font-semibold text-white flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-[#CC0000]" />
                                Distribución por Nivel
                              </h4>
                              <p className="text-[11px] text-[#8A8A8A] mt-1">Clasificación de modelos activas según su rango de seguidores.</p>
                            </div>

                            {/* Custom Visual Distribution Bars */}
                            <div className="space-y-4 my-6 flex-1 flex flex-col justify-center">
                              {[
                                { key: 'premium', label: 'Influencer Premium', range: '100k+', count: levelCounts.premium, color: 'from-amber-500/80 to-amber-400' },
                                { key: 'macro', label: 'Macro Influencer', range: '50k - 99.9k', count: levelCounts.macro, color: 'from-purple-500/80 to-purple-400' },
                                { key: 'mid', label: 'Mid Influencer', range: '15k - 49.9k', count: levelCounts.mid, color: 'from-cyan-500/80 to-cyan-400' },
                                { key: 'micro', label: 'Micro Influencer', range: '10k - 14.9k', count: levelCounts.micro, color: 'from-emerald-500/80 to-emerald-400' },
                                { key: 'none', label: 'Sin Nivel / Otros', range: 'Menos de 10k', count: levelCounts.none, color: 'from-neutral-700 to-neutral-600' }
                              ].map((item) => {
                                const pctOfTotal = totalWithLevels > 0 ? (item.count / totalWithLevels) * 100 : 0;
                                return (
                                  <div key={item.key} className="space-y-1 group">
                                    <div className="flex items-center justify-between text-xs">
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-white/90 group-hover:text-white transition-colors">{item.label}</span>
                                        <span className="text-[9px] text-[#8A8A8A]">{item.range}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-mono font-bold text-white">{item.count}</span>
                                        <span className="text-[10px] text-[#8A8A8A] ml-1">({Math.round(pctOfTotal)}%)</span>
                                      </div>
                                    </div>
                                    {/* Progress background bar */}
                                    <div className="h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden relative">
                                      <motion.div 
                                        className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pctOfTotal}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Summary Footer */}
                            <div className="pt-3 border-t border-white/5 text-[10px] text-[#8A8A8A] flex justify-between">
                              <span>Total de modelos catalogadas:</span>
                              <span className="text-white font-bold">{totalWithLevels}</span>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* FOOTER EN PANEL DE ADMINISTRACIÓN */}
      <footer 
        id="footer" 
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-4 pt-5 border-t border-white/10 flex flex-col items-center justify-between gap-3 sm:flex-row text-xs text-[#8A8A8A] relative z-10"
      >
        <div className="font-sans text-[10px] sm:text-xs tracking-[0.2em] uppercase text-[#8A8A8A] font-medium">
          PLANET<span className="text-[#CC0000]">TALENT</span> · PANEL DE ADMINISTRACIÓN
        </div>

        <p className="text-[10px] sm:text-xs text-white/40 tracking-wider text-center sm:text-right">
          © {new Date().getFullYear()} Planet Records. Todos los derechos reservados.
        </p>
      </footer>

      {/* COMPREHENSIVE ADD / EDIT MODAL */}
      {showModal && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) requestCloseModal(); }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
        >
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="bg-[#0A0A0A] border border-white/10 rounded-sm w-full max-w-3xl relative max-h-[95vh] overflow-y-auto shadow-[0_0_50px_rgba(204,0,0,0.15)] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/5 shrink-0">
              <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#F8F6F2] flex items-center gap-2">
                <span className="w-1 h-6 bg-[#CC0000] inline-block"></span>
                {editingId ? (
                  <>Editar Perfil de <span className="italic font-light text-[#CC0000]">Modelo</span></>
                ) : (
                  <>Añadir Nueva <span className="italic font-light text-[#CC0000]">Modelo</span></>
                )}
              </h2>
              <button
                onClick={requestCloseModal}
                className="text-[#E0E0E0] hover:text-white p-2 hover:bg-white/5 rounded-sm border border-transparent hover:border-white/10 transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <form onSubmit={handleSaveModel} className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">
              
              {/* SECTION 1: Personal Info */}
              <div>
                <h3 className="text-[10px] uppercase tracking-[0.25em] text-[#CC0000] font-bold mb-5 flex items-center gap-2">
                  <span>Información Personal</span>
                  <span className="flex-1 h-px bg-white/5"></span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Nombre <span className="text-[#CC0000]">*</span></label>
                    <input 
                      required 
                      type="text" 
                      value={formModel.nombre || ''} 
                      onChange={e => setFormModel({...formModel, nombre: e.target.value})} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Apellidos <span className="text-[#CC0000]">*</span></label>
                    <input 
                      required 
                      type="text" 
                      value={formModel.apellidos || ''} 
                      onChange={e => setFormModel({...formModel, apellidos: e.target.value})} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                  </div>
                  {(() => {
                    const parts = (formModel.instagram || '').split('|');
                    const igUser = parts[0] || '';
                    const igFollowers = parts[1] || '';
                    const cleanUser = igUser.replace('@', '');
                    
                    return (
                      <>
                        <div>
                          <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">
                            <span>Instagram</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E0E0E0] text-xs font-semibold">@</span>
                            <input 
                              type="text" 
                              value={cleanUser} 
                              onChange={e => {
                                const newUsername = e.target.value ? `@${e.target.value.replace('@', '')}` : '';
                                setFormModel({
                                  ...formModel,
                                  instagram: `${newUsername}|${igFollowers}|${parts[2] || ''}|${parts[3] || ''}|${parts[4] || ''}`
                                });
                              }}
                              placeholder="usuario"
                              className="w-full bg-black/50 border border-white/30 pl-8 pr-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all placeholder-neutral-700" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Seguidores Instagram</label>
                          <div className="relative">
                            <input 
                              value={igFollowers || ''} 
                              onChange={e => {
                                const newFollowers = e.target.value.trim();
                                setFormModel({
                                  ...formModel,
                                  instagram: `${igUser}|${newFollowers}|${parts[2] || ''}|${parts[3] || ''}|${new Date().toISOString()}`
                                });
                              }}
                              type="number" placeholder="Ej. 48200"
                              className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all placeholder-neutral-700" 
                            />
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Fecha de Nacimiento</label>
                    <input 
                      type="date" 
                      value={formModel.fecha_nacimiento || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        const age = calculateAge(val);
                        setFormModel({
                          ...formModel,
                          fecha_nacimiento: val,
                          edad: val ? age : formModel.edad
                        });
                      }} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                    {!dbHasFechaNacimiento && (
                      <span className="block text-[9px] text-[#CC0000]/80 mt-1 leading-normal font-medium">
                        * Nota: Añade la columna <code className="bg-white/5 px-1 py-0.5 rounded text-[8px]">fecha_nacimiento</code> (tipo <code className="bg-white/5 px-1 py-0.5 rounded text-[8px]">date</code>) en Supabase para guardar este dato. El cálculo de edad sí se guardará.
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Edad <span className="text-[#CC0000]">*</span></label>
                    <input 
                      required 
                      type="number" 
                      value={formModel.edad || ''} 
                      onChange={e => setFormModel({...formModel, edad: parseInt(e.target.value) || 0})} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Estatura (cm) <span className="text-[#CC0000]">*</span></label>
                    <input 
                      required 
                      type="number" 
                      value={formModel.estatura || ''} 
                      onChange={e => setFormModel({...formModel, estatura: parseInt(e.target.value) || 0})} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Color de Ojos</label>
                    <input 
                      type="text" 
                      value={formModel.ojos || ''} 
                      onChange={e => setFormModel({...formModel, ojos: e.target.value})} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Measurements & Aesthetics */}
              <div className="pt-4 border-t border-white/5">
                <h3 className="text-[10px] uppercase tracking-[0.25em] text-[#CC0000] font-bold mb-5 flex items-center gap-2">
                  <span>Medidas y Apariencia</span>
                  <span className="flex-1 h-px bg-white/5"></span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold">Busto (cm)</label>
                      <div className="relative group/tooltip flex items-center">
                        <HelpCircle className="w-3 h-3 text-[#8A8A8A] hover:text-[#CC0000] cursor-help transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#121212] border border-white/10 rounded-sm shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-200 z-50 text-[10px] text-[#E0E0E0] normal-case tracking-normal font-normal leading-relaxed">
                          <div className="font-semibold text-white mb-1 flex items-center gap-1">
                            <span className="w-1 h-2.5 bg-[#CC0000] inline-block"></span>
                            ¿Cómo medir el busto?
                          </div>
                          Mide alrededor de la parte más prominente del pecho, pasando por debajo de las axilas y manteniendo la cinta métrica horizontal sin apretar.
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#121212] border-r border-b border-white/10 rotate-45 -mt-1"></div>
                        </div>
                      </div>
                    </div>
                    <input 
                      type="number" 
                      value={formModel.busto || ''} 
                      onChange={e => setFormModel({...formModel, busto: parseInt(e.target.value) || null})} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold">Cintura (cm)</label>
                      <div className="relative group/tooltip flex items-center">
                        <HelpCircle className="w-3 h-3 text-[#8A8A8A] hover:text-[#CC0000] cursor-help transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#121212] border border-white/10 rounded-sm shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-200 z-50 text-[10px] text-[#E0E0E0] normal-case tracking-normal font-normal leading-relaxed">
                          <div className="font-semibold text-white mb-1 flex items-center gap-1">
                            <span className="w-1 h-2.5 bg-[#CC0000] inline-block"></span>
                            ¿Cómo medir la cintura?
                          </div>
                          Mide la parte más estrecha de tu torso, generalmente justo por encima del ombligo, exhalando de manera natural sin contraer el abdomen.
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#121212] border-r border-b border-white/10 rotate-45 -mt-1"></div>
                        </div>
                      </div>
                    </div>
                    <input 
                      type="number" 
                      value={formModel.cintura || ''} 
                      onChange={e => setFormModel({...formModel, cintura: parseInt(e.target.value) || null})} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold">Caderas (cm)</label>
                      <div className="relative group/tooltip flex items-center">
                        <HelpCircle className="w-3 h-3 text-[#8A8A8A] hover:text-[#CC0000] cursor-help transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-[#121212] border border-white/10 rounded-sm shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-200 z-50 text-[10px] text-[#E0E0E0] normal-case tracking-normal font-normal leading-relaxed">
                          <div className="font-semibold text-white mb-1 flex items-center gap-1">
                            <span className="w-1 h-2.5 bg-[#CC0000] inline-block"></span>
                            ¿Cómo medir las caderas?
                          </div>
                          Mide alrededor de la parte más ancha de los glúteos y las caderas, de pie con los pies juntos para obtener la máxima precisión.
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-[#121212] border-r border-b border-white/10 rotate-45 -mt-1"></div>
                        </div>
                      </div>
                    </div>
                    <input 
                      type="number" 
                      value={formModel.caderas || ''} 
                      onChange={e => setFormModel({...formModel, caderas: parseInt(e.target.value) || null})} 
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Tono de Piel</label>
                    <input 
                      type="text" 
                      value={formModel.piel || ''} 
                      onChange={e => setFormModel({...formModel, piel: e.target.value})} 
                      placeholder="Ej. Blanca, Mulata, Negra"
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all placeholder-neutral-700" 
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Calzado</label>
                    <input 
                      type="text" 
                      value={formModel.calzado || ''} 
                      onChange={e => setFormModel({...formModel, calzado: e.target.value})} 
                      placeholder="Ej. 38, 39-40"
                      className="w-full bg-black/50 border border-white/30 px-4 py-3 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none focus:ring-1 focus:ring-[#CC0000]/30 transition-all placeholder-neutral-700" 
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5">Disponible para trabajos</label>
                    <div className="flex items-center h-[46px]">
                      <button
                        type="button"
                        onClick={() => setFormModel({ ...formModel, disponible: formModel.disponible === false ? true : false })}
                        className="flex items-center gap-2.5 focus:outline-none cursor-pointer"
                      >
                        <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${formModel.disponible !== false ? 'bg-[#CC0000]' : 'bg-white/10'}`}>
                          <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${formModel.disponible !== false ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs text-[#E0E0E0] select-none font-medium">
                          {formModel.disponible !== false ? 'Disponible' : 'No disponible'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5 flex items-center gap-1.5">
                      <span>Destacada en portada</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    </label>
                    <div className="flex items-center h-[46px]">
                      <button
                        type="button"
                        onClick={() => setFormModel({ ...formModel, destacada: !formModel.destacada })}
                        className="flex items-center gap-2.5 focus:outline-none cursor-pointer"
                      >
                        <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${formModel.destacada ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/10'}`}>
                          <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${formModel.destacada ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs text-[#E0E0E0] select-none font-medium">
                          {formModel.destacada ? 'Destacada (Carrusel)' : 'Estándar'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex flex-col justify-end">
                    <label className="block text-[10px] tracking-widest uppercase text-gray-200 font-bold mb-1.5 flex items-center gap-1.5">
                      <span>Etiqueta 'NUEVA'</span>
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </label>
                    <div className="flex items-center h-[46px]">
                      <button
                        type="button"
                        onClick={() => setFormModel({ ...formModel, marcarNueva: !formModel.marcarNueva })}
                        className="flex items-center gap-2.5 focus:outline-none cursor-pointer"
                      >
                        <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${formModel.marcarNueva ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-white/10'}`}>
                          <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${formModel.marcarNueva ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs text-[#E0E0E0] select-none font-medium">
                          {formModel.marcarNueva ? 'Mostrar cinta "NUEVA"' : 'Sin cinta (Estándar)'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* SECTION 3: Photographs */}
              <div className="pt-4 border-t border-white/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-[#CC0000] font-bold flex items-center gap-2 flex-1">
                    <span>Fotografías del Book</span>
                    <span className="flex-1 h-px bg-white/5"></span>
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#8A8A8A] font-mono tracking-wider">
                      {formModel.photos?.length || 0} {formModel.photos?.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#A0A0A0] mb-3 flex items-center gap-1.5">
                  <span className="text-[#CC0000]">💡</span>
                  <span><strong>Arrastra y suelta</strong> las fotos para cambiar el orden. La primera foto (Foto 1) será la <strong>imagen principal de portada</strong>.</span>
                </p>
                
                <div className="space-y-4">
                  {/* Dropzone for File Upload & Drag-and-Drop */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingFileOverDropzone(true); }}
                    onDragLeave={() => setIsDraggingFileOverDropzone(false)}
                    onDrop={handleDropFilesOnZone}
                    className={`border border-dashed transition-all duration-300 p-6 sm:p-8 text-center rounded-sm relative backdrop-blur-md cursor-pointer ${
                      isDraggingFileOverDropzone 
                        ? 'border-[#CC0000] bg-[#CC0000]/15 scale-[1.01] shadow-[0_0_25px_rgba(204,0,0,0.3)]' 
                        : 'border-white/15 hover:border-[#CC0000]/60 bg-black/40 hover:bg-white/[0.02]'
                    }`}
                  >
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
                      disabled={isUploadingPhotos}
                      title="Seleccionar imágenes del dispositivo"
                    />
                    
                    {isUploadingPhotos ? (
                      <div className="py-2">
                        <Loader2 className="w-8 h-8 text-[#CC0000] animate-spin mx-auto mb-3" />
                        <p className="text-xs font-semibold text-white mb-1">Comprimiendo y optimizando imágenes...</p>
                        <p className="text-[10px] text-[#8A8A8A] uppercase tracking-widest">Ajustando resolución y peso automáticamente</p>
                      </div>
                    ) : (
                      <>
                        <Upload className={`w-8 h-8 mx-auto mb-3 transition-transform duration-300 ${isDraggingFileOverDropzone ? 'scale-125 text-[#CC0000]' : 'text-[#E0E0E0]'}`} />
                        <p className="text-xs font-semibold text-white mb-1">
                          {isDraggingFileOverDropzone ? '¡Suelta las imágenes aquí!' : 'Sube fotos directamente desde tu dispositivo o arrástralas aquí'}
                        </p>
                        <p className="text-[10px] text-[#8A8A8A] uppercase tracking-widest mt-1">
                          Compresión y optimización automática · Formatos JPG, PNG, WebP
                        </p>
                      </>
                    )}
                  </div>

                  {/* Toggle / Add Image URL Option */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-left text-[11px] text-[#8A8A8A] hover:text-white transition-colors flex items-center gap-1.5 w-fit"
                    >
                      <Link className="w-3.5 h-3.5 text-[#CC0000]" />
                      <span>{showUrlInput ? 'Ocultar opción de URL' : 'O añadir imagen mediante enlace web (URL)'}</span>
                    </button>

                    {showUrlInput && (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="url"
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          placeholder="https://ejemplo.com/foto-modelo.jpg"
                          className="flex-1 bg-black/50 border border-white/30 px-3 py-2 text-xs text-white rounded-sm focus:border-[#CC0000] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddPhotoUrl()}
                          className="px-4 py-2 bg-white/10 hover:bg-[#CC0000] text-white text-xs font-medium uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
                        >
                          Añadir URL
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Previews Grid with Drag & Drop Reordering */}
                  {formModel.photos && formModel.photos.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {formModel.photos.map((photo, i) => {
                          const resolved = resolvePhoto(photo);
                          const isMain = i === 0;
                          const isBeingDragged = draggedPhotoIdx === i;
                          const isDragTarget = dragOverPhotoIdx === i;

                          return (
                            <div 
                              key={i} 
                              draggable
                              onDragStart={(e) => handlePhotoDragStart(e, i)}
                              onDragOver={(e) => handlePhotoDragOver(e, i)}
                              onDrop={(e) => handlePhotoDrop(e, i)}
                              onDragEnd={handlePhotoDragEnd}
                              className={`relative aspect-[3/4] rounded-sm overflow-hidden group cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
                                isMain 
                                  ? 'border-2 border-[#CC0000] shadow-[0_0_15px_rgba(204,0,0,0.3)] ring-1 ring-[#CC0000]/50' 
                                  : 'border border-white/15 hover:border-white/40'
                              } ${
                                isBeingDragged ? 'opacity-30 border-dashed border-[#CC0000]' : ''
                              } ${
                                isDragTarget ? 'scale-105 border-2 border-[#CC0000] bg-[#CC0000]/30 shadow-[0_0_20px_rgba(204,0,0,0.5)] z-20' : ''
                              }`}
                            >
                              {resolved ? (
                                <img 
                                  loading="lazy" 
                                  decoding="async"
                                  src={resolved} 
                                  alt={`preview ${i}`} 
                                  className="w-full h-full object-cover pointer-events-none" 
                                  onError={handleImgError} 
                                />
                              ) : (
                                <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-xs text-[#E0E0E0]">No render</div>
                              )}

                              {/* Badge Principal para la primera foto */}
                              {isMain ? (
                                <div className="absolute top-1.5 left-1.5 bg-[#CC0000] text-white text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs shadow-md flex items-center gap-1 z-10">
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                  <span>Principal</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryPhoto(i)}
                                  className="absolute top-1.5 left-1.5 bg-black/80 hover:bg-[#CC0000] text-white text-[8px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 cursor-pointer"
                                  title="Establecer como foto principal de portada"
                                >
                                  <Star className="w-2.5 h-2.5" />
                                  <span>Hacer Principal</span>
                                </button>
                              )}

                              {/* Drag indicator handle */}
                              <div className="absolute top-1.5 right-8 bg-black/70 text-white p-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" title="Arrastrar para reordenar">
                                <GripVertical className="w-3.5 h-3.5 text-white/80" />
                              </div>

                              {/* Delete button */}
                              <button 
                                type="button"
                                onClick={() => removePhoto(i)}
                                className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-[#CC0000] text-white p-1 rounded-full opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-10 cursor-pointer"
                                title="Eliminar foto"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              {/* Bottom toolbar */}
                              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between z-10">
                                <span className="bg-black/85 text-[8px] font-mono px-1.5 py-0.5 rounded-sm text-[#E0E0E0] uppercase tracking-wider">
                                  #{i + 1}
                                </span>

                                <div className="flex gap-1">
                                  {i > 0 && (
                                    <button 
                                      type="button"
                                      onClick={() => movePhoto(i, 'left')}
                                      className="bg-black/80 hover:bg-[#CC0000] text-white p-1 rounded-sm opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                      title="Move, ImageOffr a la izquierda"
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                  )}
                                  {i < (formModel.photos || []).length - 1 && (
                                    <button 
                                      type="button"
                                      onClick={() => movePhoto(i, 'right')}
                                      className="bg-black/80 hover:bg-[#CC0000] text-white p-1 rounded-sm opacity-85 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                                      title="Move, ImageOffr a la derecha"
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-white/5 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={requestCloseModal}
                  className="w-full sm:w-auto text-[#E0E0E0] hover:text-white px-6 py-3 rounded-sm text-[10px] uppercase tracking-widest font-bold transition-all border border-transparent hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full sm:w-auto bg-[#CC0000] text-white px-8 py-3.5 rounded-sm text-[10px] uppercase tracking-widest font-bold hover:bg-[#CC0000]/90 transition-all hover:scale-[1.02] disabled:opacity-50 duration-300"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                    </span>
                  ) : (
                    editingId ? 'Guardar Cambios' : 'Añadir Modelo'
                  )}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* UNSAVED CHANGES WARNING MODAL */}
      <AnimatePresence>
        {showUnsavedConfirmModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0A0A0A] border border-amber-500/30 rounded-sm w-full max-w-md p-6 sm:p-8 shadow-2xl relative flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-4 text-amber-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif text-white mb-2">Cambios sin guardar</h3>
              <p className="text-xs text-[#A0A0A0] leading-relaxed mb-6">
                Tienes cambios no guardados en el formulario de la modelo. Si sales ahora, todos los cambios realizados se perderán.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setShowUnsavedConfirmModal(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white px-4 py-3 rounded-sm text-[10px] uppercase tracking-widest font-bold border border-white/10 transition-all text-center"
                >
                  Continuar editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnsavedConfirmModal(false);
                    setShowModal(false);
                  }}
                  className="w-full bg-[#CC0000] hover:bg-[#CC0000]/90 text-white px-4 py-3 rounded-sm text-[10px] uppercase tracking-widest font-bold transition-all text-center"
                >
                  Salir sin guardar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOOKING DETAILS MODAL */}
      {selectedBookingId && (
        (() => {
          const b = bookings.find(booking => booking.id === selectedBookingId);
          if (!b) return null;
          
          const dateObj = new Date(b.created_at);
          const formattedCreated = isNaN(dateObj.getTime()) ? '—' : dateObj.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const eventDateObj = new Date(b.fecha_evento);
          const formattedEvent = isNaN(eventDateObj.getTime()) ? '—' : eventDateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
              <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="bg-[#0A0A0A] border border-white/10 rounded-sm w-full max-w-2xl relative shadow-[0_0_50px_rgba(204,0,0,0.15)] flex flex-col ">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 sm:p-8 border-b border-white/5 shrink-0">
                  <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#F8F6F2] flex items-center gap-2">
                    <span className="w-1 h-6 bg-[#CC0000] inline-block"></span>
                    Detalles del <span className="italic font-light text-[#CC0000]">Booking</span>
                  </h2>
                  <button
                    onClick={() => setSelectedBookingId(null)}
                    className="text-[#E0E0E0] hover:text-white p-2 hover:bg-white/5 rounded-sm border border-transparent hover:border-white/10 transition-all duration-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                  {/* Status & Dates */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
                    <div>
                      <h4 className="text-xl text-white font-serif mb-1">{b.nombre}</h4>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#E0E0E0] font-sans">
                        <span className="text-[11px]">Registrado: {formattedCreated}</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#CC0000]" />
                          <span className="text-[11px]">Evento: {formattedEvent}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-sm border font-semibold ${
                      b.estado === 'aceptado'
                        ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5'
                        : b.estado === 'rechazado'
                        ? 'border-rose-500/20 text-rose-400 bg-rose-500/5'
                        : b.estado === 'archivado'
                        ? 'border-neutral-500/20 text-[#E0E0E0] bg-neutral-500/5'
                        : 'border-amber-500/20 text-amber-400 bg-amber-500/5'
                    }`}>
                      {b.estado || 'pendiente'}
                    </span>
                  </div>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-[#E0E0E0] font-bold">Email</p>
                      <a 
                        href={`mailto:${b.email}`}
                        className="flex items-center gap-2 text-white hover:text-[#CC0000] transition-colors text-sm"
                      >
                        <Mail className="w-4 h-4 text-[#CC0000]" />
                        <span className="truncate">{b.email}</span>
                      </a>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-[#E0E0E0] font-bold">Teléfono / WhatsApp</p>
                      {b.telefono ? (
                        <a 
                          href={`https://wa.me/${b.telefono.replace(/\s+/g, '').replace('+', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors text-sm"
                        >
                          <Phone className="w-4 h-4 text-emerald-500" />
                          <span className="truncate">{b.telefono}</span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-2 text-[#E0E0E0]/50 text-sm">
                          <Phone className="w-4 h-4 text-[#E0E0E0]" />
                          <span className="truncate">No provisto</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <p className="text-[9px] uppercase tracking-widest text-[#E0E0E0] font-bold">Empresa o Productora</p>
                      <div className="flex items-center gap-2 text-white text-sm">
                        <Building className="w-4 h-4 text-[#E0E0E0]" />
                        <span className="truncate">{b.empresa || 'Particular'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Modelos Solicitadas */}
                  {(() => {
                    const associatedModels = getModelsForBooking(b.detalles, models);
                    return (
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[9px] uppercase tracking-widest text-[#E0E0E0] font-bold mb-3 flex items-center gap-2">
                          <span>Modelos Solicitadas ({associatedModels.length})</span>
                          <span className="flex-1 h-px bg-white/5"></span>
                        </p>
                        {associatedModels.length === 0 ? (
                          <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-sm text-xs text-[#8A8A8A] italic">
                            No se detectaron modelos específicas en el texto del requerimiento.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {associatedModels.map((am) => {
                              const firstPic = am.photos && am.photos[0] ? resolvePhoto(am.photos[0]) : null;
                              const [igUser] = (am.instagram || '').split('|');
                              return (
                                <div
                                  key={am.id}
                                  onClick={() => {
                                    setPreviewModel(am);
                                    setActivePhotoIdx(0);
                                  }}
                                  className="flex items-center gap-3 bg-white/[0.02] border border-white/5 hover:border-[#CC0000]/40 p-3 rounded-sm cursor-pointer transition-all duration-300 group"
                                  title="Haga clic para ver ficha técnica de la modelo"
                                >
                                  <div className="w-10 h-12 bg-white/5 rounded-sm overflow-hidden shrink-0 border border-white/5">
                                    {firstPic ? (
                                      <img
                                        src={firstPic}
                                        alt={am.nombre}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" onError={handleImgError} />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center font-serif text-xs text-white/10 bg-white/5">
                                        {am.nombre[0]}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-serif text-xs font-light text-[#F8F6F2] truncate group-hover:text-[#CC0000] transition-colors leading-tight">
                                      {am.nombre} <span className="italic font-normal">{am.apellidos}</span>
                                    </h5>
                                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[8px] text-[#8A8A8A] uppercase tracking-wider mt-0.5 leading-none">
                                      <span>{am.estatura} cm</span>
                                      <span className="text-[#CC0000]/40">•</span>
                                      <span>{am.piel}</span>
                                      {igUser && (
                                        <>
                                          <span className="text-[#CC0000]/40">•</span>
                                          <span className="text-white/60 lowercase truncate max-w-[80px]">{igUser}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Message/Details */}
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-[#E0E0E0] font-bold mb-2">Detalles del Requerimiento</p>
                    <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-sm text-sm text-[#F8F6F2]/90 leading-relaxed whitespace-pre-line font-sans">
                      {b.detalles}
                    </div>
                  </div>
                </div>

                {/* Admin Action Bar */}
                <div className="p-6 sm:p-8 border-t border-white/5 flex flex-wrap items-center justify-end gap-3 bg-white/[0.02]">
                  <div className="flex flex-wrap items-center gap-2 bg-[#0A0A0A] p-1.5 rounded-sm border border-white/5">
                    {b.estado === 'pendiente' && (
                      <>
                        <button
                          disabled={updatingBookingId === b.id || isDeleting}
                          onClick={() => updateBookingStatus(b.id, 'aceptado')}
                          className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-sm bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-500/20 text-emerald-400 text-[10px] uppercase tracking-wider font-bold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {updatingBookingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Aceptar
                        </button>
                        <button
                          disabled={updatingBookingId === b.id || isDeleting}
                          onClick={() => updateBookingStatus(b.id, 'rechazado')}
                          className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-sm bg-rose-500/10 border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/20 text-rose-400 text-[10px] uppercase tracking-wider font-bold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {updatingBookingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          Rechazar
                        </button>
                      </>
                    )}
                    {b.estado !== 'archivado' && (
                      <button
                        disabled={updatingBookingId === b.id || isDeleting}
                        onClick={() => updateBookingStatus(b.id, 'archivado')}
                        className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-sm bg-white/5 border border-white/10 hover:border-white/30 text-[#E0E0E0] hover:text-white text-[10px] uppercase tracking-wider font-bold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {updatingBookingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                        Archivar
                      </button>
                    )}
                    <button
                      disabled={updatingBookingId === b.id || isDeleting}
                      onClick={() => { setBookingToDelete(b); setSelectedBookingId(null); }}
                      className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-sm bg-[#CC0000]/10 border border-[#CC0000]/20 hover:border-[#CC0000] hover:bg-[#CC0000]/20 text-[#CC0000] text-[10px] uppercase tracking-wider font-bold transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()
      )}

      {/* CONFIRM DELETE BOOKING MODAL */}
      <AnimatePresence>
        {bookingToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="bg-[#0A0A0A] border border-white/10 rounded-sm w-full max-w-md relative p-6 sm:p-8 shadow-[0_0_50px_rgba(204,0,0,0.2)]  flex flex-col">
              <button
                onClick={() => setBookingToDelete(null)}
                className="absolute top-4 right-4 text-[#E0E0E0] hover:text-white p-2 hover:bg-white/5 rounded-sm transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 rounded-full bg-[#CC0000]/10 flex items-center justify-center border border-[#CC0000]/20 mb-4">
                  <Trash2 className="w-6 h-6 text-[#CC0000]" />
                </div>
                
                <h3 className="text-xl font-serif text-white mb-2">Eliminar Solicitud</h3>
                <p className="text-xs text-[#E0E0E0] leading-relaxed mb-6">
                  ¿Seguro que deseas eliminar esta solicitud de booking permanentemente?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setBookingToDelete(null)}
                  className="w-full text-[#E0E0E0] hover:text-white px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest font-bold transition-all border border-white/5 hover:bg-white/5 text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  disabled={isDeleting}
                  onClick={() => deleteBooking(bookingToDelete.id)}
                  className="w-full bg-[#CC0000] hover:bg-[#CC0000]/90 text-white px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest font-bold transition-all hover:scale-[1.02] duration-300 text-center flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {modelToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="bg-[#0A0A0A] border border-white/10 rounded-sm w-full max-w-md relative p-6 sm:p-8 shadow-[0_0_50px_rgba(204,0,0,0.2)]  flex flex-col">
              <button
                onClick={() => setModelToDelete(null)}
                className="absolute top-4 right-4 text-[#E0E0E0] hover:text-white p-2 hover:bg-white/5 rounded-sm transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 rounded-full bg-[#CC0000]/10 flex items-center justify-center border border-[#CC0000]/20 mb-4">
                  <Trash2 className="w-6 h-6 text-[#CC0000]" />
                </div>
                
                <h3 className="text-xl font-serif text-white mb-2">Eliminar Modelo</h3>
                <p className="text-xs text-[#E0E0E0] leading-relaxed mb-6">
                  ¿Seguro que deseas eliminar a <span className="font-bold text-white">{modelToDelete.nombre} {modelToDelete.apellidos}</span>? Esta acción no se puede deshacer y se eliminarán todos sus datos y fotografías.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setModelToDelete(null)}
                  className="w-full text-[#E0E0E0] hover:text-white px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest font-bold transition-all border border-white/5 hover:bg-white/5 text-center"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(modelToDelete.id)}
                  className="w-full bg-[#CC0000] hover:bg-[#CC0000]/90 text-white px-4 py-2.5 rounded-sm text-[10px] uppercase tracking-widest font-bold transition-all hover:scale-[1.02] duration-300 text-center flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
            </AnimatePresence>

      {/* PREVIEW MODEL MODAL */}
      <AnimatePresence>
        {previewModel && (
          <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-[#0A0A0A]/95 backdrop-blur-md animate-in fade-in duration-300">
            {/* Modal Header (Mobile Only) */}
            <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 shrink-0 bg-black/50">
              <h3 className="text-[#E0E0E0] text-[10px] uppercase tracking-widest font-bold">Vista Previa</h3>
              <button 
                onClick={() => setPreviewModel(null)}
                className="text-[#E0E0E0] hover:text-white p-2 hover:bg-white/5 rounded-sm transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Left/Top: Image Gallery */}
            <div className="w-full md:w-1/2 lg:w-[55%] h-[40vh] md:h-full relative bg-black shrink-0">
              {previewModel.photos && previewModel.photos.length > 0 ? (
                <>
                  <div 
                    className="w-full h-full cursor-zoom-in"
                    onClick={() => setShowLightbox(true)}
                  >
                    <img 
                      src={resolvePhoto(previewModel.photos[activePhotoIdx])}
                      alt={`${previewModel.nombre} ${previewModel.apellidos}`}
                      loading="eager"
                      decoding="async"
                      className="w-full h-full object-cover animate-in fade-in duration-500"
                      key={activePhotoIdx}
                    />
                  </div>
                  {previewModel.photos.length > 1 && (
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-8 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center gap-4">
                      <div className="flex gap-2">
                        {previewModel.photos.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(idx); }}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === activePhotoIdx ? "bg-[#CC0000] w-6" : "bg-white/50 hover:bg-white/80"}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(prev => prev > 0 ? prev - 1 : previewModel.photos.length - 1); }}
                          className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-[#CC0000] hover:border-[#CC0000] transition-colors backdrop-blur-md"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActivePhotoIdx(prev => prev < previewModel.photos.length - 1 ? prev + 1 : 0); }}
                          className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-[#CC0000] hover:border-[#CC0000] transition-colors backdrop-blur-md"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#555] bg-[#111]">
                  <ImageOff className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-xs uppercase tracking-widest">Sin fotos disponibles</p>
                </div>
              )}
            </div>

            {/* Right/Bottom: Model Info */}
            <div className="w-full md:w-1/2 lg:w-[45%] h-[60vh] md:h-full flex flex-col relative">
              <button 
                onClick={() => setPreviewModel(null)}
                className="hidden md:flex absolute top-6 right-6 z-10 w-10 h-10 items-center justify-center text-[#E0E0E0] bg-black/50 hover:bg-[#CC0000] hover:text-white border border-white/10 rounded-full transition-all backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 lg:p-16">
                <div className="max-w-xl mx-auto">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-2 tracking-wide uppercase leading-none">
                    {previewModel.nombre}
                  </h2>
                  <h3 className="text-2xl md:text-3xl font-serif text-[#E0E0E0] mb-6 tracking-widest uppercase">
                    {previewModel.apellidos}
                  </h3>

                  {(() => {
                    const [igUser] = (previewModel.instagram || "").split("|");
                    if (!igUser) return null;
                    return (
                      <a 
                        href={`https://instagram.com/${igUser.replace("@","")}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs text-[#CC0000] hover:text-[#CC0000]/80 tracking-wider font-semibold transition-colors mb-4"
                      >
                        <Instagram className="w-4 h-4" />
                        {igUser}
                      </a>
                    );
                  })()}

                  <div className="flex flex-wrap items-center gap-2 mb-6">
                    {isModelNew(previewModel) && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#181204]/90 border border-amber-500/50 text-amber-300 backdrop-blur-sm text-[10px] sm:text-xs tracking-wider uppercase font-semibold shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Nueva</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/30 backdrop-blur-sm text-[10px] sm:text-xs tracking-wider uppercase font-semibold">
                      <span className={`w-2 h-2 rounded-full ${previewModel.disponible !== false ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-gray-400"}`} />
                      <span className={previewModel.disponible !== false ? "text-emerald-400" : "text-gray-400"}>
                        {previewModel.disponible !== false ? "Disponible para trabajos" : "No disponible"}
                      </span>
                    </div>
                    {(() => {
                      const level = getModelLevel(previewModel.instagram);
                      if (!level) return null;
                      return <ModelLevelBadge level={level} size="sm" />;
                    })()}
                  </div>

                  <div className="w-12 h-[1.5px] bg-[#CC0000] mb-6"></div>

                  {/* Editorial Blockquote */}
                  <div className="relative pl-6 py-1 mb-8 border-l-2 border-[#CC0000]/60 select-none">
                    <span className="absolute left-1 top-0 text-3xl font-serif text-[#CC0000]/40 leading-none">“</span>
                    <p className="font-serif italic text-white/80 text-sm leading-relaxed tracking-wide font-light">
                      {getModelBio(previewModel, 'es').quote}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8">
                    {(() => {
                      const calculatedAge = calculateAge(previewModel.fecha_nacimiento);
                      const finalAge = calculatedAge !== null ? calculatedAge : previewModel.edad;
                      const parts = (previewModel.instagram || "").split("|");
                      const igFollowers = parts[1];
                      const updatedAt = parts[4];
                      
                      const specs = [
                        ["Edad", `${finalAge} años`],
                        ...(previewModel.fecha_nacimiento ? [["Nacimiento", formatDate(previewModel.fecha_nacimiento, "es")]] : []),
                        ["Piel", previewModel.piel],
                        ["Ojos", previewModel.ojos],
                        ["Estatura", `${previewModel.estatura} cm`],
                        ["Busto", previewModel.busto ? `${previewModel.busto} cm` : "—"],
                        ["Cintura", previewModel.cintura ? `${previewModel.cintura} cm` : "—"],
                        ["Caderas", previewModel.caderas ? `${previewModel.caderas} cm` : "—"],
                        ["Calzado", `${previewModel.calzado}`],
                      ];

                      if (igFollowers) {
                        specs.push(["Seguidores IG", formatFollowersDisplay(previewModel.instagram)]);
                      }
                      
                      const level = getModelLevel(previewModel.instagram);
                      if (level) {
                        specs.push(["Nivel de la Modelo", level]);
                      }
                      
                      return specs.map(([label, val]) => (
                        <div key={label} className="border-b border-white/5 py-3 flex flex-col gap-1">
                          <span className="text-[9px] tracking-widest uppercase text-[#8A8A8A] font-bold">{label}</span>
                          {label === "Nivel de la Modelo" ? (
                            <div className="mt-0.5">
                              <ModelLevelBadge level={val} size="xs" />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="text-sm text-white font-medium">{val}</span>
                              {label === "Seguidores IG" && (
                                <span className="text-[9px] text-[#888] italic mt-0.5">
                                  {formatUpdatedAgo(updatedAt, "es")}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* DETALLE COMPLETO DE BOOKING MODAL */}
      <AnimatePresence>
        {selectedBookingId !== null && (() => {
          const b = bookings.find(item => item.id === selectedBookingId);
          if (!b) return null;

          const dateObj = new Date(b.created_at);
          const formattedCreated = isNaN(dateObj.getTime()) ? '—' : dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          const eventDateObj = new Date(b.fecha_evento);
          const formattedEvent = isNaN(eventDateObj.getTime()) ? '—' : eventDateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });

          const matchedModels = getModelsForBooking(b.detalles, models);
          const cleanPhone = b.telefono ? b.telefono.replace(/[^0-9+]/g, '') : '';
          const isUpdating = updatingBookingId === b.id;

          return (
            <div
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedBookingId(null); }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-[#0A0A0A] border border-white/10 rounded-sm w-full max-w-2xl relative max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 shrink-0 bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-[#8B1A1A] inline-block rounded-sm"></span>
                    <div>
                      <h2 className="text-lg sm:text-xl font-serif text-white flex items-center gap-2">
                        Solicitud de Booking #{b.id}
                      </h2>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm font-semibold border mt-1 ${
                        b.estado === 'aceptado'
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : b.estado === 'rechazado'
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                          : b.estado === 'archivado'
                          ? 'text-neutral-400 bg-white/5 border-white/10'
                          : 'text-amber-400 bg-amber-500/15 border-amber-500/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          b.estado === 'aceptado' ? 'bg-emerald-400' :
                          b.estado === 'rechazado' ? 'bg-rose-400' :
                          b.estado === 'archivado' ? 'bg-gray-400' : 'bg-amber-400'
                        }`} />
                        {b.estado || 'pendiente'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBookingId(null)}
                    className="text-[#A0A0A0] hover:text-white p-2 hover:bg-white/5 rounded-sm transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 space-y-5 text-xs text-[#E0E0E0] overflow-y-auto">
                  {/* Client & Company */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.02] p-4 border border-white/5 rounded-sm">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#8A8A8A] font-bold block mb-1">
                        Cliente / Solicitante
                      </span>
                      <p className="text-sm font-semibold text-white">{b.nombre}</p>
                      {b.empresa && (
                        <p className="text-xs text-[#A0A0A0] mt-0.5 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-[#8A8A8A]" />
                          {b.empresa}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#8A8A8A] font-bold block mb-1">
                        Contacto Directo
                      </span>
                      <div className="flex flex-col gap-1.5">
                        <a
                          href={`mailto:${b.email}?subject=Respuesta a tu solicitud de Booking&body=Hola ${encodeURIComponent(b.nombre)}, gracias por contactar con Planet Talent...`}
                          className="text-xs text-white/90 hover:text-white flex items-center gap-2 hover:underline"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#8A8A8A]" />
                          <span>{b.email}</span>
                        </a>
                        {b.telefono && (
                          <a
                            href={`https://wa.me/${cleanPhone.replace('+', '')}?text=Hola%20${encodeURIComponent(b.nombre)},%20te%20escribimos%20de%20Planet%20Talent%20respecto%20a%20tu%20solicitud%20de%20booking.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-2 hover:underline"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                            <span>{b.telefono}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event & Received Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-white/5 p-3 rounded-sm">
                      <span className="text-[10px] uppercase tracking-widest text-[#8A8A8A] font-bold block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#8B1A1A]" />
                        Fecha del Evento
                      </span>
                      <p className="text-xs font-medium text-white capitalize">{formattedEvent}</p>
                    </div>
                    <div className="border border-white/5 p-3 rounded-sm">
                      <span className="text-[10px] uppercase tracking-widest text-[#8A8A8A] font-bold block mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#8A8A8A]" />
                        Solicitud Recibida
                      </span>
                      <p className="text-xs text-[#A0A0A0] capitalize">{formattedCreated}</p>
                    </div>
                  </div>

                  {/* Matched Models */}
                  {matchedModels.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#8A8A8A] font-bold block mb-2">
                        Modelos de Interés ({matchedModels.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {matchedModels.map(m => (
                          <div key={m.id} className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-sm">
                            <img
                              src={resolvePhoto((m.photos || [])[0])}
                              alt={m.nombre}
                              loading="lazy"
                              decoding="async"
                              className="w-6 h-6 rounded-full object-cover border border-white/20"
                            />
                            <span className="text-xs font-medium text-white">{m.nombre} {m.apellidos}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Details / Message */}
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#8A8A8A] font-bold block mb-1.5">
                      Detalles y Requerimientos de la Solicitud
                    </span>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-sm font-sans text-xs text-[#E0E0E0] whitespace-pre-wrap leading-relaxed">
                      {b.detalles || 'Sin detalles adicionales.'}
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.01] flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone.replace('+', '')}?text=Hola%20${encodeURIComponent(b.nombre)},%20te%20escribimos%20de%20Planet%20Talent%20respecto%20a%20tu%20solicitud%20de%20booking.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-sm text-xs font-semibold cursor-pointer"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <a
                      href={`mailto:${b.email}?subject=Respuesta a tu solicitud de Booking&body=Hola ${encodeURIComponent(b.nombre)}, gracias por contactar con nuestra agencia...`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-sm text-xs font-semibold cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {b.estado !== 'aceptado' && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'aceptado')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-all shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aceptar</span>
                      </button>
                    )}
                    {b.estado !== 'rechazado' && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'rechazado')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs font-medium rounded-sm transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    )}
                    {b.estado !== 'archivado' && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'archivado')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/10 text-xs rounded-sm transition-all cursor-pointer"
                      >
                        <span>Archivar</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedBookingId(null);
                        setBookingToDelete(b);
                      }}
                      className="p-1.5 bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-sm transition-all cursor-pointer"
                      title="Eliminar solicitud"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* LIGHTBOX DE IMAGEN */}
      <AnimatePresence>
        {showLightbox && previewModel && previewModel.photos && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-4 md:p-8 cursor-zoom-out"
            onClick={() => setShowLightbox(false)}
          >
            <button 
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[90] text-[#8A8A8A] hover:text-[#F8F6F2] text-2xl transition-all w-12 h-12 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-lg active:scale-95"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Prev Button */}
            {previewModel.photos.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : (previewModel.photos || []).length - 1));
                }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-[90] text-[#8A8A8A] hover:text-[#F8F6F2] text-2xl transition-all w-12 h-12 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-lg active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <motion.img
              key={activePhotoIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={resolvePhoto((previewModel.photos || [])[activePhotoIdx])}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain rounded-sm shadow-2xl cursor-default"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Next Button */}
            {(previewModel.photos || []).length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev < (previewModel.photos || []).length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[90] text-[#8A8A8A] hover:text-[#F8F6F2] text-2xl transition-all w-12 h-12 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-lg active:scale-95"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bidirectional Floating Scroll Button (matches catalog behavior) */}
      <AnimatePresence>
        {showFloatingScrollBtn && !showModal && !previewModel && !showLightbox && selectedBookingId === null && !bookingToDelete && !modelToDelete && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 15 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => {
              if (scrollDirectionUp) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                const scrollStep = Math.max(350, (window.innerHeight || 800) * 0.75);
                window.scrollBy({ top: scrollStep, behavior: 'smooth' });
              }
            }}
            title={scrollDirectionUp ? 'Volver arriba' : 'Seguir bajando'}
            className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[60] bg-black/45 hover:bg-black/70 backdrop-blur-md px-3.5 py-2 md:px-4 md:py-2.5 rounded-full border transition-all duration-300 shadow-xl flex items-center justify-center cursor-pointer group active:scale-95 ${
              isNearBottom 
                ? 'border-[#CC0000] shadow-[0_0_15px_rgba(204,0,0,0.3)] animate-gentle-pulse' 
                : 'border-white/15 hover:border-[#CC0000]/60 hover:-translate-y-0.5'
            }`}
            aria-label={scrollDirectionUp ? 'Volver arriba' : 'Seguir bajando'}
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
