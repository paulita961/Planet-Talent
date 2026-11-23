/**
 * High-Performance Image Optimization & Compression Utility
 * 
 * 1. Automatic WebP Conversion & Compression on upload with smart dimension bounding.
 * 2. In-Memory & IndexedDB Cache for seamless background optimization of existing DB images.
 * 3. URL Parameter Optimization for CDN/Unsplash/External images.
 * 4. Non-blocking Background Batch Optimizer for Supabase models.
 */

import { supabase } from './supabase';
import { Model } from '../types';

// In-memory cache for dynamically optimized base64 data URLs
const memoryOptimizedCache = new Map<string, string>();
const memoryThumbnailCache = new Map<string, string>();

/**
 * Check if the browser supports canvas export to WebP
 */
let isWebPSupportedCache: boolean | null = null;
export const isWebPSupported = (): boolean => {
  if (isWebPSupportedCache !== null) return isWebPSupportedCache;
  try {
    const elem = document.createElement('canvas');
    if (!!(elem.getContext && elem.getContext('2d'))) {
      isWebPSupportedCache = elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } else {
      isWebPSupportedCache = false;
    }
  } catch (e) {
    isWebPSupportedCache = false;
  }
  return isWebPSupportedCache;
};

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg';
}

/**
 * Compress a File or Data URL into an optimized WebP Blob for storage upload
 */
export const compressToWebPBlob = async (
  input: File | string,
  options: CompressionOptions = {}
): Promise<Blob> => {
  const {
    maxWidth = 1200,
    maxHeight = 1600,
    quality = 0.82,
    format = isWebPSupported() ? 'image/webp' : 'image/jpeg'
  } = options;

  let src = '';
  if (typeof input !== 'string') {
    src = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(input);
    });
  } else {
    src = input;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          fetch(src).then(res => res.blob()).then(resolve).catch(reject);
          return;
        }

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error("Canvas context error");
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const targetFormat = format === 'image/webp' && isWebPSupported() ? 'image/webp' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Falló la creación del Blob"));
            }
          },
          targetFormat,
          quality
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

/**
 * Compress and convert a File into an optimized WebP Base64 data URL
 */
export const compressImageFile = async (
  file: File,
  options: CompressionOptions = {}
): Promise<string> => {
  const {
    maxWidth = 1200,
    maxHeight = 1600,
    quality = 0.80,
    format = isWebPSupported() ? 'image/webp' : 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) {
        reject(new Error("No se pudo leer el archivo de imagen"));
        return;
      }
      compressDataUrl(src, { maxWidth, maxHeight, quality, format })
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Compress an existing Data URL (base64) or Image URL to optimized WebP
 */
export const compressDataUrl = async (
  src: string,
  options: CompressionOptions = {}
): Promise<string> => {
  const {
    maxWidth = 1200,
    maxHeight = 1600,
    quality = 0.80,
    format = isWebPSupported() ? 'image/webp' : 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    // Enable crossOrigin for external URLs if possible
    if (src.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(src);
          return;
        }

        // Calculate aspect-ratio preserving dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP or JPEG
        const targetFormat = format === 'image/webp' && isWebPSupported() ? 'image/webp' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(targetFormat, quality);
        
        // Cache result
        memoryOptimizedCache.set(src, compressedBase64);
        resolve(compressedBase64);
      } catch (err) {
        console.warn("Fallo en compresión de canvas, retornando original:", err);
        resolve(src);
      }
    };

    img.onerror = () => {
      // If crossOrigin fails or image cannot be loaded into canvas, fallback gracefully to original src
      resolve(src);
    };

    img.src = src;
  });
};



/**
 * Optimizes external URLs (e.g. Unsplash, Supabase, Cloudinary) with WebP and auto-formatting
 */
export const optimizeExternalUrl = (url: string, type: 'full' | 'thumb' = 'full'): string => {
  if (!url || typeof url !== 'string') return url;

  // Unsplash URLs
  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      const targetW = type === 'thumb' ? '600' : '900';
      const targetQ = type === 'thumb' ? '75' : '80';
      parsed.searchParams.set('w', targetW);
      parsed.searchParams.set('q', targetQ);
      if (isWebPSupported() && !parsed.searchParams.has('fm')) {
        parsed.searchParams.set('fm', 'webp');
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
};

/**
 * Returns an optimized photo string (WebP/optimized URL/cached WebP Base64).
 * Supports 'full' or lightweight 'thumb' (~600px).
 */
export const getOptimizedPhotoUrl = (rawPhoto: string | undefined | null, type: 'full' | 'thumb' = 'full'): string | undefined => {
  if (!rawPhoto) return undefined;

  const targetCache = type === 'thumb' ? memoryThumbnailCache : memoryOptimizedCache;

  // 1. If it's already in the target cache, return immediately
  if (targetCache.has(rawPhoto)) {
    return targetCache.get(rawPhoto);
  }

  // 2. If it's an external HTTP/HTTPS URL, optimize parameters
  if (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://')) {
    const optimized = optimizeExternalUrl(rawPhoto, type);
    targetCache.set(rawPhoto, optimized);
    return optimized;
  }

  // 3. If it's a local static asset (e.g. /photo_xxx.jpg)
  if (rawPhoto.startsWith('/')) {
    return rawPhoto;
  }

  // 4. If it's a Base64 data URL
  if (rawPhoto.startsWith('data:')) {
    if (type === 'thumb') {
      // Schedule background thumbnail WebP compression (~600px)
      compressDataUrl(rawPhoto, { maxWidth: 600, maxHeight: 800, quality: 0.75 })
        .then(thumb => {
          if (thumb && thumb.length < rawPhoto.length) {
            memoryThumbnailCache.set(rawPhoto, thumb);
          }
        })
        .catch(() => {});

      return rawPhoto;
    }

    // If it's already lightweight WebP or small size (< 60KB), no need to compress further
    if (rawPhoto.startsWith('data:image/webp') || rawPhoto.length < 60000) {
      return rawPhoto;
    }

    // Schedule background WebP compression non-blockingly for existing uncompressed DB photos
    compressDataUrl(rawPhoto, { maxWidth: 1000, maxHeight: 1400, quality: 0.80 })
      .then(optimized => {
        if (optimized && optimized.length < rawPhoto.length) {
          memoryOptimizedCache.set(rawPhoto, optimized);
        }
      })
      .catch(() => {});

    return rawPhoto;
  }

  return rawPhoto;
};

export const getThumbnailPhotoUrl = (rawPhoto: string | undefined | null): string | undefined => {
  return getOptimizedPhotoUrl(rawPhoto, 'thumb');
};

/**
 * Check if a photo needs WebP optimization (e.g., PNG base64, large JPEG base64, etc.)
 */
export const doesPhotoNeedOptimization = (photoStr: string | undefined | null): boolean => {
  if (!photoStr) return false;
  if (photoStr.startsWith('data:image/png')) return true;
  if (photoStr.startsWith('data:image/jpeg') && photoStr.length > 180000) return true;
  if (photoStr.startsWith('data:image/jpg') && photoStr.length > 180000) return true;
  return false;
};

/**
 * Optimizes all photos of a given model to lightweight WebP Base64 strings.
 * Returns true if any photo was modified/optimized.
 */
export const optimizePhotoArray = async (photos: string[]): Promise<string[]> => {
  if (!photos || photos.length === 0) return [];
  const optimized: string[] = [];
  for (const photo of photos) {
    if (doesPhotoNeedOptimization(photo)) {
      try {
        const compressed = await compressDataUrl(photo, { maxWidth: 1200, maxHeight: 1600, quality: 0.80 });
        if (compressed && compressed.length < photo.length) {
          optimized.push(compressed);
          continue;
        }
      } catch (e) {
        console.warn('Error optimizando foto:', e);
      }
    }
    optimized.push(photo);
  }
  return optimized;
};

export const optimizeModelPhotos = async (model: Model): Promise<{ optimizedModel: Model; hasChanges: boolean }> => {
  if (!model.photos || model.photos.length === 0) {
    return { optimizedModel: model, hasChanges: false };
  }

  let hasChanges = false;
  const newPhotos: string[] = [];

  for (const photo of model.photos) {
    if (doesPhotoNeedOptimization(photo)) {
      try {
        const compressed = await compressDataUrl(photo, { maxWidth: 1100, maxHeight: 1500, quality: 0.80 });
        if (compressed && compressed.length < photo.length) {
          newPhotos.push(compressed);
          hasChanges = true;
          continue;
        }
      } catch (e) {
        console.warn(`Error optimizando foto de ${model.nombre}:`, e);
      }
    }
    newPhotos.push(photo);
  }

  return {
    optimizedModel: {
      ...model,
      photos: newPhotos
    },
    hasChanges
  };
};

/**
 * Background Bulk Optimizer for all models in Supabase.
 * Scans all models and updates uncompressed heavy photos to lightweight WebP in Supabase.
 */
export const bulkOptimizeSupabaseModels = async (
  models: Model[],
  onProgress?: (current: number, total: number, optimizedCount: number) => void
): Promise<{ totalProcessed: number; totalOptimized: number }> => {
  let totalOptimized = 0;
  const total = models.length;

  for (let i = 0; i < total; i++) {
    const m = models[i];
    const { optimizedModel, hasChanges } = await optimizeModelPhotos(m);

    if (hasChanges) {
      try {
        await supabase
          .from('models')
          .update({ photos: optimizedModel.photos })
          .eq('id', m.id);
        totalOptimized++;
      } catch (err) {
        console.error(`Error guardando fotos optimizadas de ${m.nombre} en Supabase:`, err);
      }
    }

    if (onProgress) {
      onProgress(i + 1, total, totalOptimized);
    }
  }

  return {
    totalProcessed: total,
    totalOptimized
  };
};
