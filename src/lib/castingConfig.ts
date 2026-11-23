export interface CastingConfig {
  enabled: boolean;
  deadlineIso: string;
}

// Modo temporal de presentación: muestra únicamente la página de Casting en "/" y "/casting"
// sin referencias al catálogo. Cambiar a false al aprobar el diseño para restaurar el catálogo.
export const CASTING_ONLY_PREVIEW_MODE = true;

export const CASTING_STORAGE_KEY = 'pt_casting_config';
export const CASTING_EVENT_UPDATED = 'pt-casting-config-updated';
export const CASTING_SUBMISSIONS_KEY = 'pt_casting_submissions';

export const CASTING_FLYER_SRC = '/assets/aistudio/casting_flyer_top.jpg';
export const CASTING_VIDEO_SRC = '/assets/aistudio/Casting_Planet_2c988d68.mp4';
export const CASTING_VIDEO_POSTER_SRC = '/assets/aistudio/casting_video_poster.jpg';

// Canal Oficial de WhatsApp: CASTING PLANET INFORMACIÓN
export const CASTING_WHATSAPP_CHANNEL_URL =
  'https://whatsapp.com/channel/0029Vb9Arh8AInPdaFhOXE1W';

export const CASTING_VENUE = 'Estudio 50';
export const CASTING_ADDRESS =
  'Calle Lugareño esquina Almendares, Vedado, Plaza de la Revolución, La Habana, Cuba';
export const CASTING_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${CASTING_VENUE}, 4JHC+W9V, ${CASTING_ADDRESS}`
)}`;

// Cierre oficial de inscripciones en línea: 25 de noviembre de 2026 (23:59 hora de Cuba, UTC-5)
export const DEFAULT_CASTING_CONFIG: CastingConfig = {
  enabled: true,
  deadlineIso: '2026-11-25T23:59:59-05:00',
};

export function getCastingConfig(): CastingConfig {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_CASTING_CONFIG };
  }
  try {
    const raw = window.localStorage.getItem(CASTING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CASTING_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      enabled:
        typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_CASTING_CONFIG.enabled,
      deadlineIso:
        typeof parsed.deadlineIso === 'string' && parsed.deadlineIso
          ? parsed.deadlineIso
          : DEFAULT_CASTING_CONFIG.deadlineIso,
    };
  } catch {
    return { ...DEFAULT_CASTING_CONFIG };
  }
}

function persistLocalCastingConfig(updated: CastingConfig): CastingConfig {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CASTING_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(CASTING_EVENT_UPDATED, { detail: updated }));
    } catch {
      // ignore storage errors
    }
  }
  return updated;
}

export function setCastingEnabled(enabled: boolean): CastingConfig {
  const current = getCastingConfig();
  return persistLocalCastingConfig({
    ...current,
    enabled,
  });
}

/**
 * Sincroniza el estado Activo/Pausado desde Supabase (tabla casting_settings).
 * Si la tabla aún no existe o no hay conexión, mantiene la configuración local.
 */
export async function fetchRemoteCastingConfig(): Promise<CastingConfig> {
  const local = getCastingConfig();
  try {
    const { supabase } = await import('./supabase');
    const { data, error } = await supabase
      .from('casting_settings')
      .select('enabled, deadline_iso')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return local;

    const synced: CastingConfig = {
      enabled: typeof data.enabled === 'boolean' ? data.enabled : local.enabled,
      deadlineIso:
        typeof data.deadline_iso === 'string' && data.deadline_iso
          ? data.deadline_iso
          : DEFAULT_CASTING_CONFIG.deadlineIso,
    };
    return persistLocalCastingConfig(synced);
  } catch {
    return local;
  }
}

/**
 * Guarda el interruptor Activo/Pausado en Supabase (solo administrador autenticado via RLS)
 * y actualiza inmediatamente el estado local.
 */
export async function saveRemoteCastingEnabled(
  enabled: boolean
): Promise<{ ok: boolean; error?: string; config: CastingConfig }> {
  const current = getCastingConfig();
  const updated = persistLocalCastingConfig({
    ...current,
    enabled,
  });

  try {
    const { supabase } = await import('./supabase');
    const { error } = await supabase
      .from('casting_settings')
      .upsert(
        {
          id: 1,
          enabled,
          deadline_iso: current.deadlineIso || DEFAULT_CASTING_CONFIG.deadlineIso,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      return { ok: false, error: error.message, config: updated };
    }
    return { ok: true, config: updated };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error de conexión', config: updated };
  }
}

export function isCastingWithinDeadline(now: Date = new Date(), deadlineIso?: string): boolean {
  const iso = deadlineIso || getCastingConfig().deadlineIso;
  const deadline = new Date(iso);
  if (Number.isNaN(deadline.getTime())) return true;
  return now.getTime() <= deadline.getTime();
}

export function isCastingActive(now: Date = new Date()): boolean {
  const config = getCastingConfig();
  return config.enabled && isCastingWithinDeadline(now, config.deadlineIso);
}

export function getCastingStatusInfo(now: Date = new Date()) {
  const config = getCastingConfig();
  const withinDeadline = isCastingWithinDeadline(now, config.deadlineIso);
  const expired = !withinDeadline;
  const active = config.enabled && withinDeadline;
  return {
    active,
    enabled: config.enabled,
    expired,
    deadlineIso: config.deadlineIso,
  };
}

// Límite anti-spam por dispositivo (máximo 2 envíos en 24 horas)
const DEVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEVICE_MAX_SUBMISSIONS = 2;

export function getRecentDeviceSubmissions(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CASTING_SUBMISSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((ts) => typeof ts === 'number' && now - ts < DEVICE_WINDOW_MS);
  } catch {
    return [];
  }
}

export function canDeviceSubmitCasting(): { allowed: boolean; remaining: number } {
  const recent = getRecentDeviceSubmissions();
  const remaining = Math.max(0, DEVICE_MAX_SUBMISSIONS - recent.length);
  return {
    allowed: recent.length < DEVICE_MAX_SUBMISSIONS,
    remaining,
  };
}

export function recordCastingDeviceSubmission(): void {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentDeviceSubmissions();
    recent.push(Date.now());
    window.localStorage.setItem(CASTING_SUBMISSIONS_KEY, JSON.stringify(recent));
  } catch {
    // ignore storage errors
  }
}
