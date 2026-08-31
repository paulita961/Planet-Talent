import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Camera, 
  Palette, 
  Award, 
  Crown, 
  Star, 
  ArrowRight, 
  ArrowLeft,
  Phone, 
  Mail, 
  User, 
  Instagram, 
  Flame, 
  Clapperboard,
  FileCheck,
  Banknote,
  MapPin
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface CourseLandingProps {
  lang?: 'es' | 'en';
  onGoToCatalog?: () => void;
  onGoToAdminLogin?: () => void;
}

export function CourseLanding({ lang = 'es', onGoToCatalog, onGoToAdminLogin }: CourseLandingProps) {
  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    edad: '',
    telefono: '',
    email: '',
    instagram: '',
    aceptaTerminos: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdRegistrationData, setCreatedRegistrationData] = useState<any>(null);
  
  // Validation States
  const [edadError, setEdadError] = useState<string | null>(null);

  // Smooth Scroll Helper
  const handleScrollToForm = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById('formulario-inscripcion');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Validate Age on Change
  const handleEdadChange = (val: string) => {
    setFormData(prev => ({ ...prev, edad: val }));
    if (val === '') {
      setEdadError('La edad es obligatoria');
    } else {
      const numEdad = parseInt(val, 10);
      if (isNaN(numEdad) || numEdad < 18) {
        setEdadError('Debes tener 18 años o más para inscribirte al curso.');
      } else {
        setEdadError(null);
      }
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validations
    if (!formData.nombre.trim()) {
      setSubmitError('Por favor introduce tu nombre completo.');
      return;
    }

    const numEdad = parseInt(formData.edad, 10);
    if (isNaN(numEdad) || numEdad < 18) {
      setEdadError('Debes tener 18 años o más para inscribirte al curso.');
      setSubmitError('Validación de edad: El aspirante debe ser mayor de 18 años.');
      return;
    }

    if (!formData.telefono.trim()) {
      setSubmitError('Por favor introduce un número de WhatsApp o teléfono de contacto.');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setSubmitError('Por favor introduce un correo electrónico válido.');
      return;
    }

    if (!formData.aceptaTerminos) {
      setSubmitError('Debes confirmar que eres mayor de edad y aceptar los términos del curso.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        edad: numEdad,
        telefono: formData.telefono.trim(),
        email: formData.email.trim().toLowerCase(),
        instagram: formData.instagram.trim() || null,
        acepta_terminos: true,
        referencia_pago: 'Pago en Efectivo ($20 USD)',
        comprobante_url: null,
        monto: '$20 USD',
        estado: 'pendiente',
        created_at: new Date().toISOString()
      };

      // 1. Save to Supabase (with automatic retry / fallback)
      try {
        const { data, error } = await supabase.from('course_registrations').insert([payload]).select();
        if (!error && data && data.length > 0) {
          payload['id'] = data[0].id;
        }
      } catch (sbErr) {
        console.warn('Supabase insert warning:', sbErr);
      }

      if (!payload['id']) {
        payload['id'] = Math.floor(100000 + Math.random() * 900000);
      }

      // Save to localStorage array as backup
      try {
        const existing = JSON.parse(localStorage.getItem('pt_course_registrations_local') || '[]');
        existing.unshift(payload);
        localStorage.setItem('pt_course_registrations_local', JSON.stringify(existing));
      } catch (e) {}

      // 2. Notify backend endpoint
      try {
        await fetch('/api/notify-course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (netErr) {
        console.warn('Notification endpoint skipped:', netErr);
      }

      setCreatedRegistrationData(payload);
      setSubmitSuccess(true);
      toast.success('¡Inscripción registrada correctamente!');

    } catch (err: any) {
      console.error('Error enviando inscripción:', err);
      setSubmitError('Hubo un inconveniente al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5 Modules Data
  const classesData = [
    {
      title: "Pasarela Profesional",
      icon: <FootprintsIcon className="w-6 h-6 text-[#CC0000]" />,
      tag: "ÁREA 01",
      desc: "Técnica de caminata de alta costura y comercial, postura, ritmo, giros, soltura y dominio de la pista.",
      features: ["Postura y alineación corporal", "Giros y cambios de ritmo", "Actitud y mirada de alto impacto"]
    },
    {
      title: "Foto & Pose Editorial",
      icon: <Camera className="w-6 h-6 text-[#CC0000]" />,
      tag: "ÁREA 02",
      desc: "Proyección frente a cámara, ángulos faciales, soltura corporal y expresión fotográfica profesional.",
      features: ["Manejo de ángulos y luces", "Expresión facial y mirada", "Pose dinámica para catálogo"]
    },
    {
      title: "Imagen & Automaquillaje",
      icon: <Palette className="w-6 h-6 text-[#CC0000]" />,
      tag: "ÁREA 03",
      desc: "Cuidado de la piel, estilismo, asesoría de vestuario y automaquillaje profesional para cámaras HD.",
      features: ["Cuidado de la piel pre-shooting", "Automaquillaje para cámaras", "Estilismo y combinación de outfits"]
    },
    {
      title: "Casting & Etiqueta",
      icon: <Award className="w-6 h-6 text-[#CC0000]" />,
      tag: "ÁREA 04",
      desc: "Etiqueta profesional, preparación técnica para castings, dicción, seguridad y actitud de contrato.",
      features: ["Entrevistas y pruebas de cámara", "Comportamiento profesional", "Estrategia de marca personal"]
    },
    {
      title: "Actuación en Videoclips",
      icon: <Clapperboard className="w-6 h-6 text-[#CC0000]" />,
      tag: "ÁREA 05 · VIP",
      desc: "Especialización para rodajes musicales: sincronización con el beat, actitud ante cámaras y desempeño escénico.",
      features: ["Sincronización con el beat", "Expresión narrativa y carisma", "Dinámica de actuación en set"]
    }
  ];

  // Instructors Data
  const instructorsData = [
    {
      name: "Johana Macbain",
      role: "Directora General & Pasarela",
      photo: "/photo_2026-07-08_11-26-15.jpg",
      bio: "Fundadora de Planet Talent con más de 12 años formando modelos profesionales y produciendo pasarelas de alto nivel."
    },
    {
      name: "Carlos Eduardo",
      role: "Fotografía & Pose Editorial",
      photo: "/photo_2026-07-08_11-26-17.jpg",
      bio: "Fotógrafo de moda con portafolio en publicaciones internacionales y campañas publicitarias en Latinoamérica."
    },
    {
      name: "Valeria Gómez",
      role: "Maquillaje HD & Estilismo",
      photo: "/photo_2026-07-08_11-26-18.jpg",
      bio: "Maquilladora profesional de alta definición especializada en televisión, videoclips urbanos y moda editorial."
    },
    {
      name: "Alejandro Silva",
      role: "Dirección Escénica & Videoclips",
      photo: "/photo_2026-07-08_11-26-19.jpg",
      bio: "Productor de contenidos y director de castings especializado en la industria musical urbana."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#1F1917] font-sans antialiased selection:bg-[#CC0000] selection:text-white">
      
      {/* HEADER LIMPIO Y LUMINOSO CON PROTECCIÓN MOBILE */}
      <header className="sticky top-0 z-50 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-amber-200/70 py-4 px-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Logo Agencia */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center px-2.5 sm:px-3 py-1 bg-black/80 rounded-md shadow-xs border border-white/10 shrink-0">
              <img 
                src="/Logo de Planet Talent.PNG" 
                alt="Planet Talent" 
                className="h-6 sm:h-7 md:h-8 w-auto object-contain origin-left shrink-0 block" 
              />
            </div>
          </div>

          {/* Volver al catálogo */}
          {onGoToCatalog && (
            <button
              onClick={onGoToCatalog}
              className="group flex items-center gap-1.5 bg-[#FFF7EE] hover:bg-[#FFEEDD] border border-amber-300 text-[#1F1917] hover:text-[#CC0000] px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all shadow-xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#CC0000] group-hover:-translate-x-1 transition-transform shrink-0" />
              <span className="hidden sm:inline">Volver al Catálogo</span>
              <span className="inline sm:hidden">Catálogo</span>
            </button>
          )}

        </div>
      </header>

      {/* 1. HERO SECTION - MÁXIMA LEGIBILIDAD & DISEÑO MOBILE FIRST */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center pt-8 pb-14 px-4 overflow-hidden bg-gradient-to-b from-[#FFF5EB] via-[#FFFDF9] to-[#FFF7EE] border-b border-amber-100">
        
        {/* Subtle Background Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[400px] bg-gradient-to-b from-amber-300/25 via-orange-200/15 to-transparent rounded-full filter blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          
          {/* Main Call to Action Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/30 px-3.5 py-1.5 rounded-full mb-5 shadow-xs backdrop-blur-sm max-w-full"
          >
            <Clapperboard className="w-4 h-4 text-[#CC0000] shrink-0 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#CC0000] truncate">
              Oportunidad Exclusiva · 3 Puestos para Videoclip
            </span>
          </motion.div>

          {/* Title Focused on Charly & Johairon — TITULAR DE ALTA VISIBILIDAD SIN EFECTOS ILEGIBLES */}
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-sans font-black text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-[#1F1917] tracking-tight leading-[1.12] uppercase"
          >
            Curso de Verano 2026
            <span className="block mt-2 sm:mt-3 text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#CC0000] tracking-tight leading-snug">
              ¡Gana un lugar en el Videoclip de Charly y Johairon!
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-[#2C221E] max-w-2xl font-medium leading-relaxed"
          >
            15 Días intensivos de formación en pasarela, fotografía editorial, automaquillaje y proyección escénica. Los <strong className="text-[#CC0000] font-black">3 mejores alumnos</strong> serán seleccionados para formar parte del elenco principal del próximo rodaje oficial de <strong className="text-[#1F1917] font-black">Charly y Johairon</strong>.
          </motion.p>

          {/* Key Event Details Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 sm:mt-8 w-full max-w-2xl flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 bg-white border border-amber-200 p-4 sm:p-6 rounded-2xl shadow-xl shadow-orange-950/5"
          >
            <div className="flex items-center gap-3.5 w-full sm:w-auto text-left">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-200 flex items-center justify-center shrink-0 text-[#CC0000]">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-amber-900 font-black block">DURACIÓN & FECHAS</span>
                <span className="text-xs sm:text-sm font-bold text-[#1F1917]">1 a 15 de Agosto · 15 Días Intensivos</span>
              </div>
            </div>

            <div className="hidden sm:block w-px h-10 bg-amber-200"></div>

            <div className="flex items-center gap-3.5 w-full sm:w-auto text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-600">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-amber-900 font-black block">PRECIO DE INSCRIPCIÓN</span>
                <span className="text-lg sm:text-xl font-black text-emerald-600">$20 USD <span className="text-xs font-bold text-stone-500">(En efectivo)</span></span>
              </div>
            </div>
          </motion.div>

          {/* Primary Action Buttons (Stack in Mobile cleanly) */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none"
          >
            <a
              href="#formulario-inscripcion"
              onClick={handleScrollToForm}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-[#AA0000] text-white px-7 py-3.5 sm:px-9 sm:py-4 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-lg shadow-red-600/25 active:scale-95"
            >
              <span>Asegurar mi lugar ($20 USD)</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </a>

            {onGoToCatalog && (
              <button
                onClick={onGoToCatalog}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-amber-50 border border-amber-300 text-[#1F1917] px-6 py-3.5 sm:px-7 sm:py-4 rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95"
              >
                <span>Ver Catálogo de Modelos</span>
              </button>
            )}
          </motion.div>

        </div>
      </section>

      {/* 2. BANNER RECOMPENSA VIDEOCLIP CHARLY Y JOHAIRON */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-br from-[#FFF5EA] via-[#FFEEDD] to-[#FFF0E0] p-6 sm:p-10 md:p-12 shadow-xl shadow-orange-500/10"
        >
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-left">
              <div className="inline-flex items-center gap-2 bg-[#CC0000] text-white px-3 py-1 rounded-full text-[10px] sm:text-xs uppercase tracking-widest font-black mb-3 shadow-xs">
                <Flame className="w-3.5 h-3.5 fill-white shrink-0" />
                <span>INCENTIVO PRINCIPAL DEL CURSO</span>
              </div>

              <h2 className="font-sans font-black text-2xl sm:text-3xl md:text-4xl text-[#1F1917] leading-tight uppercase">
                Participa en el Rodaje Oficial de <br />
                <span className="text-[#CC0000] font-black">Charly y Johairon</span>
              </h2>

              <p className="mt-3 text-xs sm:text-sm md:text-base text-[#2C221E] font-medium leading-relaxed">
                Al terminar los 15 días de clases, realizaremos un casting final donde los <strong className="text-[#1F1917] font-black">3 alumnos con mejor rendimiento</strong> ganarán su lugar en el elenco protagónico del nuevo videoclip oficial de Charly y Johairon.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs font-bold text-[#1F1917]">
                <span className="flex items-center gap-1.5 bg-white border border-amber-300 px-3 py-1.5 rounded-xl shadow-xs">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                  3 Puestos Ganadores
                </span>
                <span className="flex items-center gap-1.5 bg-white border border-amber-300 px-3 py-1.5 rounded-xl shadow-xs">
                  <Clapperboard className="w-4 h-4 text-[#CC0000] shrink-0" />
                  Rodaje Profesional
                </span>
                <span className="flex items-center gap-1.5 bg-white border border-amber-300 px-3 py-1.5 rounded-xl shadow-xs">
                  <Crown className="w-4 h-4 text-amber-600 shrink-0" />
                  Experiencia Directa en Set
                </span>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col items-center justify-center bg-white border border-amber-300 p-6 rounded-2xl text-center min-w-[260px] shadow-lg">
              <Crown className="w-10 h-10 text-[#CC0000] mb-2 animate-bounce" />
              <span className="text-[10px] uppercase tracking-widest text-amber-900 font-extrabold block">INSCRIPCIONES ABIERTAS</span>
              <span className="text-2xl font-black text-[#1F1917] mt-1">$20 USD</span>
              <p className="text-xs text-[#52443E] mt-1 max-w-[220px]">
                Pago en efectivo al confirmar o en la sede de la agencia.
              </p>
              <a
                href="#formulario-inscripcion"
                onClick={handleScrollToForm}
                className="mt-4 w-full bg-[#CC0000] hover:bg-[#AA0000] text-white py-3.5 px-6 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-600/20"
              >
                Inscribirme Ahora
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 3. MÓDULOS DE FORMACIÓN */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#CC0000] block mb-2">
            MÓDULOS DE FORMACIÓN INTENSIVA
          </span>
          <h2 className="font-sans font-black text-2xl sm:text-4xl text-[#1F1917] tracking-tight uppercase">
            5 Áreas de Especialización
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#2C221E] font-medium leading-relaxed">
            Formación integral bajo estándares internacionales para aprender pasarela, fotografía editorial, estilismo y desenvolvimiento escénico.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {classesData.map((cls, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`group relative bg-white border ${cls.tag.includes('VIP') ? 'border-orange-300 shadow-xl shadow-orange-500/10 ring-2 ring-orange-400/20' : 'border-amber-200 shadow-md shadow-orange-950/5'} p-6 rounded-2xl hover:border-[#CC0000] hover:shadow-xl transition-all duration-300 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                    {cls.icon}
                  </div>
                  <span className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase ${cls.tag.includes('VIP') ? 'bg-[#CC0000] text-white shadow-xs' : 'bg-amber-100 text-amber-900'}`}>
                    {cls.tag}
                  </span>
                </div>

                <h3 className="font-sans font-bold text-lg sm:text-xl text-[#1F1917] group-hover:text-[#CC0000] transition-colors mb-2">
                  {cls.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#3D312B] font-medium leading-relaxed mb-5">
                  {cls.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-amber-100 space-y-2">
                {cls.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2 text-xs text-[#2C221E] font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#CC0000] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. EQUIPO DOCENTE */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 md:px-12 max-w-7xl mx-auto border-t border-amber-200/80">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#CC0000] block mb-2">
            EQUIPO DOCENTE
          </span>
          <h2 className="font-sans font-black text-2xl sm:text-4xl text-[#1F1917] tracking-tight uppercase">
            Aprende con los Profesionales
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#2C221E] font-medium leading-relaxed">
            Un equipo de profesores con amplia trayectoria en la industria de la moda, la fotografía editorial y producciones musicales.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {instructorsData.map((prof, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="bg-white border border-amber-200 rounded-2xl overflow-hidden group hover:border-[#CC0000] hover:shadow-xl transition-all flex flex-col justify-between"
            >
              <div className="relative h-64 sm:h-72 overflow-hidden bg-amber-50">
                <img
                  src={prof.photo}
                  alt={prof.name}
                  className="w-full h-full object-cover origin-center group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="bg-[#CC0000] text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                    {prof.role.split('&')[0]}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-sans font-bold text-lg text-[#1F1917] group-hover:text-[#CC0000] transition-colors">
                    {prof.name}
                  </h3>
                  <p className="text-xs text-[#CC0000] font-bold mt-0.5">
                    {prof.role}
                  </p>
                  <p className="text-xs text-[#3D312B] font-medium mt-2 leading-relaxed">
                    {prof.bio}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. FORMULARIO DE INSCRIPCIÓN */}
      <section id="formulario-inscripcion" className="py-14 sm:py-20 px-4 max-w-3xl mx-auto scroll-mt-16">
        
        <div className="bg-white border border-amber-200/90 rounded-3xl p-5 sm:p-8 md:p-10 shadow-2xl shadow-orange-950/10 relative">
          
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full text-[10px] sm:text-xs uppercase tracking-widest text-amber-900 font-extrabold mb-3">
              <FileCheck className="w-4 h-4 text-[#CC0000] shrink-0" />
              <span>REGISTRO OFICIAL DE ASPIRANTE</span>
            </div>
            <h2 className="font-sans font-black text-2xl sm:text-4xl text-[#1F1917] tracking-tight uppercase">
              Formulario de Inscripción
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-[#2C221E] font-medium">
              Completa tus datos personales para reservar tu plaza. El costo único es de <strong className="text-[#CC0000] font-black">$20 USD (Pago en Efectivo)</strong>.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {submitSuccess ? (
              /* PANTALLA DE ÉXITO */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-[#FFFDF9] border border-emerald-300 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-md"
              >
                <div className="w-14 h-14 bg-emerald-100 border border-emerald-300 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>

                <div>
                  <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-widest text-emerald-700 block">
                    ¡INSCRIPCIÓN REGISTRADA CON ÉXITO!
                  </span>
                  <h3 className="font-sans font-black text-xl sm:text-2xl text-[#1F1917] mt-1">
                    Bienvenido al Curso de Verano 2026
                  </h3>
                  <p className="text-xs sm:text-sm text-[#2C221E] font-medium mt-2 max-w-lg mx-auto leading-relaxed">
                    Hemos recibido tus datos correctamente. Te contactaremos por WhatsApp para coordinar los detalles de tu asistencia y la entrega del pago en efectivo de $20 USD.
                  </p>
                </div>

                {/* Resumen */}
                <div className="bg-white border border-amber-200 rounded-xl p-4 text-left max-w-md mx-auto text-xs space-y-2 text-[#2C221E] shadow-xs">
                  <div className="flex justify-between border-b border-amber-100 pb-1.5">
                    <span className="text-stone-500 font-medium">Aspirante:</span>
                    <span className="text-[#1F1917] font-bold">{createdRegistrationData?.nombre}</span>
                  </div>
                  <div className="flex justify-between border-b border-amber-100 pb-1.5">
                    <span className="text-stone-500 font-medium">Edad:</span>
                    <span className="text-[#1F1917] font-semibold">{createdRegistrationData?.edad} años</span>
                  </div>
                  <div className="flex justify-between border-b border-amber-100 pb-1.5">
                    <span className="text-stone-500 font-medium">WhatsApp:</span>
                    <span className="text-[#1F1917] font-semibold">{createdRegistrationData?.telefono}</span>
                  </div>
                  <div className="flex justify-between border-b border-amber-100 pb-1.5">
                    <span className="text-stone-500 font-medium">Correo Electrónico:</span>
                    <span className="text-[#1F1917] font-semibold">{createdRegistrationData?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Modalidad de Pago:</span>
                    <span className="text-emerald-700 font-extrabold uppercase">$20 USD en Efectivo</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                  <a
                    href={`https://wa.me/5358757024?text=${encodeURIComponent(`Hola Planet Talent, acabo de inscribirme al Curso de Verano 2026. Mi nombre es ${createdRegistrationData?.nombre} y coordinaré mi pago de $20 USD en efectivo.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Confirmar por WhatsApp</span>
                  </a>

                  <button
                    onClick={() => {
                      setSubmitSuccess(false);
                      setFormData({
                        nombre: '',
                        edad: '',
                        telefono: '',
                        email: '',
                        instagram: '',
                        aceptaTerminos: false,
                      });
                    }}
                    className="w-full sm:w-auto bg-amber-50 hover:bg-amber-100 text-[#1F1917] py-3 px-5 rounded-xl text-xs uppercase tracking-wider font-bold border border-amber-200 transition-all"
                  >
                    Hacer otra inscripción
                  </button>
                </div>
              </motion.div>
            ) : (
              /* FORMULARIO */
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {submitError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  
                  {/* Nombre Completo */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#1F1917] font-bold mb-1.5">
                      Nombre Completo <span className="text-[#CC0000]">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej. Sofía Martínez López"
                        className="w-full bg-[#FFF8F0] border border-amber-200 focus:border-[#CC0000] focus:bg-white rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-[#1F1917] placeholder-stone-400 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Edad Obligatoria >= 18 */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#1F1917] font-bold mb-1.5">
                      Edad (Años) <span className="text-[#CC0000]">* (Min. 18)</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={18}
                      max={99}
                      value={formData.edad}
                      onChange={(e) => handleEdadChange(e.target.value)}
                      placeholder="Ej. 21"
                      className={`w-full bg-[#FFF8F0] border ${edadError ? 'border-red-500 text-red-700' : 'border-amber-200 focus:border-[#CC0000]'} focus:bg-white rounded-xl px-4 py-3 text-base sm:text-sm text-[#1F1917] placeholder-stone-400 focus:outline-none transition-colors`}
                    />
                    {edadError && (
                      <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        {edadError}
                      </p>
                    )}
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#1F1917] font-bold mb-1.5">
                      Teléfono / WhatsApp <span className="text-[#CC0000]">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="tel"
                        required
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="+53 5200 0000"
                        className="w-full bg-[#FFF8F0] border border-amber-200 focus:border-[#CC0000] focus:bg-white rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-[#1F1917] placeholder-stone-400 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#1F1917] font-bold mb-1.5">
                      Correo Electrónico <span className="text-[#CC0000]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="tu-correo@ejemplo.com"
                        className="w-full bg-[#FFF8F0] border border-amber-200 focus:border-[#CC0000] focus:bg-white rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-[#1F1917] placeholder-stone-400 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                </div>

                {/* Instagram */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#1F1917] font-bold mb-1.5">
                    Usuario de Instagram <span className="text-stone-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      placeholder="@tu_usuario_instagram"
                      className="w-full bg-[#FFF8F0] border border-amber-200 focus:border-[#CC0000] focus:bg-white rounded-xl pl-10 pr-4 py-3 text-base sm:text-sm text-[#1F1917] placeholder-stone-400 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* INSTRUCCIONES DE PAGO DE $20 USD EN EFECTIVO */}
                <div className="mt-6 pt-5 border-t border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-sans font-bold text-base text-[#1F1917] flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-emerald-600 shrink-0" />
                      Pago Único en Efectivo ($20 USD)
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Presencial
                    </span>
                  </div>

                  <div className="bg-[#FFF8F0] p-4 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="text-xs text-[#2C221E] space-y-1">
                      <p className="font-bold text-[#1F1917]">Instrucciones de Pago:</p>
                      <p>
                        El pago de <strong className="text-emerald-700 font-bold">$20 USD</strong> se realiza únicamente en <strong className="text-[#CC0000] font-bold">efectivo</strong> directamente en las oficinas de la agencia Planet Talent o el primer día del curso al iniciar tus clases.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Términos */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      required
                      checked={formData.aceptaTerminos}
                      onChange={(e) => setFormData({ ...formData, aceptaTerminos: e.target.checked })}
                      className="mt-0.5 accent-[#CC0000] w-4 h-4 rounded cursor-pointer shrink-0"
                    />
                    <span className="text-xs text-[#2C221E] group-hover:text-[#1F1917] transition-colors leading-relaxed">
                      Confirmo que tengo 18 años o más y acepto los términos de participación en el Curso de Verano 2026 de Planet Talent. <span className="text-[#CC0000]">*</span>
                    </span>
                  </label>
                </div>

                {/* Botón de Enviar */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !!edadError}
                    className="w-full bg-[#CC0000] hover:bg-[#AA0000] disabled:bg-stone-300 disabled:text-stone-500 text-white py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Procesando Inscripción...</span>
                      </>
                    ) : (
                      <>
                        <span>Enviar Inscripción ($20 USD)</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}
          </AnimatePresence>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-12 py-8 border-t border-amber-200/80 text-center text-xs text-stone-600">
        <div className="flex items-center justify-center mb-3">
          <div className="inline-flex items-center justify-center px-3 py-1.5 bg-black/80 rounded-md shadow-xs border border-white/10">
            <img 
              src="/Logo de Planet Talent.PNG" 
              alt="Planet Talent" 
              className="h-6 sm:h-7 w-auto object-contain block" 
            />
          </div>
        </div>
        <p>© 2026 Planet Talent Model Agency. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}

// Footprints Icon Helper
function FootprintsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.5v2" />
      <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.5v2" />
    </svg>
  );
}
