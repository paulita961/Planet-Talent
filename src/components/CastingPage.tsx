import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  MessageCircle,
  Play,
  Shirt,
  Sparkles,
  UserCheck,
  X,
  AlertTriangle,
  Camera,
  Volume2,
  VolumeX,
  Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import {
  CASTING_ADDRESS,
  CASTING_FLYER_SRC,
  CASTING_MAPS_URL,
  CASTING_VENUE,
  CASTING_VIDEO_POSTER_SRC,
  CASTING_VIDEO_SRC,
  CASTING_WHATSAPP_CHANNEL_URL,
  canDeviceSubmitCasting,
  recordCastingDeviceSubmission,
} from '../lib/castingConfig';
import {
  clearCastingPhotoDraft,
  loadCastingPhotoDraft,
  saveCastingPhotoDraft,
  saveLocalSubmittedCastingPhotos,
} from '../lib/castingLocalPhotos';
import { compressImageFile } from '../lib/imageOptimizer';

interface CastingPageProps {
  lang: 'es' | 'en';
  onChangeLang: (lang: 'es' | 'en') => void;
  onBackToCatalog: () => void;
  castingActive: boolean;
}

const UPPER_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const LOWER_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', 'Otro'];
const HAIR_COLORS = ['Rubio', 'Negro', 'Castaño', 'Rojo', 'Otro'];
const HAIR_LENGTHS = ['Corto', 'Medio', 'Largo', 'Otro'];
const EYE_COLORS = ['Azules', 'Verdes', 'Carmelitas', 'Negros', 'Otro'];
const SKIN_TONES = ['Blanca', 'Morena', 'Mulata', 'Negra', 'Otro'];

function computeAgeFromDob(dobStr: string): number | null {
  if (!dobStr) return null;
  const parts = dobStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  const today = new Date();
  let age = today.getFullYear() - year;
  const m = today.getMonth() + 1 - month;
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--;
  }
  return age >= 0 && age <= 100 ? age : null;
}

interface CastingCountdown {
  active: boolean;
  ended: boolean;
  isUrgent: boolean;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  urgencyEs: string;
  urgencyEn: string;
  closeEs: string;
  closeEn: string;
}

const CASTING_CLOSE_MS = Date.parse('2026-11-25T23:59:59-05:00');
const CASTING_END_MS = Date.parse('2026-11-29T18:00:00-05:00');
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0');
}

function getCastingCountdown(nowMs: number = Date.now()): CastingCountdown {
  const diff = CASTING_CLOSE_MS - nowMs;
  if (diff > 0) {
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    const isUrgent = diff <= THREE_DAYS_MS || days <= 3;
    return {
      active: true,
      ended: false,
      isUrgent,
      days: pad2(days),
      hours: pad2(hours),
      minutes: pad2(minutes),
      seconds: pad2(seconds),
      urgencyEs: '¡Queda poco tiempo!',
      urgencyEn: 'Time is running out!',
      closeEs: 'Inscripción en línea cierra el 25 de nov.',
      closeEn: 'Online registration closes Nov 25',
    };
  }
  if (nowMs <= CASTING_END_MS) {
    return {
      active: false,
      ended: false,
      isUrgent: true,
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
      urgencyEs: '¡Registro cerrado!',
      urgencyEn: 'Registration closed!',
      closeEs: 'Casting presencial 28 y 29 de nov.',
      closeEn: 'In-person casting Nov 28 & 29',
    };
  }
  return {
    active: false,
    ended: true,
    isUrgent: false,
    days: '00',
    hours: '00',
    minutes: '00',
    seconds: '00',
    urgencyEs: 'Convocatoria finalizada',
    urgencyEn: 'Casting ended',
    closeEs: 'Inscripción cerró el 25 de nov.',
    closeEn: 'Registration closed Nov 25',
  };
}

export const CastingPage: React.FC<CastingPageProps> = ({
  lang,
  onChangeLang,
  onBackToCatalog: _onBackToCatalog,
  castingActive,
}) => {
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [heroMuted, setHeroMuted] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [countdown, setCountdown] = useState<CastingCountdown>(() => getCastingCountdown());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(getCastingCountdown());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // 5-step form state
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Honeypot anti-spam (hidden trap field)
  const [honeypot, setHoneypot] = useState('');

  // Step 1
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [correo, setCorreo] = useState('');
  const [instagram, setInstagram] = useState('');

  // Step 2
  const [estatura, setEstatura] = useState('');
  const [busto, setBusto] = useState('');
  const [cintura, setCintura] = useState('');
  const [caderas, setCaderas] = useState('');
  const [tallaSuperior, setTallaSuperior] = useState('');
  const [tallaInferior, setTallaInferior] = useState('');
  const [calzado, setCalzado] = useState('');
  const [calzadoOtro, setCalzadoOtro] = useState('');

  // Step 3
  const [colorCabello, setColorCabello] = useState('');
  const [colorCabelloOtro, setColorCabelloOtro] = useState('');
  const [largoCabello, setLargoCabello] = useState('');
  const [largoCabelloOtro, setLargoCabelloOtro] = useState('');
  const [colorOjos, setColorOjos] = useState('');
  const [colorOjosOtro, setColorOjosOtro] = useState('');
  const [tonoPiel, setTonoPiel] = useState('');
  const [tonoPielOtro, setTonoPielOtro] = useState('');

  // Step 4
  const [tienePiercings, setTienePiercings] = useState<boolean | null>(null);
  const [tieneTatuajes, setTieneTatuajes] = useState<boolean | null>(null);
  const [detallePiercingsTatuajes, setDetallePiercingsTatuajes] = useState('');
  const [fotoCara, setFotoCara] = useState<string>(() => loadCastingPhotoDraft()?.fotoCara || '');
  const [fotoCuerpo, setFotoCuerpo] = useState<string>(() => loadCastingPhotoDraft()?.fotoCuerpo || '');
  const [uploadingCara, setUploadingCara] = useState<boolean>(false);
  const [uploadingCuerpo, setUploadingCuerpo] = useState<boolean>(false);

  const handleCaraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCara(true);
    try {
      const compressed = await compressImageFile(file, { maxWidth: 800, maxHeight: 1000, quality: 0.82 });
      setFotoCara(compressed);
      saveCastingPhotoDraft(compressed, fotoCuerpo);
    } catch (err) {
      toast.error(lang === 'es' ? 'Error al procesar la foto de la cara' : 'Error processing face photo');
    } finally {
      setUploadingCara(false);
    }
  };

  const handleCuerpoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCuerpo(true);
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1000, maxHeight: 1400, quality: 0.82 });
      setFotoCuerpo(compressed);
      saveCastingPhotoDraft(fotoCara, compressed);
    } catch (err) {
      toast.error(lang === 'es' ? 'Error al procesar la foto de cuerpo completo' : 'Error processing full-body photo');
    } finally {
      setUploadingCuerpo(false);
    }
  };

  const calculatedAge = computeAgeFromDob(fechaNacimiento);
  const isUnderage = calculatedAge !== null && calculatedAge < 17;
  const isSeventeen = calculatedAge === 17;
  const heightNum = Number(estatura);
  const showHeightWarning = estatura.trim() !== '' && !Number.isNaN(heightNum) && heightNum > 0 && heightNum < 165;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && videoPlaying) {
        setVideoPlaying(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [videoPlaying]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(`${CASTING_VENUE}, ${CASTING_ADDRESS}`);
      setCopiedAddress(true);
      toast.success(lang === 'es' ? 'Dirección copiada al portapapeles' : 'Address copied to clipboard');
      setTimeout(() => setCopiedAddress(false), 2200);
    } catch {
      toast.error(lang === 'es' ? 'No se pudo copiar la dirección' : 'Could not copy address');
    }
  };

  const scrollToForm = () => {
    const el = document.getElementById('casting-form-section');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const validateStep1 = (): string | null => {
    if (!nombre.trim() || !apellidos.trim()) {
      return lang === 'es' ? 'Ingresa tu nombre y apellidos.' : 'Enter your first and last name.';
    }
    if (!fechaNacimiento || calculatedAge === null) {
      return lang === 'es' ? 'Selecciona tu fecha de nacimiento.' : 'Select your date of birth.';
    }
    if (calculatedAge < 17) {
      return lang === 'es'
        ? 'Debes tener 17 años o más para postularte a este casting.'
        : 'You must be 17 or older to apply for this casting.';
    }
    if (!ciudad.trim()) {
      return lang === 'es' ? 'Indica tu ciudad o ubicación actual.' : 'Enter your current city.';
    }
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, '').length < 7) {
      return lang === 'es' ? 'Ingresa un número de WhatsApp válido.' : 'Enter a valid WhatsApp number.';
    }
    if (!correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      return lang === 'es' ? 'Ingresa un correo electrónico válido.' : 'Enter a valid email address.';
    }
    const cleanIg = instagram.replace(/^@+/, '').trim();
    if (!cleanIg) {
      return lang === 'es' ? 'Indica tu usuario de Instagram.' : 'Enter your Instagram handle.';
    }
    return null;
  };

  const formatInstagramInput = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const withoutUrl = trimmed
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .split(/[/?#]/)[0];
    const cleaned = withoutUrl.replace(/^@+/, '').replace(/\s+/g, '');
    if (!cleaned) {
      return raw.includes('@') ? '@' : '';
    }
    return `@${cleaned}`;
  };

  const validateStep2 = (): string | null => {
    const h = Number(estatura);
    if (!estatura.trim() || Number.isNaN(h) || h < 120 || h > 220) {
      return lang === 'es' ? 'Ingresa tu estatura en centímetros (ej. 170).' : 'Enter your height in cm (e.g. 170).';
    }
    if (!busto.trim() || !cintura.trim() || !caderas.trim()) {
      return lang === 'es'
        ? 'Completa tus medidas de busto, cintura y caderas en cm.'
        : 'Enter your bust, waist, and hip measurements in cm.';
    }
    if (!tallaSuperior || !tallaInferior) {
      return lang === 'es'
        ? 'Selecciona tu talla superior e inferior.'
        : 'Select your top and bottom clothing sizes.';
    }
    if (!calzado || (calzado === 'Otro' && !calzadoOtro.trim())) {
      return lang === 'es' ? 'Selecciona o especifica tu talla de calzado.' : 'Select or specify your shoe size.';
    }
    return null;
  };

  const validateStep3 = (): string | null => {
    if (!colorCabello || (colorCabello === 'Otro' && !colorCabelloOtro.trim())) {
      return lang === 'es' ? 'Indica tu color de cabello.' : 'Select your hair color.';
    }
    if (!largoCabello || (largoCabello === 'Otro' && !largoCabelloOtro.trim())) {
      return lang === 'es' ? 'Indica el largo de tu cabello.' : 'Select your hair length.';
    }
    if (!colorOjos || (colorOjos === 'Otro' && !colorOjosOtro.trim())) {
      return lang === 'es' ? 'Indica tu color de ojos.' : 'Select your eye color.';
    }
    if (!tonoPiel || (tonoPiel === 'Otro' && !tonoPielOtro.trim())) {
      return lang === 'es' ? 'Indica tu tono de piel.' : 'Select your skin tone.';
    }
    return null;
  };

  const validateStep4 = (): string | null => {
    if (tienePiercings === null || tieneTatuajes === null) {
      return lang === 'es'
        ? 'Responde Sí o No en piercings y tatuajes.'
        : 'Please answer Yes or No for piercings and tattoos.';
    }
    if ((tienePiercings || tieneTatuajes) && !detallePiercingsTatuajes.trim()) {
      return lang === 'es'
        ? 'Indica el lugar y tamaño de tus piercings o tatuajes.'
        : 'Please specify the location and size of your piercings or tattoos.';
    }
    return null;
  };

  const validateStep5 = (): string | null => {
    if (!fotoCara) {
      return lang === 'es'
        ? 'Sube una foto de tu cara (primer plano con actitud de modelo) para continuar.'
        : 'Please upload your face photo to continue.';
    }
    if (!fotoCuerpo) {
      return lang === 'es'
        ? 'Sube una foto de cuerpo completo para continuar.'
        : 'Please upload your full-body photo to continue.';
    }
    return null;
  };

  const handleNextStep = () => {
    setSubmitError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setSubmitError(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setSubmitError(err);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      const err = validateStep3();
      if (err) {
        setSubmitError(err);
        return;
      }
      setStep(4);
    } else if (step === 4) {
      const err = validateStep4();
      if (err) {
        setSubmitError(err);
        return;
      }
      setStep(5);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!castingActive) {
      setSubmitError(
        lang === 'es'
          ? 'La convocatoria de casting se encuentra pausada o cerrada en este momento.'
          : 'This casting call is currently paused or closed.'
      );
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSubmitError(
        lang === 'es'
          ? 'Estás sin conexión a internet. Puedes ver la información offline, pero conéctate para enviar tu postulación.'
          : 'You are offline. Please reconnect to the internet to submit your application.'
      );
      return;
    }

    // Revalidar todos los pasos
    const err =
      validateStep1() ||
      validateStep2() ||
      validateStep3() ||
      validateStep4() ||
      validateStep5();
    if (err) {
      setSubmitError(err);
      return;
    }

    // Campo trampa honeypot: si un bot lo llenó, simular éxito sin guardar ni notificar
    if (honeypot.trim() !== '') {
      setSubmitted(true);
      return;
    }

    // Límite por dispositivo
    const deviceCheck = canDeviceSubmitCasting();
    if (!deviceCheck.allowed) {
      setSubmitError(
        lang === 'es'
          ? 'Ya alcanzaste el límite de envíos permitidos desde este dispositivo. Si necesitas corregir datos, contáctanos por el Canal de WhatsApp.'
          : 'You have reached the submission limit from this device. Please reach out via our WhatsApp Channel.'
      );
      return;
    }

    const finalCalzado = calzado === 'Otro' ? calzadoOtro.trim() : calzado;
    const finalHairColor = colorCabello === 'Otro' ? colorCabelloOtro.trim() : colorCabello;
    const finalHairLength = largoCabello === 'Otro' ? largoCabelloOtro.trim() : largoCabello;
    const finalEyes = colorOjos === 'Otro' ? colorOjosOtro.trim() : colorOjos;
    const finalSkin = tonoPiel === 'Otro' ? tonoPielOtro.trim() : tonoPiel;
    const normalizedIg = instagram.trim().startsWith('@')
      ? instagram.trim()
      : `@${instagram.trim()}`;

    setSubmitting(true);
    try {
      // 1. Guardar las 2 fotografías en almacenamiento local (servidor + localStorage del navegador)
      let localPhotoId = `local-${Date.now()}`;
      let localCaraUrl = '';
      let localCuerpoUrl = '';

      const uploadRes = await fetch('/api/casting-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fotoCara,
          fotoCuerpo,
          correo: correo.trim().toLowerCase(),
          instagram: normalizedIg,
          whatsapp: whatsapp.trim(),
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
          website: honeypot,
        }),
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData?.fotoCaraUrl || !uploadData?.fotoCuerpoUrl) {
        throw new Error(
          uploadData?.error ||
            (lang === 'es'
              ? 'No se pudieron guardar las fotografías en el almacenamiento local.'
              : 'Could not save photos to local storage.')
        );
      }

      localPhotoId = uploadData.id || localPhotoId;
      localCaraUrl = uploadData.fotoCaraUrl;
      localCuerpoUrl = uploadData.fotoCuerpoUrl;

      saveLocalSubmittedCastingPhotos({
        id: localPhotoId,
        correo: correo.trim().toLowerCase(),
        instagram: normalizedIg,
        whatsapp: whatsapp.trim(),
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        fotoCaraUrl: localCaraUrl,
        fotoCuerpoUrl: localCuerpoUrl,
        fotoCaraDataUrl: fotoCara,
        fotoCuerpoDataUrl: fotoCuerpo,
        createdAt: new Date().toISOString(),
      });

      // 2. Insertar ficha en Supabase (SIN .select() para respetar RLS insert-only para anónimos).
      // Si la tabla en Supabase aún no tiene las columnas foto_cara / foto_cuerpo en su caché de esquema,
      // reintenta automáticamente sin esas columnas ya que las fotos quedan guardadas en almacenamiento local.
      const baseApplicationPayload = {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        fecha_nacimiento: fechaNacimiento,
        edad: calculatedAge!,
        ciudad: ciudad.trim(),
        whatsapp: whatsapp.trim(),
        correo: correo.trim().toLowerCase(),
        instagram: normalizedIg,
        estatura: Math.round(Number(estatura)),
        busto: busto ? Math.round(Number(busto)) : null,
        cintura: cintura ? Math.round(Number(cintura)) : null,
        caderas: caderas ? Math.round(Number(caderas)) : null,
        talla_superior: tallaSuperior,
        talla_inferior: tallaInferior,
        calzado: finalCalzado,
        color_cabello: finalHairColor,
        largo_cabello: finalHairLength,
        color_ojos: finalEyes,
        tono_piel: finalSkin,
        tiene_piercings: Boolean(tienePiercings),
        tiene_tatuajes: Boolean(tieneTatuajes),
        detalle_piercings_tatuajes:
          tienePiercings || tieneTatuajes ? detallePiercingsTatuajes.trim() : null,
        estado: 'pendiente',
      };

      let { error: dbError } = await supabase.from('casting_applications').insert([
        {
          ...baseApplicationPayload,
          foto_cara: localCaraUrl,
          foto_cuerpo: localCuerpoUrl,
        },
      ]);

      if (
        dbError &&
        (dbError.code === 'PGRST204' ||
          dbError.code === '42703' ||
          /foto_cara|foto_cuerpo|schema cache|column/i.test(dbError.message || ''))
      ) {
        const retryRes = await supabase
          .from('casting_applications')
          .insert([baseApplicationPayload]);
        dbError = retryRes.error;
      }

      if (dbError) {
        throw dbError;
      }

      clearCastingPhotoDraft();

      // 3. Enviar aviso únicamente por Telegram
      try {
        await fetch('/api/notify-casting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nombre.trim(),
            apellidos: apellidos.trim(),
            edad: calculatedAge,
            estatura: Math.round(Number(estatura)),
            whatsapp: whatsapp.trim(),
            instagram: normalizedIg,
            website: honeypot,
          }),
        });
      } catch (notifyErr) {
        console.warn('Error enviando notificación de casting a Telegram:', notifyErr);
      }

      recordCastingDeviceSubmission();
      setSubmitted(true);
      toast.success(
        lang === 'es'
          ? '¡Postulación enviada con éxito!'
          : 'Application submitted successfully!'
      );
      document.getElementById('casting-form-section')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error: any) {
      console.error('Error submitting casting application:', error);
      setSubmitError(
        lang === 'es'
          ? `No se pudo guardar tu postulación (${error?.message || 'error de conexión'}). Intenta nuevamente.`
          : `Could not save your application (${error?.message || 'connection error'}). Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = (step / 5) * 100;

  return (
    <div
      id="casting-page-root"
      className="min-h-screen bg-[#0B0B0D] text-[#F5F5F7] font-sans flex flex-col selection:bg-[#CC0000] selection:text-white"
    >
      {/* Slim Top Bar */}
      <header
        id="casting-page-header"
        className="sticky top-0 z-30 bg-[#0B0B0D]/90 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-10 sm:h-11 flex items-center justify-between gap-3">
          <img
            src="/Logo de Planet Talent.PNG"
            alt="Planet Talent"
            className="h-4 sm:h-5 w-auto object-contain shrink-0"
          />

          <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/15 rounded-full text-[11px] shrink-0">
            <Globe className="w-3 h-3 text-zinc-300 shrink-0" />
            <button
              type="button"
              onClick={() => onChangeLang('es')}
              className={`uppercase font-medium tracking-wider cursor-pointer px-0.5 transition-colors ${
                lang === 'es' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              ES
            </button>
            <span className="text-white/25 text-[10px]">|</span>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`uppercase font-medium tracking-wider cursor-pointer px-0.5 transition-colors ${
                lang === 'en' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      <main id="casting-page-main" className="flex-1">
        {/* 1) HERO DE CONVOCATORIA: EN MÓVIL CON TARJETA DE VIDEO, EN ESCRITORIO FONDO COMPLETO SIN HUECOS */}
        <section className="relative w-full overflow-hidden border-b border-white/10 bg-[#0B0B0D] min-h-[calc(100dvh-2.5rem)] sm:min-h-[calc(100dvh-2.75rem)] flex flex-col justify-between">
          {/* Video/Miniatura promocional a sección completa SOLO en escritorio (lg+) */}
          <div className="hidden lg:block absolute inset-0 z-0 pointer-events-none">
            <video
              src={CASTING_VIDEO_SRC}
              poster={CASTING_VIDEO_POSTER_SRC}
              autoPlay
              loop
              muted={heroMuted}
              playsInline
              preload="metadata"
              className="w-full h-full object-cover object-[50%_28%] opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D]/92 via-[#0B0B0D]/68 to-[#0B0B0D]/55" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0D]/50 via-transparent to-[#0B0B0D]/92" />
          </div>

          <div className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 pt-2.5 pb-4 sm:pt-6 sm:pb-10 flex flex-col justify-between">
            {/* Bloque superior: Título + Controles de Video en escritorio arriba a la derecha */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-2.5 sm:space-y-4 lg:max-w-3xl">
                <p
                  id="casting-hero-banner"
                  className="text-[11px] sm:text-sm text-zinc-200 border-b border-white/15 pb-1.5 sm:pb-2 w-fit"
                >
                  <span className="font-normal tracking-[0.03em] text-white">
                    {lang === 'es' ? 'Convocatoria presencial' : 'In-person audition'}
                  </span>
                  <span className="text-white/35 mx-1.5 sm:mx-2" aria-hidden="true">·</span>
                  <span className="font-normal tracking-normal text-zinc-200">
                    Planet Talent &amp; Planet Records
                  </span>
                </p>

                <h1 className="flex flex-col items-start">
                  <span className="font-condensed uppercase text-[3.1rem] sm:text-[5.25rem] lg:text-[6rem] leading-[0.86] tracking-[0.03em] bg-gradient-to-b from-[#FCE99F] via-[#E2BA57] to-[#B07F24] bg-clip-text text-transparent drop-shadow-[0_4px_18px_rgba(212,175,55,0.28)]">
                    {lang === 'es' ? 'CASTING' : 'CASTING'}
                  </span>
                  <span className="font-['Cormorant_Garamond',serif] uppercase text-base sm:text-2xl lg:text-[1.75rem] font-semibold tracking-[0.22em] text-[#F5ECD5] leading-tight mt-0.5">
                    {lang === 'es' ? 'PARA MODELOS' : 'FOR MODELS'}
                  </span>
                </h1>

                <div className="space-y-1 sm:space-y-2">
                  <blockquote className="font-['Cormorant_Garamond',serif] italic font-semibold text-[1.32rem] sm:text-[1.85rem] lg:text-[2.1rem] tracking-normal text-white leading-[1.15] max-w-2xl drop-shadow-sm">
                    {lang === 'es'
                      ? '“Aquí necesitarás más que una cara bonita.”'
                      : '“You will need more than just a pretty face.”'}
                  </blockquote>

                  <p className="text-xs sm:text-base font-normal text-zinc-200 leading-snug sm:leading-relaxed max-w-2xl drop-shadow-sm">
                    {lang === 'es'
                      ? 'Buscamos actitud, proyección escénica y carácter para nuestros próximos videoclips, campañas editoriales y pasarelas.'
                      : 'We are looking for attitude, camera presence, and strong projection for upcoming music videos, editorial shoots, and runway shows.'}
                  </p>
                </div>
              </div>

              {/* Controles de audio y video completo en esquina superior derecha (solo escritorio) */}
              <div className="hidden lg:flex items-center gap-2 shrink-0 pt-1">
                <button
                  type="button"
                  onClick={() => setHeroMuted((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-black/55 hover:bg-black/75 border border-white/20 text-xs font-medium text-white rounded-sm backdrop-blur-sm transition-colors cursor-pointer"
                  aria-label={heroMuted ? 'Activar sonido del video' : 'Silenciar video'}
                >
                  {heroMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-[#E2BA57]" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#E2BA57]" />
                  )}
                  <span>{heroMuted ? (lang === 'es' ? 'Sonido' : 'Sound') : (lang === 'es' ? 'Silenciar' : 'Mute')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoPlaying(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-black/55 hover:bg-black/75 border border-white/20 text-xs font-medium text-white rounded-sm backdrop-blur-sm transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-[#E2BA57] fill-current" />
                  <span>{lang === 'es' ? 'Ver video completo' : 'Watch full video'}</span>
                  <Maximize2 className="w-3 h-3 text-zinc-300" />
                </button>
              </div>
            </div>

            {/* Banda inferior a ancho completo en escritorio (Fecha + Cierre rojo | Sede + Dirección + Botones | Contador + CTA) */}
            <div className="mt-4 sm:mt-8 pt-3.5 sm:pt-6 border-t border-white/15 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start lg:items-end">
              {/* Fecha y Sede: 2 columnas en móvil; en escritorio 7 cols combinadas sin apretarse */}
              <div
                id="casting-date-venue-grid"
                className="lg:col-span-7 grid grid-cols-2 gap-3 sm:gap-8"
              >
                <div className="flex items-start gap-1.5 sm:gap-2.5 min-w-0">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E2BA57] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-base font-medium text-white tabular-nums leading-snug">
                      {lang === 'es' ? '28 y 29 de noviembre' : 'Nov 28 & 29'}
                    </p>
                    <p className="text-[11px] sm:text-sm font-normal text-zinc-200 tabular-nums mt-0.5">
                      9:00 am
                    </p>
                    <p
                      id="casting-close-date-text"
                      className="inline-block mt-2 px-2.5 py-1 bg-[#8B1A1A]/30 border border-[#E05252]/70 rounded-sm text-[11px] sm:text-xs font-semibold text-[#FF7B7B] leading-snug"
                    >
                      {lang === 'es' ? countdown.closeEs : countdown.closeEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 sm:gap-2.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E2BA57] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-base font-medium text-white leading-snug">{CASTING_VENUE}</p>
                    <p className="text-[11px] sm:text-sm font-normal text-zinc-200 mt-0.5 leading-snug">
                      {CASTING_ADDRESS}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-[11px] sm:text-xs">
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="inline-flex items-center gap-1.5 text-zinc-200 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-[#E2BA57] transition-colors cursor-pointer"
                      >
                        {copiedAddress ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#E2BA57]" />
                        )}
                        <span>
                          {copiedAddress
                            ? lang === 'es'
                              ? 'Copiada'
                              : 'Copied'
                            : lang === 'es'
                            ? 'Copiar dirección'
                            : 'Copy address'}
                        </span>
                      </button>

                      <a
                        href={CASTING_MAPS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-zinc-200 hover:text-white underline underline-offset-4 decoration-white/30 hover:decoration-[#E2BA57] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-[#E2BA57]" />
                        <span>Google Maps</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contador + CTA ocupando las 5 columnas derechas en escritorio (y centrados en móvil) */}
              <div className="lg:col-span-5 flex flex-col items-center lg:items-end gap-3.5">
                <div
                  id="casting-days-countdown"
                  className="flex flex-col items-center lg:items-end text-center lg:text-right space-y-1 sm:space-y-1.5"
                >
                  <p className="text-[11px] sm:text-sm font-semibold uppercase tracking-[0.05em]">
                    <span className={countdown.isUrgent ? 'text-[#E05252]' : 'text-[#FCE99F]'}>
                      {lang === 'es' ? countdown.urgencyEs : countdown.urgencyEn}
                    </span>
                  </p>

                  <div className="flex items-baseline justify-center lg:justify-end gap-2.5 sm:gap-3.5">
                    <div className="flex flex-col items-center">
                      <span className="font-condensed text-[1.9rem] sm:text-[2.6rem] leading-none text-white tabular-nums">
                        {countdown.days}
                      </span>
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-zinc-300 mt-0.5 sm:mt-1">
                        {lang === 'es' ? 'Días' : 'Days'}
                      </span>
                    </div>

                    <span className="font-condensed text-2xl sm:text-4xl text-[#E2BA57]/80 leading-none">:</span>

                    <div className="flex flex-col items-center">
                      <span className="font-condensed text-[1.9rem] sm:text-[2.6rem] leading-none text-white tabular-nums">
                        {countdown.hours}
                      </span>
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-zinc-300 mt-0.5 sm:mt-1">
                        {lang === 'es' ? 'Horas' : 'Hrs'}
                      </span>
                    </div>

                    <span className="font-condensed text-2xl sm:text-4xl text-[#E2BA57]/80 leading-none">:</span>

                    <div className="flex flex-col items-center">
                      <span className="font-condensed text-[1.9rem] sm:text-[2.6rem] leading-none text-white tabular-nums">
                        {countdown.minutes}
                      </span>
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-zinc-300 mt-0.5 sm:mt-1">
                        Min
                      </span>
                    </div>

                    <span className="font-condensed text-2xl sm:text-4xl text-[#E2BA57]/80 leading-none">:</span>

                    <div className="flex flex-col items-center">
                      <span
                        id="casting-countdown-seconds"
                        className={`font-condensed text-[1.9rem] sm:text-[2.6rem] leading-none tabular-nums ${
                          countdown.isUrgent ? 'text-[#E05252]' : 'text-[#FCE99F]'
                        }`}
                      >
                        {countdown.seconds}
                      </span>
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] text-zinc-300 mt-0.5 sm:mt-1">
                        {lang === 'es' ? 'Seg' : 'Sec'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  id="casting-hero-cta"
                  type="button"
                  onClick={scrollToForm}
                  className={`cta-invite-btn group relative overflow-hidden w-full sm:w-auto sm:min-w-[270px] inline-flex items-center justify-center gap-3 px-8 py-3 sm:py-3.5 text-sm sm:text-base uppercase tracking-[0.08em] font-bold rounded-sm transition-shadow duration-200 cursor-pointer whitespace-nowrap ${
                    countdown.isUrgent
                      ? 'bg-[#8B1A1A] hover:bg-[#721212] border border-[#B03030]/75 text-white shadow-[0_12px_34px_rgba(139,26,26,0.45)] hover:shadow-[0_18px_46px_rgba(139,26,26,0.65)]'
                      : 'bg-gradient-to-r from-[#E6C15A] via-[#F4D984] to-[#D4A73E] hover:from-[#F2D376] hover:to-[#E2B74B] text-[#0B0B0D] shadow-[0_12px_34px_rgba(226,186,87,0.36)] hover:shadow-[0_18px_46px_rgba(226,186,87,0.55)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`cta-sheen-layer pointer-events-none absolute inset-y-0 w-16 bg-gradient-to-r from-transparent ${
                      countdown.isUrgent ? 'via-white/30' : 'via-white/75'
                    } to-transparent`}
                  />
                  <span className="relative z-10">{lang === 'es' ? 'Postularme ahora' : 'Apply now'}</span>
                  <ArrowRight className="relative z-10 w-4 h-4 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            {/* Tarjeta del Video Promocional solo en vista móvil (< lg), manteniendo el diseño móvil limpio */}
            <div className="lg:hidden mt-4">
              <div className="relative w-full aspect-[16/9] bg-black border border-white/15 rounded-sm overflow-hidden shadow-2xl">
                <button
                  id="casting-video-play-btn"
                  type="button"
                  onClick={() => setVideoPlaying(true)}
                  aria-label={
                    lang === 'es' ? 'Reproducir video promocional del casting' : 'Play casting promo video'
                  }
                  className="group relative w-full h-full block cursor-pointer text-left"
                >
                  <img
                    src={CASTING_VIDEO_POSTER_SRC}
                    alt={
                      lang === 'es'
                        ? 'Video promocional Casting Planet Talent'
                        : 'Planet Talent Casting promo video poster'
                    }
                    className="w-full h-full object-cover object-[50%_58%] transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/15" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
                    <span className="w-12 h-12 rounded-full bg-[#8B1A1A]/95 group-hover:bg-[#721212] border border-white/25 text-white flex items-center justify-center shadow-[0_0_24px_rgba(139,26,26,0.5)] transition-transform duration-200 group-hover:scale-105">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.1em] font-semibold text-white bg-black/75 px-3 py-1 rounded-sm border border-white/15">
                      {lang === 'es' ? 'Ver video del casting' : 'Watch casting video'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 2) REQUISITOS COMPACTOS A LA IZQUIERDA + FLYER AMPLIADO HASTA EL TÍTULO DE LA SECCIÓN */}
        <section className="w-full border-b border-white/10 min-h-[calc(100dvh-2.5rem)] sm:min-h-[calc(100dvh-2.75rem)] flex flex-col justify-center">
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-5 sm:py-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10 items-stretch">
            {/* Columna Izquierda: Título de la sesión + 3 cards compactas sin aire excesivo */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-3.5 sm:gap-6">
              <div className="space-y-1 sm:space-y-1.5">
                <p className="font-['Cormorant_Garamond',serif] uppercase text-xs sm:text-base font-semibold tracking-[0.14em] text-[#E2BA57]">
                  {lang === 'es' ? 'Requisitos y Código de Imagen' : 'Requirements & Dress Code'}
                </p>
                <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
                  {lang === 'es' ? 'Qué debes saber antes de asistir' : 'What you need to know before attending'}
                </h2>
                <p className="text-xs sm:text-base font-normal text-zinc-300 leading-snug sm:leading-normal max-w-xl">
                  {lang === 'es'
                    ? 'Revisa los requisitos esenciales, vestuario obligatorio y maquillaje para tu audición presencial.'
                    : 'Review eligibility requirements, required wardrobe, and makeup guidelines for your audition.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:gap-3">
                {/* 1. Requisitos */}
                <div className="bg-[#141418] border border-white/15 rounded-sm px-3.5 py-2.5 sm:px-5 sm:py-4 space-y-1 sm:space-y-1.5">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E2BA57] shrink-0" />
                    <h3 className="text-xs sm:text-sm uppercase tracking-[0.08em] font-semibold text-white">
                      {lang === 'es' ? '01. Requisitos' : '01. Requirements'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-0.5 text-xs sm:text-sm font-normal text-zinc-100 leading-snug">
                    <span>· {lang === 'es' ? 'Ser mujer' : 'Female'}</span>
                    <span>
                      ·{' '}
                      {lang === 'es'
                        ? '17 años o más (con 17 años asistir con tutor)'
                        : '17+ years old (if 17, attend with guardian)'}
                    </span>
                    <span>· {lang === 'es' ? 'Estatura superior a 1.65 m' : 'Height over 1.65 m'}</span>
                  </div>
                </div>

                {/* 2. Vestuario */}
                <div className="bg-[#141418] border border-white/15 rounded-sm px-3.5 py-2.5 sm:px-5 sm:py-4 space-y-1 sm:space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E2BA57] shrink-0" />
                    <h3 className="text-xs sm:text-sm uppercase tracking-[0.08em] font-semibold text-white">
                      {lang === 'es' ? '02. Vestuario' : '02. Wardrobe'}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm font-normal text-zinc-100 leading-snug">
                    {lang === 'es'
                      ? 'Ropa negra ajustada al cuerpo y tacones (preferiblemente licra negra encima de la rodilla y blusa negra ajustada, sin estampados ni accesorios llamativos).'
                      : 'Fitted black attire and heels (black above-knee leggings and fitted black top, without prints or loud accessories).'}
                  </p>
                </div>

                {/* 3. Maquillaje */}
                <div className="bg-[#141418] border border-white/15 rounded-sm px-3.5 py-2.5 sm:px-5 sm:py-4 space-y-1 sm:space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E2BA57] shrink-0" />
                    <h3 className="text-xs sm:text-sm uppercase tracking-[0.08em] font-semibold text-white">
                      {lang === 'es' ? '03. Maquillaje' : '03. Makeup'}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm font-normal text-zinc-100 leading-snug">
                    {lang === 'es'
                      ? 'Sencillo y natural, priorizando piel limpia y facciones definidas para evaluación en cámara, con cabello limpio y fácil de recoger.'
                      : 'Simple and natural, highlighting clean skin and natural features on camera, with clean hair easy to tie back.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Parte superior del Flyer destacando el visual del Casting */}
            <div className="lg:col-span-5 h-full">
              <div className="bg-[#141418] border border-[#E2BA57]/25 rounded-sm p-2.5 sm:p-3.5 h-full flex flex-col justify-center">
                <div className="w-full h-full bg-black rounded-sm overflow-hidden flex items-center justify-center">
                  <img
                    src={CASTING_FLYER_SRC}
                    alt="Cartel oficial Casting Planet Talent"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain mx-auto"
                  />
                </div>
              </div>
            </div>
            </div>
          </div>
        </section>

        {/* 3) FORMULARIO EN 5 PASOS CON BARRA DE PROGRESO + 4) CONFIRMACIÓN */}
        <section
          id="casting-form-section"
          className="w-full min-h-[calc(100dvh-2.5rem)] sm:min-h-[calc(100dvh-2.75rem)] flex flex-col justify-center"
        >
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-12">
            <div className="mb-4 sm:mb-7 space-y-1 sm:space-y-1.5">
            <p className="font-['Cormorant_Garamond',serif] uppercase text-xs sm:text-base font-semibold tracking-[0.14em] text-[#E2BA57]">
              {lang === 'es' ? 'Inscripción Oficial' : 'Official Registration'}
            </p>
            <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
              {lang === 'es' ? 'Completa tu postulación' : 'Complete your application'}
            </h2>
            <p className="text-xs sm:text-base text-zinc-300 leading-snug sm:leading-normal">
              {lang === 'es'
                ? 'Envía tus datos en 5 pasos para participar en la audición del 28 y 29 de noviembre.'
                : 'Submit your profile in 5 quick steps for the November 28 & 29 audition.'}
            </p>
          </div>
          {!castingActive && !submitted ? (
            <div className="bg-[#141418] border border-white/15 rounded-sm p-8 text-center space-y-4">
              <h2 className="text-2xl font-bold text-white">
                {lang === 'es' ? 'Convocatoria pausada' : 'Casting Call Paused'}
              </h2>
              <p className="text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
                {lang === 'es'
                  ? 'El registro en línea para este casting no se encuentra activo en este momento.'
                  : 'Online registration for this casting is not currently active.'}
              </p>
            </div>
          ) : submitted ? (
            /* 4) PANTALLA DE CONFIRMACIÓN CON BOTÓN AL CANAL DE WHATSAPP */
            <div
              id="casting-confirmation-card"
              className="bg-[#141418] border border-emerald-500/35 rounded-sm p-6 sm:p-10 text-center space-y-6 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-400 font-semibold">
                  {lang === 'es' ? 'Registro Completado' : 'Registration Complete'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {lang === 'es'
                    ? `¡Gracias por postularte, ${nombre}!`
                    : `Thank you for applying, ${nombre}!`}
                </h2>
                <p className="text-sm text-zinc-200 max-w-lg mx-auto leading-relaxed">
                  {lang === 'es'
                    ? 'Tus datos han sido registrados. Para recibir las citaciones y horarios oficiales del casting en Estudio 50, únete ahora a nuestro Canal Oficial de WhatsApp.'
                    : 'Your application has been saved. Join our official WhatsApp Channel below to receive schedules and updates.'}
                </p>
              </div>

              <div className="bg-[#1B1B20] border border-white/15 rounded-sm p-4 max-w-md mx-auto text-left text-xs sm:text-sm space-y-1.5 text-zinc-200">
                <p>
                  <strong className="text-white">{lang === 'es' ? 'Postulante:' : 'Applicant:'}</strong>{' '}
                  {nombre} {apellidos}
                </p>
                <p>
                  <strong className="text-white">{lang === 'es' ? 'Edad / Estatura:' : 'Age / Height:'}</strong>{' '}
                  {calculatedAge} {lang === 'es' ? 'años' : 'yrs'} · {estatura} cm
                </p>
                <p>
                  <strong className="text-white">Instagram:</strong>{' '}
                  {instagram.startsWith('@') ? instagram : `@${instagram}`}
                </p>
                {isSeventeen && (
                  <p className="pt-1 text-[#FCE99F] font-medium border-t border-white/10">
                    {lang === 'es'
                      ? 'Importante: Al tener 17 años, deberás presentarte al casting acompañada de tu tutor.'
                      : 'Important: Since you are 17, you must attend the casting accompanied by your parent/guardian.'}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  id="casting-whatsapp-channel-btn"
                  href={CASTING_WHATSAPP_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm uppercase tracking-[0.12em] font-semibold rounded-sm transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>
                    {lang === 'es' ? 'Unirme al Canal de WhatsApp' : 'Join WhatsApp Channel'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-[#141418] border border-[#E2BA57]/25 rounded-sm p-4 sm:p-8 shadow-2xl">
              {/* Form Header & Progress Bar */}
              <div className="space-y-2.5 sm:space-y-4 mb-4 sm:mb-7">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] sm:text-xs uppercase tracking-[0.14em] text-[#E2BA57] font-semibold">
                      {lang === 'es' ? 'Formulario de Inscripción' : 'Application Form'}
                    </p>
                    <h2 className="text-lg sm:text-2xl font-bold text-white mt-0.5 sm:mt-1">
                      {step === 1 && (lang === 'es' ? 'Datos personales y contacto' : 'Personal & Contact Info')}
                      {step === 2 && (lang === 'es' ? 'Medidas y tallas' : 'Measurements & Sizes')}
                      {step === 3 && (lang === 'es' ? 'Rasgos físicos' : 'Physical Features')}
                      {step === 4 && (lang === 'es' ? 'Piercings y tatuajes' : 'Piercings & Tattoos')}
                      {step === 5 && (lang === 'es' ? 'Fotografías de postulación' : 'Application Photos')}
                    </h2>
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-[#FCE99F] tabular-nums whitespace-nowrap shrink-0 bg-[#E2BA57]/10 border border-[#E2BA57]/35 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-sm">
                    {lang === 'es' ? `Paso ${step} de 5` : `Step ${step} of 5`}
                  </span>
                </div>

                {/* Barra de progreso en dorado */}
                <div
                  className="w-full h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={step}
                  aria-valuemin={1}
                  aria-valuemax={5}
                >
                  <div
                    className="h-full bg-gradient-to-r from-[#B07F24] via-[#E2BA57] to-[#FCE99F] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-3.5 sm:space-y-5" noValidate>
                {/* Campo trampa oculto (honeypot) contra spam */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="pt-website-hp">Sitio web</label>
                  <input
                    id="pt-website-hp"
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* PASO 1 */}
                {step === 1 && (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1 sm:mb-1.5">
                          {lang === 'es' ? 'Nombre *' : 'First Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Ej. Camila"
                          className="w-full h-10 sm:h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1 sm:mb-1.5">
                          {lang === 'es' ? 'Apellidos *' : 'Last Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={apellidos}
                          onChange={(e) => setApellidos(e.target.value)}
                          placeholder="Ej. Pérez García"
                          className="w-full h-10 sm:h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1 sm:mb-1.5">
                          {lang === 'es' ? 'Fecha de nacimiento *' : 'Date of Birth *'}
                        </label>
                        <input
                          id="casting-dob-input"
                          type="date"
                          required
                          value={fechaNacimiento}
                          onChange={(e) => setFechaNacimiento(e.target.value)}
                          className="w-full h-10 sm:h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white focus:outline-none focus:border-[#E2BA57] [color-scheme:dark]"
                        />
                        {calculatedAge !== null && (
                          <p
                            id="casting-dob-feedback"
                            className={`mt-1 text-xs font-medium ${
                              isUnderage
                                ? 'text-[#FF6B6B]'
                                : isSeventeen
                                ? 'text-[#FCE99F]'
                                : 'text-emerald-400'
                            }`}
                          >
                            {lang === 'es'
                              ? `Edad calculada: ${calculatedAge} años`
                              : `Calculated age: ${calculatedAge} years`}
                            {isUnderage &&
                              (lang === 'es'
                                ? ' · Debes tener 17 años o más para postularte.'
                                : ' · Must be 17 or older to apply.')}
                            {isSeventeen &&
                              (lang === 'es'
                                ? ' · Al tener 17 años deberás presentarte con tu tutor.'
                                : ' · At 17, you must attend with your parent/guardian.')}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1 sm:mb-1.5">
                          {lang === 'es' ? 'Ciudad / Municipio *' : 'City *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={ciudad}
                          onChange={(e) => setCiudad(e.target.value)}
                          placeholder="Ej. La Habana"
                          className="w-full h-10 sm:h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1 sm:mb-1.5">
                          WhatsApp *
                        </label>
                        <input
                          type="tel"
                          required
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="+53 5 000 0000"
                          className="w-full h-10 sm:h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1 sm:mb-1.5">
                          {lang === 'es' ? 'Correo electrónico *' : 'Email *'}
                        </label>
                        <input
                          type="email"
                          required
                          value={correo}
                          onChange={(e) => setCorreo(e.target.value)}
                          placeholder="tu@correo.com"
                          className="w-full h-10 sm:h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] sm:text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1 sm:mb-1.5">
                        Instagram *
                      </label>
                      <input
                        id="casting-instagram-input"
                        type="text"
                        required
                        value={instagram}
                        onFocus={() => {
                          if (!instagram) setInstagram('@');
                        }}
                        onBlur={() => {
                          if (instagram.trim() === '@') setInstagram('');
                        }}
                        onChange={(e) => setInstagram(formatInstagramInput(e.target.value))}
                        placeholder="@tu_usuario"
                        className="w-full h-10 sm:h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                      />
                    </div>
                  </div>
                )}

                {/* PASO 2 */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1.5">
                        {lang === 'es' ? 'Estatura (cm) *' : 'Height (cm) *'}
                      </label>
                      <input
                        id="casting-height-input"
                        type="number"
                        min={120}
                        max={220}
                        required
                        value={estatura}
                        onChange={(e) => setEstatura(e.target.value)}
                        placeholder="Ej. 170"
                        className="w-full h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                      />
                      {showHeightWarning && (
                        <div
                          id="casting-height-warning"
                          className="mt-2 p-3 bg-amber-500/10 border border-amber-400/35 rounded-sm flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                          <span>
                            {lang === 'es'
                              ? 'Aviso: La estatura de referencia sugerida para la convocatoria es superior a 165 cm, pero puedes continuar enviando tu postulación.'
                              : 'Note: The preferred height guideline is above 165 cm, though you may still continue submitting your application.'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1.5">
                          {lang === 'es' ? 'Busto (cm) *' : 'Bust (cm) *'}
                        </label>
                        <input
                          type="number"
                          min={50}
                          max={160}
                          required
                          value={busto}
                          onChange={(e) => setBusto(e.target.value)}
                          placeholder="86"
                          className="w-full h-11 px-3 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1.5">
                          {lang === 'es' ? 'Cintura (cm) *' : 'Waist (cm) *'}
                        </label>
                        <input
                          type="number"
                          min={40}
                          max={140}
                          required
                          value={cintura}
                          onChange={(e) => setCintura(e.target.value)}
                          placeholder="62"
                          className="w-full h-11 px-3 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1.5">
                          {lang === 'es' ? 'Caderas (cm) *' : 'Hips (cm) *'}
                        </label>
                        <input
                          type="number"
                          min={50}
                          max={160}
                          required
                          value={caderas}
                          onChange={(e) => setCaderas(e.target.value)}
                          placeholder="90"
                          className="w-full h-11 px-3 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-2">
                          {lang === 'es' ? 'Talla superior *' : 'Top size *'}
                        </label>
                        <div className="grid grid-cols-5 gap-2 w-full">
                          {UPPER_SIZES.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setTallaSuperior(size)}
                              className={`w-full h-11 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                                tallaSuperior === size
                                  ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                  : 'bg-[#0D0D10] border-white/20 text-zinc-200 hover:border-white/40'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-2">
                          {lang === 'es' ? 'Talla inferior *' : 'Bottom size *'}
                        </label>
                        <div className="grid grid-cols-5 gap-2 w-full">
                          {LOWER_SIZES.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setTallaInferior(size)}
                              className={`w-full h-11 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                                tallaInferior === size
                                  ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                  : 'bg-[#0D0D10] border-white/20 text-zinc-200 hover:border-white/40'
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-2">
                        {lang === 'es' ? 'Calzado *' : 'Shoe size *'}
                      </label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 w-full">
                        {SHOE_SIZES.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setCalzado(size)}
                            className={`w-full h-11 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              calzado === size
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#0D0D10] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                      {calzado === 'Otro' && (
                        <input
                          type="text"
                          value={calzadoOtro}
                          onChange={(e) => setCalzadoOtro(e.target.value)}
                          placeholder={lang === 'es' ? 'Especifica tu número de calzado' : 'Specify shoe size'}
                          className="mt-2.5 w-full h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* PASO 3 */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-2">
                        {lang === 'es' ? 'Color de cabello *' : 'Hair Color *'}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                        {HAIR_COLORS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setColorCabello(opt)}
                            className={`w-full h-11 px-3 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              colorCabello === opt
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#0D0D10] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {colorCabello === 'Otro' && (
                        <input
                          type="text"
                          value={colorCabelloOtro}
                          onChange={(e) => setColorCabelloOtro(e.target.value)}
                          placeholder={lang === 'es' ? 'Especifica color de cabello' : 'Specify hair color'}
                          className="mt-2.5 w-full h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-2">
                        {lang === 'es' ? 'Largo de cabello *' : 'Hair Length *'}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                        {HAIR_LENGTHS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setLargoCabello(opt)}
                            className={`w-full h-11 px-3 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              largoCabello === opt
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#0D0D10] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {largoCabello === 'Otro' && (
                        <input
                          type="text"
                          value={largoCabelloOtro}
                          onChange={(e) => setLargoCabelloOtro(e.target.value)}
                          placeholder={lang === 'es' ? 'Especifica largo de cabello' : 'Specify hair length'}
                          className="mt-2.5 w-full h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-2">
                        {lang === 'es' ? 'Color de ojos *' : 'Eye Color *'}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                        {EYE_COLORS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setColorOjos(opt)}
                            className={`w-full h-11 px-3 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              colorOjos === opt
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#0D0D10] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {colorOjos === 'Otro' && (
                        <input
                          type="text"
                          value={colorOjosOtro}
                          onChange={(e) => setColorOjosOtro(e.target.value)}
                          placeholder={lang === 'es' ? 'Especifica color de ojos' : 'Specify eye color'}
                          className="mt-2.5 w-full h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-2">
                        {lang === 'es' ? 'Tono de piel *' : 'Skin Tone *'}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
                        {SKIN_TONES.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setTonoPiel(opt)}
                            className={`w-full h-11 px-3 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              tonoPiel === opt
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#0D0D10] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {tonoPiel === 'Otro' && (
                        <input
                          type="text"
                          value={tonoPielOtro}
                          onChange={(e) => setTonoPielOtro(e.target.value)}
                          placeholder={lang === 'es' ? 'Especifica tono de piel' : 'Specify skin tone'}
                          className="mt-2.5 w-full h-11 px-3.5 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* PASO 4 */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#0D0D10] border border-white/15 rounded-sm p-4">
                        <p className="text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-3">
                          {lang === 'es' ? '¿Tienes piercings? *' : 'Do you have piercings? *'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTienePiercings(true)}
                            className={`h-11 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              tienePiercings === true
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#17171C] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            {lang === 'es' ? 'Sí' : 'Yes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTienePiercings(false)}
                            className={`h-11 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              tienePiercings === false
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#17171C] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#0D0D10] border border-white/15 rounded-sm p-4">
                        <p className="text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-3">
                          {lang === 'es' ? '¿Tienes tatuajes? *' : 'Do you have tattoos? *'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTieneTatuajes(true)}
                            className={`h-11 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              tieneTatuajes === true
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#17171C] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            {lang === 'es' ? 'Sí' : 'Yes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTieneTatuajes(false)}
                            className={`h-11 rounded-sm text-xs font-semibold border transition-colors cursor-pointer ${
                              tieneTatuajes === false
                                ? 'bg-[#E2BA57]/15 border-[#E2BA57] text-[#FCE99F]'
                                : 'bg-[#17171C] border-white/20 text-zinc-200 hover:border-white/40'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>

                    {(tienePiercings === true || tieneTatuajes === true) && (
                      <div id="casting-piercings-detail-field">
                        <label className="block text-xs uppercase tracking-wider text-zinc-200 font-semibold mb-1.5">
                          {lang === 'es'
                            ? 'Especifica lugar y tamaño de tus piercings o tatuajes *'
                            : 'Specify location and size of your piercings or tattoos *'}
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={detallePiercingsTatuajes}
                          onChange={(e) => setDetallePiercingsTatuajes(e.target.value)}
                          placeholder={
                            lang === 'es'
                              ? 'Ej. Tatuaje pequeño en el tobillo derecho / piercing en la oreja'
                              : 'E.g. Small tattoo on right ankle / ear piercing'
                          }
                          className="w-full p-3 bg-[#0D0D10] border border-white/20 rounded-sm text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#E2BA57]"
                        />
                      </div>
                    )}

                  </div>
                )}

                {/* PASO 5: FOTOGRAFÍAS (SECCIÓN DEDICADA) */}
                {step === 5 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#0D0D10] border border-white/15 p-4 rounded-sm flex flex-col justify-between gap-3">
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-[#E2BA57] font-bold mb-1">
                            {lang === 'es'
                              ? '1. Foto de la Cara *'
                              : '1. Face Photo *'}
                          </h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            {lang === 'es'
                              ? 'Primer plano donde se vea bien tu rostro, transmitiendo la mayor actitud de modelo posible.'
                              : 'Clear close-up of your face showing strong model attitude.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3.5 pt-1">
                          {fotoCara ? (
                            <div className="relative w-16 h-20 rounded-sm overflow-hidden border border-white/20 shrink-0 bg-black">
                              <img src={fotoCara} alt="Cara" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  setFotoCara('');
                                  saveCastingPhotoDraft('', fotoCuerpo);
                                }}
                                className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-red-600 text-white rounded-full text-[10px]"
                                title="Eliminar foto"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-16 h-20 rounded-sm border border-dashed border-white/30 flex flex-col items-center justify-center shrink-0 text-zinc-400 bg-white/[0.02]">
                              {uploadingCara ? <Loader2 className="w-5 h-5 animate-spin text-[#E2BA57]" /> : <Camera className="w-5 h-5 opacity-60" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-sm text-xs font-semibold text-white cursor-pointer transition-colors">
                              <span>{uploadingCara ? 'Procesando...' : fotoCara ? 'Cambiar foto' : 'Subir foto de cara'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                required={!fotoCara}
                                onChange={handleCaraChange}
                                className="hidden"
                              />
                            </label>
                            {fotoCara && <p className="text-[10px] text-emerald-400 mt-1.5 font-medium">✓ Foto cargada correctamente</p>}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#0D0D10] border border-white/15 p-4 rounded-sm flex flex-col justify-between gap-3">
                        <div>
                          <h4 className="text-xs uppercase tracking-wider text-[#E2BA57] font-bold mb-1">
                            {lang === 'es'
                              ? '2. Foto de Cuerpo Completo *'
                              : '2. Full-Body Photo *'}
                          </h4>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">
                            {lang === 'es'
                              ? 'Foto de cuerpo entero donde se aprecien claramente tu figura, proporciones y estatura.'
                              : 'Full-length photo clearly showing your silhouette, proportions, and posture.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3.5 pt-1">
                          {fotoCuerpo ? (
                            <div className="relative w-16 h-20 rounded-sm overflow-hidden border border-white/20 shrink-0 bg-black">
                              <img src={fotoCuerpo} alt="Cuerpo" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  setFotoCuerpo('');
                                  saveCastingPhotoDraft(fotoCara, '');
                                }}
                                className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-red-600 text-white rounded-full text-[10px]"
                                title="Eliminar foto"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-16 h-20 rounded-sm border border-dashed border-white/30 flex flex-col items-center justify-center shrink-0 text-zinc-400 bg-white/[0.02]">
                              {uploadingCuerpo ? <Loader2 className="w-5 h-5 animate-spin text-[#E2BA57]" /> : <Shirt className="w-5 h-5 opacity-60" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-sm text-xs font-semibold text-white cursor-pointer transition-colors">
                              <span>{uploadingCuerpo ? 'Procesando...' : fotoCuerpo ? 'Cambiar foto' : 'Subir cuerpo completo'}</span>
                              <input
                                type="file"
                                accept="image/*"
                                required={!fotoCuerpo}
                                onChange={handleCuerpoChange}
                                className="hidden"
                              />
                            </label>
                            {fotoCuerpo && <p className="text-[10px] text-emerald-400 mt-1.5 font-medium">✓ Foto cargada correctamente</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div
                    role="alert"
                    className="p-3.5 bg-red-950/50 border border-red-500/40 rounded-sm text-xs sm:text-sm text-red-200"
                  >
                    {submitError}
                  </div>
                )}

                {/* Navigation Controls */}
                <div className="flex items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-white/10">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitError('');
                        setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4 | 5) : prev));
                      }}
                      className="h-10 sm:h-11 px-5 bg-[#232329] hover:bg-[#2F2F37] border border-white/20 text-white text-xs uppercase tracking-wider font-semibold rounded-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{lang === 'es' ? 'Atrás' : 'Back'}</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 5 ? (
                    <button
                      id="casting-next-step-btn"
                      type="button"
                      onClick={handleNextStep}
                      className="h-10 sm:h-11 px-7 bg-gradient-to-r from-[#E6C15A] via-[#F4D984] to-[#D4A73E] hover:from-[#F2D376] hover:to-[#E2B74B] text-[#0B0B0D] text-xs sm:text-sm uppercase tracking-wider font-bold rounded-sm transition-all cursor-pointer inline-flex items-center gap-2 ml-auto shadow-[0_6px_20px_rgba(226,186,87,0.25)]"
                    >
                      <span>{lang === 'es' ? 'Siguiente' : 'Next'}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  ) : (
                    <button
                      id="casting-submit-btn"
                      type="submit"
                      disabled={submitting}
                      className="h-10 sm:h-11 px-7 bg-gradient-to-r from-[#E6C15A] via-[#F4D984] to-[#D4A73E] hover:from-[#F2D376] hover:to-[#E2B74B] disabled:opacity-60 text-[#0B0B0D] text-xs sm:text-sm uppercase tracking-wider font-bold rounded-sm transition-all cursor-pointer inline-flex items-center gap-2 ml-auto shadow-[0_6px_20px_rgba(226,186,87,0.25)]"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{lang === 'es' ? 'Enviando...' : 'Submitting...'}</span>
                        </>
                      ) : (
                        <span>{lang === 'es' ? 'Enviar postulación' : 'Submit application'}</span>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
          </div>
        </section>
      </main>

      {/* Lightbox del Video Completo */}
      {videoPlaying && (
        <div
          onClick={() => setVideoPlaying(false)}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setVideoPlaying(false)}
            aria-label={lang === 'es' ? 'Cerrar video' : 'Close video'}
            className="fixed top-4 right-4 p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-sm transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl aspect-square max-h-[88dvh] bg-black border border-white/20 rounded-sm overflow-hidden shadow-2xl"
          >
            <video
              src={CASTING_VIDEO_SRC}
              poster={CASTING_VIDEO_POSTER_SRC}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain bg-black"
            />
          </div>
        </div>
      )}

      {/* Footer con sello permanente */}
      <footer className="border-t border-white/10 py-4 sm:py-6 px-4 sm:px-8 text-center">
        <p className="text-[11px] sm:text-xs tracking-[0.06em] sm:tracking-[0.08em] text-zinc-400 max-w-3xl mx-auto leading-relaxed">
          {lang === 'es'
            ? 'La agencia oficial de los videos de Planet Records · Partner de Getty Images, Adobe, Premios Lucas y más'
            : 'Official agency for Planet Records music videos · Partner of Getty Images, Adobe, Premios Lucas & more'}
        </p>
      </footer>

    </div>
  );
};
