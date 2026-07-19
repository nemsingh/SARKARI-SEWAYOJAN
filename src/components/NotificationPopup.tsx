import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, MessageSquare, Megaphone, ArrowRight } from 'lucide-react';
import { fetchHomeData } from '@/lib/fetchData';
import { getCache } from '@/lib/cache';

export default function NotificationPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileDesktopMode, setIsMobileDesktopMode] = useState(false);
  const [config, setConfig] = useState<{
    enabled: boolean;
    title: string;
    message: string;
    btnText: string;
    url: string;
    type: 'whatsapp' | 'telegram' | 'general';
  } | null>(null);

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/admin-vikaskumar');

  useEffect(() => {
    const checkMobileDesktop = () => {
      const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      const isTouch = !!hasTouch;
      const ua = navigator.userAgent.toLowerCase();
      const isMobileOS = /iphone|ipad|ipod|android|blackberry|iemobile|opera mini/i.test(ua);
      const isMacTouch = /macintosh/i.test(ua) && isTouch; // iPad / Safari desktop mode spoofing

      if (isTouch) {
        // If they requested "Desktop Site" on mobile, the viewport width is typically between 768px and 1024px.
        const isDesktopSiteViewport = window.innerWidth >= 768 && window.innerWidth <= 1024;
        setIsMobileDesktopMode(isDesktopSiteViewport && (isMobileOS || isMacTouch || isTouch));
      } else {
        setIsMobileDesktopMode(false);
      }
    };

    checkMobileDesktop();
    window.addEventListener('resize', checkMobileDesktop);
    return () => window.removeEventListener('resize', checkMobileDesktop);
  }, []);

  useEffect(() => {
    // If we are in the admin dashboard, do not display the notification popup
    if (isAdminRoute) {
      setIsOpen(false);
      return;
    }

    const loadSettings = async () => {
      try {
        // Try getting cached settings first for instantaneous loading
        let settings = getCache<Record<string, string>>('settings_flat');
        
        // Fetch fresh if cache is not ready
        if (!settings) {
          const homeData = await fetchHomeData();
          settings = homeData?.settings_flat || {};
        }

        if (settings) {
          const enabled = settings.popup_notification_enabled === 'true';
          const title = settings.popup_notification_title || 'Join Our WhatsApp Channel';
          const message = settings.popup_notification_message || 'Get real-time job alerts and results delivered directly to your mobile phone!';
          const btnText = settings.popup_notification_btn_text || 'Join Channel';
          const url = settings.popup_notification_url || '';
          const type = (settings.popup_notification_type || 'whatsapp') as 'whatsapp' | 'telegram' | 'general';

          const newConfig = { enabled, title, message, btnText, url, type };
          setConfig(newConfig);

          if (enabled && url) {
            // Check if this specific notification content was already dismissed
            const uniqueKey = `${title}_${message}`;
            const dismissedContent = localStorage.getItem('dismissed_notification_content');
            
            if (dismissedContent !== uniqueKey) {
              // Wait a tiny split-second for page entry to feel super premium
              const timer = setTimeout(() => {
                setIsOpen(true);
              }, 600);
              return () => clearTimeout(timer);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load popup notification settings', err);
      }
    };

    loadSettings();
  }, [location.pathname, isAdminRoute]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleActionClick = () => {
    if (config) {
      const uniqueKey = `${config.title}_${config.message}`;
      // Only persist dismissal permanently if they actually click the action button
      localStorage.setItem('dismissed_notification_content', uniqueKey);
    }
    setIsOpen(false);
  };

  if (!isOpen || !config || isAdminRoute) return null;

  // Custom colors/styling depending on theme type
  const isWhatsApp = config.type === 'whatsapp';
  const isTelegram = config.type === 'telegram';

  let themeStyles = {
    border: 'border-slate-200/80 dark:border-zinc-800',
    glow: 'shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
    iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    iconRing: 'ring-emerald-400/20',
    btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20',
    brandIcon: 'MessageSquare',
  };

  if (isTelegram) {
    themeStyles = {
      border: 'border-slate-200/80 dark:border-zinc-800',
      glow: 'shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
      iconBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
      iconRing: 'ring-sky-400/20',
      btnBg: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20',
      brandIcon: 'Megaphone',
    };
  } else if (config.type === 'general') {
    themeStyles = {
      border: 'border-slate-200/80 dark:border-zinc-800',
      glow: 'shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
      iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
      iconRing: 'ring-indigo-400/20',
      btnBg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20',
      brandIcon: 'Bell',
    };
  }

  return (
    <AnimatePresence>
      <div className={isMobileDesktopMode ? "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 pointer-events-none backdrop-blur-xs" : "fixed inset-x-0 top-0 z-[100] flex justify-center pointer-events-none"}>
        <motion.div
          id="notif-popup-container"
          initial={isMobileDesktopMode ? { scale: 0.92, opacity: 0 } : { y: -180, opacity: 0 }}
          animate={isMobileDesktopMode ? { scale: 1, opacity: 1 } : { y: 0, opacity: 1 }}
          exit={isMobileDesktopMode ? { scale: 0.92, opacity: 0 } : { y: -180, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 140 }}
          className={`pointer-events-auto w-full ${isMobileDesktopMode ? 'w-[94%] max-w-[880px] rounded-2xl border px-6 py-4' : 'max-w-[410px] rounded-b-xl border-x border-b px-5 pt-4 pb-2'} overflow-hidden bg-white dark:bg-zinc-900 ${themeStyles.border} ${themeStyles.glow}`}
        >
          <div className="flex items-start gap-3.5">
            {/* Pulsing Visual Icon */}
            <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${themeStyles.iconBg} ring-4 ${themeStyles.iconRing}`}>
              {/* Outer pulsing ring */}
              <span className={`absolute inset-0 rounded-xl animate-ping opacity-20 ring-2 ${isWhatsApp ? 'ring-emerald-500' : isTelegram ? 'ring-sky-500' : 'ring-indigo-500'}`}></span>
              
              {isWhatsApp && <MessageSquare className="h-5 w-5" />}
              {isTelegram && <Megaphone className="h-5 w-5" />}
              {!isWhatsApp && !isTelegram && <Bell className="h-5 w-5" />}
            </div>

            {/* Content Text */}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-snug">
                {config.title}
              </h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-zinc-400 leading-relaxed">
                {config.message}
              </p>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="mt-3 flex items-center justify-center gap-2.5 border-t border-slate-100 dark:border-zinc-800/80 pt-2.5">
            <button
              onClick={handleClose}
              className="flex-1 text-center py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/40 transition-all border border-slate-200 dark:border-zinc-800 rounded-lg cursor-pointer"
            >
              Later
            </button>
            <a
              href={config.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleActionClick}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] ${themeStyles.btnBg} cursor-pointer text-center`}
            >
              <span>{config.btnText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Powered by credit line */}
          <div className="text-center mt-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 tracking-wide select-none">
              Powered by - Sarkari Sewayojan
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
