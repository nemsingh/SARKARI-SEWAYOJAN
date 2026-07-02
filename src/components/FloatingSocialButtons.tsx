import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchHomeData } from '@/lib/fetchData';

// Original SVG icons to match the brand colors perfectly
const Icons = {
  whatsapp: (
    <svg viewBox="0 0 16 16" fill="white" className="w-[30px] h-[30px]">
      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.88z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  telegram: (
    <svg viewBox="0 0 24 24" fill="white" className="w-[26px] h-[26px] pr-[3px] pb-[1px]">
      <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
};

export default function FloatingSocialButtons() {
  const [socialLinks, setSocialLinks] = useState<Record<string, { url: string; enabled: boolean }>>({});
  const [isVisible, setIsVisible] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Only load settings if not on the admin page
    if (location.pathname.startsWith('/admin')) {
      return;
    }

    const loadSettings = async () => {
      let settingsData: Record<string, string> = {};

      // 1. Try resolving from pre-fetched initial data (SSR/Static env)
      const w = window as any;
      if (w.__INITIAL_DATA__ && w.__INITIAL_DATA__.settings_flat) {
        settingsData = w.__INITIAL_DATA__.settings_flat;
      } else {
        // 2. Fetch from home data which holds the cached global configuration
        try {
          const homeData = await fetchHomeData();
          if (homeData && homeData.settings_flat) {
            settingsData = homeData.settings_flat;
          }
        } catch (e) {
          console.error("Failed to load siteSettings for social buttons:", e);
        }
      }

      const networks = ['whatsapp', 'instagram', 'youtube', 'telegram', 'facebook', 'linkedin'];
      const compiledLinks: Record<string, { url: string; enabled: boolean }> = {};
      
      networks.forEach(network => {
        const url = settingsData[`social_${network}_url`];
        const rawEnabled = settingsData[`social_${network}_enabled`];
        const enabled = rawEnabled === 'true' || rawEnabled === '1';
        if (url && enabled) {
          compiledLinks[network] = { url, enabled: true };
        }
      });

      setSocialLinks(compiledLinks);
    };

    loadSettings();
  }, [location.pathname]);

  // Scroll event listener for hide on scroll down, show on scroll up
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (currentScrollY > 50) {
            if (currentScrollY > lastScrollY) {
              // Scrolling DOWN (window moves down, user swipes UP)
              setIsVisible(false);
            } else if (currentScrollY < lastScrollY) {
              // Scrolling UP (window moves up, user swipes DOWN)
              // Show buttons
              setIsVisible(true);
            }
          } else {
            // Alway show at the very top
            setIsVisible(true);
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Do not render on admin pages or if no active links
  if (location.pathname.startsWith('/admin') || Object.keys(socialLinks).length === 0) {
    return null;
  }

  const getBackgroundClass = (network: string) => {
    switch (network) {
      case 'whatsapp': return 'bg-[#25D366] hover:bg-[#20b858]';
      case 'instagram': return 'bg-gradient-to-tr from-[#fdf497] via-[#fd5949] to-[#285AEB] hover:brightness-110';
      case 'youtube': return 'bg-[#FF0000] hover:bg-[#cc0000]';
      case 'telegram': return 'bg-[#0088cc] hover:bg-[#0077b5]';
      case 'facebook': return 'bg-[#1877F2] hover:bg-[#166fe5]';
      case 'linkedin': return 'bg-[#0a66c2] hover:bg-[#0957a6]';
      default: return 'bg-gray-800';
    }
  };

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 flex flex-col gap-3 transition-all duration-150 ease-out will-change-transform ${
        isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-90 pointer-events-none'
      }`}
    >
      {Object.entries(socialLinks).map(([network, data]) => (
        <a
          key={network}
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`social-flip-hover ${getBackgroundClass(network)} w-12 h-12 rounded-full flex justify-center items-center text-white shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ring-2 ring-white/20`}
          aria-label={network}
          title={network.charAt(0).toUpperCase() + network.slice(1)}
        >
          {Icons[network as keyof typeof Icons]}
        </a>
      ))}
    </div>
  );
}
