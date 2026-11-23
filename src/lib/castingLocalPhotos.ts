import { CastingApplication } from '../types';

export const CASTING_PHOTO_DRAFT_KEY = 'pt_casting_photo_draft';
export const CASTING_LOCAL_PHOTOS_KEY = 'pt_casting_local_photos';

export interface CastingPhotoDraft {
  fotoCara: string;
  fotoCuerpo: string;
  updatedAt: string;
}

export interface LocalCastingPhotoRecord {
  id: string;
  correo: string;
  instagram: string;
  whatsapp: string;
  nombre: string;
  apellidos: string;
  fotoCaraUrl: string;
  fotoCuerpoUrl: string;
  fotoCaraDataUrl?: string;
  fotoCuerpoDataUrl?: string;
  createdAt: string;
}

function normalizeEmail(val: string | null | undefined): string {
  return String(val || '').trim().toLowerCase();
}

function normalizeIg(val: string | null | undefined): string {
  return String(val || '').trim().replace(/^@+/, '').toLowerCase();
}

function normalizePhone(val: string | null | undefined): string {
  return String(val || '').replace(/\D/g, '');
}

function normalizeName(nombre: string | null | undefined, apellidos: string | null | undefined): string {
  return `${String(nombre || '').trim()} ${String(apellidos || '').trim()}`
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function loadCastingPhotoDraft(): CastingPhotoDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CASTING_PHOTO_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      fotoCara: typeof parsed.fotoCara === 'string' ? parsed.fotoCara : '',
      fotoCuerpo: typeof parsed.fotoCuerpo === 'string' ? parsed.fotoCuerpo : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
}

export function saveCastingPhotoDraft(fotoCara: string, fotoCuerpo: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (!fotoCara && !fotoCuerpo) {
      window.localStorage.removeItem(CASTING_PHOTO_DRAFT_KEY);
      return;
    }
    const payload: CastingPhotoDraft = {
      fotoCara,
      fotoCuerpo,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(CASTING_PHOTO_DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Ignorar si excede la cuota de almacenamiento del navegador
  }
}

export function clearCastingPhotoDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CASTING_PHOTO_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function getLocalSubmittedCastingPhotos(): LocalCastingPhotoRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CASTING_LOCAL_PHOTOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalSubmittedCastingPhotos(record: LocalCastingPhotoRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalSubmittedCastingPhotos();
    const next = [record, ...existing].slice(0, 12);
    try {
      window.localStorage.setItem(CASTING_LOCAL_PHOTOS_KEY, JSON.stringify(next));
    } catch {
      // Si la cuota está llena con base64, guardar solo rutas locales ligeras
      const lightweight = next.map(({ fotoCaraDataUrl: _c, fotoCuerpoDataUrl: _b, ...rest }) => rest);
      window.localStorage.setItem(CASTING_LOCAL_PHOTOS_KEY, JSON.stringify(lightweight));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function matchLocalPhotosToApplication(
  app: CastingApplication,
  records: LocalCastingPhotoRecord[]
): { fotoCara: string; fotoCuerpo: string } {
  const existingCara = typeof app.foto_cara === 'string' ? app.foto_cara.trim() : '';
  const existingCuerpo = typeof app.foto_cuerpo === 'string' ? app.foto_cuerpo.trim() : '';
  if (existingCara || existingCuerpo) {
    return { fotoCara: existingCara, fotoCuerpo: existingCuerpo };
  }

  const appEmail = normalizeEmail(app.correo);
  const appIg = normalizeIg(app.instagram);
  const appPhone = normalizePhone(app.whatsapp);
  const appName = normalizeName(app.nombre, app.apellidos);

  const match =
    records.find((r) => appEmail && normalizeEmail(r.correo) === appEmail) ||
    records.find((r) => appIg && normalizeIg(r.instagram) === appIg) ||
    records.find((r) => appPhone && appPhone.length >= 7 && normalizePhone(r.whatsapp) === appPhone) ||
    records.find((r) => appName && normalizeName(r.nombre, r.apellidos) === appName);

  if (!match) {
    return { fotoCara: '', fotoCuerpo: '' };
  }

  return {
    fotoCara: match.fotoCaraUrl || match.fotoCaraDataUrl || '',
    fotoCuerpo: match.fotoCuerpoUrl || match.fotoCuerpoDataUrl || '',
  };
}
