import { useEffect, useState } from 'react';

interface SiteHeaderProps {
  logoUrl?: string;
}

const SiteHeader = ({ logoUrl }: SiteHeaderProps) => {
  const defaultLogo = "https://res.cloudinary.com/dokzm0ban/image/upload/v1772811965/Sarkari_Sewayojan_a6lcdm.png";
  const [isThemeBhagwa, setIsThemeBhagwa] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme-mode');
    if (savedTheme === 'bhagwa') {
      document.documentElement.classList.add('theme-bhagwa');
      setIsThemeBhagwa(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isThemeBhagwa) {
      document.documentElement.classList.remove('theme-bhagwa');
      localStorage.setItem('theme-mode', 'default');
      setIsThemeBhagwa(false);
    } else {
      document.documentElement.classList.add('theme-bhagwa');
      localStorage.setItem('theme-mode', 'bhagwa');
      setIsThemeBhagwa(true);
    }
  };
  
  return (
    <div className="site-header bg-background py-8 sticky top-0 z-50 flex items-center relative" style={{ boxShadow: 'var(--box-shadow-medium)' }}>
      {/* Logo - Positioned exactly next to the hamburger menu with a tiny gap */}
      <div className="absolute left-[52px] top-0 bottom-0 h-full flex items-center justify-center">
        <img 
          src={logoUrl || defaultLogo} 
          alt="Sarkari Sewayojan Logo" 
          className="h-full w-auto object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      
      {/* Text Container - Shifted right to prevent overlap with logo */}
      <div className="w-full pl-[160px] md:pl-[240px] pr-3 flex flex-col justify-center text-right md:text-center">
        <h1 className="m-0 text-5xl font-black text-primary tracking-wide uppercase max-sm:text-[24px] sm:max-md:text-3xl">
          SARKARI SEWAYOJAN
        </h1>
        <div className="text-3xl text-primary mt-1 font-medium max-sm:text-[16px] sm:max-md:text-xl">
          www.sarkarisewayojan.com
        </div>
        <div className="text-[10px] text-accent mt-1.5 tracking-[3px] max-sm:tracking-[1px] font-medium max-sm:text-[9px]">
          LATEST GOVERNMENT JOBS, RESULTS & NOTIFICATIONS
        </div>
      </div>

      {/* Theme Switcher Button */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
        <div className="flex bg-background border border-border rounded-lg p-0.5" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}>
          <button 
            onClick={() => {
              if (isThemeBhagwa) toggleTheme();
            }}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-md transition-all duration-200 ${!isThemeBhagwa ? 'bg-[#0B3D91] text-white shadow-sm' : 'text-primary/70 hover:bg-primary/10'}`}
          >
            Navy
          </button>
          <button 
            onClick={() => {
              if (!isThemeBhagwa) toggleTheme();
            }}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-md transition-all duration-200 ${isThemeBhagwa ? 'bg-[#F18D1B] text-white shadow-sm' : 'text-primary/70 hover:bg-primary/10'}`}
          >
            Bhagwa
          </button>
        </div>
      </div>
    </div>
  );
};

export default SiteHeader;
