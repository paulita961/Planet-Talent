import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share, PlusSquare, ExternalLink, Download } from 'lucide-react';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // Detect if the app is already running as standalone (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      return;
    }

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    // Detect In-App WebViews (WhatsApp, Instagram, Facebook, Line, etc.)
    const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line|Twitter|FB_IAB/i.test(ua);
    setIsInAppBrowser(inApp);

    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');

    // Show prompt automatically after 2 seconds if not seen before
    if (!hasSeenPrompt) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Handle Android / Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!hasSeenPrompt) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for manual trigger from footer / menu
    const handleManualTrigger = () => {
      setShowPrompt(true);
    };
    window.addEventListener('open-install-prompt', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('open-install-prompt', handleManualTrigger);
    };
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('hasSeenInstallPrompt', 'true');
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // Fallback for browsers that don't support beforeinstallprompt directly
      alert('Para instalar la aplicación:\n- En Android (Chrome): Toca los tres puntos arriba a la derecha y selecciona "Añadir a la pantalla de inicio".\n- En iPhone (Safari): Toca el botón Compartir y selecciona "Añadir a la pantalla de inicio".');
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 z-[100] md:max-w-md md:left-auto md:right-8 bg-[#0F0F0F] border border-white/15 rounded-xl p-4 shadow-2xl flex flex-col gap-3 text-white backdrop-blur-xl"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#CC0000] flex items-center justify-center font-bold text-white text-lg shadow-md shrink-0">
                PT
              </div>
              <div>
                <h3 className="text-[#F8F6F2] font-semibold text-sm">Instalar Planet Talent</h3>
                <p className="text-[#A0A0A0] text-xs">Añade la app a tu pantalla de inicio como una aplicación nativa.</p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-[#8A8A8A] hover:text-white transition-colors p-1"
              title="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {isInAppBrowser ? (
            <div className="bg-[#CC0000]/10 border border-[#CC0000]/30 rounded-lg p-3 text-xs text-white/90 leading-relaxed">
              <p className="font-semibold text-[#FF4D4D] mb-1 flex items-center gap-1.5">
                <ExternalLink size={14} /> Estás usando un navegador integrado (WhatsApp / Instagram)
              </p>
              <p>
                Los navegadores integrados no permiten instalar aplicaciones. Toca los <strong>tres puntos (⋮)</strong> o el botón de <strong>Compartir</strong> arriba a la derecha y selecciona <strong>"Abrir en Chrome"</strong> o <strong>"Abrir en Safari"</strong> para instalarla.
              </p>
            </div>
          ) : isIOS ? (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-[#E0E0E0] leading-relaxed">
              <p className="font-medium text-white mb-2">Para instalar en tu iPhone / iPad (Safari):</p>
              <ol className="flex flex-col gap-2 text-white/80">
                <li className="flex items-center gap-2">
                  1. Toca el botón de <Share size={15} className="inline text-[#CC0000] shrink-0" /> <strong>Compartir</strong> en la barra inferior de Safari.
                </li>
                <li className="flex items-center gap-2">
                  2. Desplázate y selecciona <PlusSquare size={15} className="inline text-[#CC0000] shrink-0" /> <strong>Añadir a la pantalla de inicio</strong>.
                </li>
              </ol>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-white/70">
                Obtén navegación ultras rápida sin barra de navegador y acceso directo en tu móvil.
              </p>
              <button 
                onClick={handleInstall}
                className="w-full bg-[#CC0000] hover:bg-[#B30000] text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Download size={15} />
                {deferredPrompt ? 'Instalar Aplicación Nativa' : 'Instrucciones de Instalación'}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
