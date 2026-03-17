const SiteHeader = () => {
  return (
    <div className="bg-background text-center py-8 sticky top-0 z-50" style={{ boxShadow: 'var(--box-shadow-medium)' }}>
      <h1 className="m-0 text-5xl font-black text-primary tracking-wide uppercase max-sm:text-3xl">
        SARKARI SEWAYOJAN
      </h1>
      <div className="text-3xl text-primary mt-1 font-medium max-sm:text-xl">
        www.sarkarisewayojan.com
      </div>
      <div className="text-[10px] text-accent mt-1.5 tracking-[3px] font-medium">
        LATEST GOVERNMENT JOBS, RESULTS & NOTIFICATIONS
      </div>
    </div>
  );
};

export default SiteHeader;
