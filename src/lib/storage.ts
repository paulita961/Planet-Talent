import { supabase } from './supabase';
import { compressToWebPBlob, isWebPSupported } from './imageOptimizer';
import { Model } from '../types';

export const BUCKET_NAME = 'model-photos';

/**
 * Ensures the Supabase Storage bucket exists and is configured as public.
 */
export const ensureStorageBucket = async (): Promise<boolean> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (!error && buckets) {
      const exists = buckets.some(b => b.name === BUCKET_NAME);
      if (exists) return true;
    }
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png', 'image/gif']
    });
    if (!createError) return true;
  } catch (e) {
    console.warn("Notice: Storage bucket check:", e);
  }
  return true;
};

/**
 * Uploads an image (File or base64 data URL) to Supabase Storage after compressing to WebP format.
 * Returns the direct public URL of the stored file.
 */
export const uploadImageToSupabaseStorage = async (
  input: File | string,
  folderName: string = 'models'
): Promise<string> => {
  try {
    // If it's already an HTTP or HTTPS public URL, return directly
    if (typeof input === 'string' && (input.startsWith('http://') || input.startsWith('https://'))) {
      return input;
    }

    // Convert input to WebP Blob
    const webpBlob = await compressToWebPBlob(input, {
      maxWidth: 1200,
      maxHeight: 1600,
      quality: 0.82
    });

    const fileExt = isWebPSupported() ? 'webp' : 'jpg';
    const fileName = `${folderName}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // Upload blob to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, webpBlob, {
        contentType: isWebPSupported() ? 'image/webp' : 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.warn("Upload to Supabase Storage error:", uploadError);
      // Fallback: If Storage upload fails, fallback gracefully to base64 if available
      if (typeof input === 'string' && input.startsWith('data:')) {
        return input;
      }
      throw uploadError;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    if (publicUrlData && publicUrlData.publicUrl) {
      return publicUrlData.publicUrl;
    } else {
      throw new Error("No se pudo obtener la URL pública de la imagen en Supabase Storage");
    }
  } catch (err) {
    console.error("Error al subir a Supabase Storage:", err);
    if (typeof input === 'string') {
      return input;
    }
    throw err;
  }
};

/**
 * Migrates all Base64 photos in the database models table to Supabase Storage.
 * Replaces Base64 strings with direct public Storage URLs in the models' photos column.
 */
export const migrateAllBase64PhotosToStorage = async (
  models: Model[],
  onProgress?: (processed: number, total: number, currentModel: string, migratedCount: number) => void
): Promise<{ totalProcessed: number; totalModelsMigrated: number; totalPhotosMigrated: number }> => {
  await ensureStorageBucket();

  let totalModelsMigrated = 0;
  let totalPhotosMigrated = 0;
  const totalModels = models.length;

  for (let i = 0; i < totalModels; i++) {
    const model = models[i];
    const photos = model.photos || [];
    let hasChanges = false;
    const updatedPhotos: string[] = [];

    for (const photo of photos) {
      if (typeof photo === 'string' && (photo.startsWith('data:') || (!photo.startsWith('http://') && !photo.startsWith('https://') && !photo.startsWith('/')))) {
        try {
          const publicStorageUrl = await uploadImageToSupabaseStorage(photo, `models/${model.id || 'new'}`);
          if (publicStorageUrl && publicStorageUrl.startsWith('http')) {
            updatedPhotos.push(publicStorageUrl);
            hasChanges = true;
            totalPhotosMigrated++;
          } else {
            updatedPhotos.push(photo);
          }
        } catch (e) {
          console.warn(`Error migrando foto de ${model.nombre}:`, e);
          updatedPhotos.push(photo);
        }
      } else {
        updatedPhotos.push(photo);
      }
    }

    if (hasChanges) {
      try {
        const { error } = await supabase
          .from('models')
          .update({ photos: updatedPhotos })
          .eq('id', model.id);

        if (!error) {
          totalModelsMigrated++;
        } else {
          console.error(`Error actualizando modelo en BD para ${model.nombre}:`, error);
        }
      } catch (dbErr) {
        console.error(`Error de base de datos para ${model.nombre}:`, dbErr);
      }
    }

    if (onProgress) {
      onProgress(i + 1, totalModels, `${model.nombre} ${model.apellidos}`, totalPhotosMigrated);
    }
  }

  return {
    totalProcessed: totalModels,
    totalModelsMigrated,
    totalPhotosMigrated
  };
};
