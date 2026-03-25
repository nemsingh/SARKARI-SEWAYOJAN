interface SiteHeaderProps {
  logoUrl?: string;
}

const SiteHeader = ({ logoUrl }: SiteHeaderProps) => {
  const defaultLogo = "https://res.cloudinary.com/dokzm0ban/image/upload/v1772811965/Sarkari_Sewayojan_a6lcdm.png";
  
  return (
    <div className="bg-background py-8 sticky top-0 z-50 flex items-center relative" style={{ boxShadow: 'var(--box-shadow-medium)' }}>
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
        <h1 className="m-0 text-5xl font-black text-primary tracking-wide uppercase max-sm:text-[20px] sm:max-md:text-3xl">
          SARKARI SEWAYOJAN
        </h1>
        <div className="text-3xl text-primary mt-1 font-medium max-sm:text-[14px] sm:max-md:text-xl">
          www.sarkarisewayojan.com
        </div>
        <div className="text-[10px] text-accent mt-1.5 tracking-[3px] max-sm:tracking-[1px] font-medium max-sm:text-[7px]">
          LATEST GOVERNMENT JOBS, RESULTS & NOTIFICATIONS
        </div>
      </div>
    </div>
  );
};

export default SiteHeader;
