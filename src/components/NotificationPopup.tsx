import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, MessageSquare, Megaphone, ArrowRight } from 'lucide-react';
import { fetchHomeData } from '@/lib/fetchData';
import { getCache } from '@/lib/cache';

export default function NotificationPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    enabled: boolean;
    title: string;
    message: string;
    btnText: string;
    url: string;
    type: 'whatsapp' | 'telegram' | 'general';
  } | null>(null);
  const [isMobileDesktop, setIsMobileDesktop] = useState(false);

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/admin-vikaskumar');

  useEffect(() => {
    const checkDeviceMode = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
      const isDesktopModeForced = isTouch && isMobileUA && window.innerWidth >= 900;
      setIsMobileDesktop(isDesktopModeForced);
    };

    checkDeviceMode();
    window.addEventListener('resize', checkDeviceMode);
    return () => window.removeEventListener('resize', checkDeviceMode);
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
      <div className="fixed inset-x-0 top-0 z-[100] flex justify-center pointer-events-none">
        <motion.div
          id="notif-popup-container"
          initial={{ y: -180, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -180, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 140 }}
          className={`pointer-events-auto w-full overflow-hidden rounded-b-2xl border-x border-b bg-white dark:bg-zinc-900 ${themeStyles.border} ${themeStyles.glow} ${
            isMobileDesktop 
              ? 'max-w-[95vw] px-8 pt-6 pb-2.5' 
              : 'max-w-[410px] px-5 pt-4 pb-2'
          }`}
        >
          <div className={`flex items-start ${isMobileDesktop ? 'gap-6' : 'gap-3.5'}`}>
            {/* Pulsing Visual Icon */}
            <div className={`relative flex shrink-0 items-center justify-center rounded-xl ${themeStyles.iconBg} ${themeStyles.iconRing} ${
              isMobileDesktop ? 'h-20 w-20 ring-8' : 'h-10 w-10 ring-4'
            }`}>
              {/* Outer pulsing ring */}
              <span className={`absolute inset-0 rounded-xl animate-ping opacity-20 ring-2 ${isWhatsApp ? 'ring-emerald-500' : isTelegram ? 'ring-sky-500' : 'ring-indigo-500'}`}></span>
              
              {isWhatsApp && <MessageSquare className={isMobileDesktop ? 'h-10 w-10' : 'h-5 w-5'} />}
              {isTelegram && <Megaphone className={isMobileDesktop ? 'h-10 w-10' : 'h-5 w-5'} />}
              {!isWhatsApp && !isTelegram && <Bell className={isMobileDesktop ? 'h-10 w-10' : 'h-5 w-5'} />}
            </div>

            {/* Content Text */}
            <div className="min-w-0 flex-1">
              <h3 className={`font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight leading-snug ${
                isMobileDesktop ? 'text-2xl sm:text-3xl' : 'text-sm'
              }`}>
                {config.title}
              </h3>
              <p className={`font-semibold text-slate-500 dark:text-zinc-400 leading-relaxed ${
                isMobileDesktop ? 'mt-2 text-base sm:text-lg' : 'mt-1 text-xs'
              }`}>
                {config.message}
              </p>
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className={`flex items-center justify-center gap-2.5 border-t border-slate-100 dark:border-zinc-800/80 ${
            isMobileDesktop ? 'mt-4 pt-3.5' : 'mt-3 pt-2.5'
          }`}>
            <button
              onClick={handleClose}
              className={`flex-1 text-center font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/40 transition-all border border-slate-200 dark:border-zinc-800 rounded-lg cursor-pointer ${
                isMobileDesktop ? 'py-3.5 text-base sm:text-lg' : 'py-2 text-xs'
              }`}
            >
              Later
            </button>
            <a
              href={config.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleActionClick}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg font-black tracking-wide transition-all hover:scale-[1.01] active:scale-[0.99] ${themeStyles.btnBg} cursor-pointer text-center ${
                isMobileDesktop ? 'py-3.5 text-base sm:text-lg' : 'py-2 text-xs'
              }`}
            >
              <span>{config.btnText}</span>
              <ArrowRight className={isMobileDesktop ? 'h-4.5 w-4.5' : 'h-3.5 w-3.5'} />
            </a>
          </div>

          {/* Powered by credit line */}
          <div className="text-center mt-1">
            <span className={`font-bold text-slate-400 dark:text-zinc-500 tracking-wide select-none ${
              isMobileDesktop ? 'text-xs sm:text-sm' : 'text-[10px]'
            }`}>
              Powered by - Sarkari Sewayojan
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
