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
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center z-10">
        <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest mb-1 shadow-sm px-1 py-0.5 bg-white/50 backdrop-blur-sm rounded">
          Switch Interface
        </span>
        <button 
          onClick={toggleTheme}
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none shadow-inner ${isThemeBhagwa ? 'bg-[#FF9933]' : 'bg-[#0B3D91]'}`}
          role="switch"
          aria-checked={isThemeBhagwa}
          aria-label="Toggle Theme"
        >
          <span className="sr-only">Toggle Theme</span>
          <span 
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-300 ease-in-out ${isThemeBhagwa ? 'translate-x-5' : 'translate-x-0'}`} 
          />
        </button>
      </div>
    </div>
  );
};

export default SiteHeader;
