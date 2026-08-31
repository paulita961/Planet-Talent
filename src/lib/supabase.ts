import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Caché global en memoria
let memoryModelsCache: any[] | null = null;
let memoryBookingsCache: any[] | null = null;

/**
 * Helper to run queries with an automatic exponential retry policy for maximum robustness on transient connection drops or cold starts.
 */
const runWithRetry = async (
  queryFn: () => PromiseLike<{ data: any[] | null; error: any }>,
  retries = 3,
  delay = 1200
): Promise<{ data: any[] | null; error: any }> => {
  try {
    const res = await queryFn();
    if (res.error && retries > 0) {
      console.warn(`Error de base de datos transitorio: "${res.error.message}". Reintentando en ${delay}ms... (${retries} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return runWithRetry(queryFn, retries - 1, delay * 1.5);
    }
    return res;
  } catch (err: any) {
    if (retries > 0) {
      console.warn(`Excepción de conexión con la BD: "${err?.message || err}". Reintentando en ${delay}ms... (${retries} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return runWithRetry(queryFn, retries - 1, delay * 1.5);
    }
    throw err;
  }
};

export const normalizeModel = (raw: any): any => {
  if (!raw) return raw;
  const isFeatured = raw.destacada === true || 
    (typeof raw.instagram === 'string' && (raw.instagram.split('|')[5] === 'featured' || raw.instagram.includes('|featured')));
  return {
    ...raw,
    destacada: isFeatured
  };
};

export const normalizeModelsList = (list: any[] | null | undefined): any[] => {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeModel);
};

/**
 * Obtiene las modelos usando la estrategia Stale-While-Revalidate (SWR).
 * Si hay datos en caché, los devuelve inmediatamente (0ms) y ejecuta
 * una consulta en segundo plano para actualizar la caché.
 */
export const getCachedModels = async (
  onUpdate?: (data: any[]) => void,
  forceRefresh: boolean = false
): Promise<any[]> => {
  // 1. Comprobar memoria primero
  if (!forceRefresh && memoryModelsCache && memoryModelsCache.length > 0) {
    if (onUpdate) {
      revalidateModels(onUpdate);
    }
    return normalizeModelsList(memoryModelsCache);
  }

  // 2. Comprobar sessionStorage
  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem('pt_models_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          memoryModelsCache = normalizeModelsList(parsed);
          if (onUpdate) {
            revalidateModels(onUpdate);
          }
          return memoryModelsCache;
        }
      }
    } catch (e) {
      console.warn("Error leyendo modelos de sessionStorage:", e);
    }
  }

  // 3. Consulta directa a Supabase (si no hay caché o se fuerza recarga) con reintentos automáticos
  const { data, error } = await runWithRetry(() => 
    supabase.from('models').select('*').order('nombre')
  );
  if (error) throw error;

  const normalized = normalizeModelsList(data);
  if (normalized) {
    memoryModelsCache = normalized;
    try {
      sessionStorage.setItem('pt_models_cache', JSON.stringify(normalized));
    } catch (e) {
      console.warn("Error guardando modelos en sessionStorage:", e);
    }
  }
  return normalized || [];
};

const revalidateModels = async (onUpdate: (data: any[]) => void) => {
  try {
    const { data, error } = await runWithRetry(() => 
      supabase.from('models').select('*').order('nombre')
    );
    if (!error && data) {
      const normalized = normalizeModelsList(data);
      const oldStr = JSON.stringify(memoryModelsCache || []);
      const newStr = JSON.stringify(normalized);
      if (oldStr !== newStr) {
        memoryModelsCache = normalized;
        try {
          sessionStorage.setItem('pt_models_cache', newStr);
        } catch (e) {}
        onUpdate(normalized);
      }
    }
  } catch (err) {
    console.warn("Error de revalidación de modelos en segundo plano:", err);
  }
};

/**
 * Obtiene las reservas usando la estrategia Stale-While-Revalidate (SWR).
 */
export const getCachedBookings = async (
  onUpdate?: (data: any[]) => void,
  forceRefresh: boolean = false
): Promise<any[]> => {
  if (!forceRefresh && memoryBookingsCache && memoryBookingsCache.length > 0) {
    if (onUpdate) {
      revalidateBookings(onUpdate);
    }
    return memoryBookingsCache;
  }

  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem('pt_bookings_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          memoryBookingsCache = parsed;
          if (onUpdate) {
            revalidateBookings(onUpdate);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Error leyendo reservas de sessionStorage:", e);
    }
  }

  const { data, error } = await runWithRetry(() =>
    supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
  );
  if (error) throw error;

  if (data) {
    memoryBookingsCache = data;
    try {
      sessionStorage.setItem('pt_bookings_cache', JSON.stringify(data));
    } catch (e) {
      console.warn("Error guardando reservas en sessionStorage:", e);
    }
  }
  return data || [];
};

const revalidateBookings = async (onUpdate: (data: any[]) => void) => {
  try {
    const { data, error } = await runWithRetry(() =>
      supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
    );
    if (!error && data) {
      const oldStr = JSON.stringify(memoryBookingsCache || []);
      const newStr = JSON.stringify(data);
      if (oldStr !== newStr) {
        memoryBookingsCache = data;
        try {
          sessionStorage.setItem('pt_bookings_cache', newStr);
        } catch (e) {}
        onUpdate(data);
      }
    }
  } catch (err) {
    console.warn("Error de revalidación de reservas en segundo plano:", err);
  }
};

/**
 * Invalida la caché de modelos para forzar una consulta fresca en la próxima llamada.
 */
export const invalidateModelsCache = () => {
  memoryModelsCache = null;
  try {
    sessionStorage.removeItem('pt_models_cache');
  } catch (e) {}
};

/**
 * Invalida la caché de reservas.
 */
export const invalidateBookingsCache = () => {
  memoryBookingsCache = null;
  try {
    sessionStorage.removeItem('pt_bookings_cache');
  } catch (e) {}
};

