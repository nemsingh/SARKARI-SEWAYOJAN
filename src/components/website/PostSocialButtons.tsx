import { FC } from 'react';

// Reusable SVG icons supporting custom colors via fill="currentColor"
const Icons = {
  whatsapp: (className?: string) => (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className || "w-5 h-5"}>
      <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
    </svg>
  ),
  telegram: (className?: string) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
    </svg>
  ),
  youtube: (className?: string) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  instagram: (className?: string) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.88z"/>
    </svg>
  ),
  facebook: (className?: string) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  linkedin: (className?: string) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className || "w-5 h-5"}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
};

// Styling details for each network
const NetworkConfig = {
  whatsapp: {
    label: "WhatsApp Group",
    actionLabel: "Join Now",
    color: "#25D366",
  },
  telegram: {
    label: "Telegram Channel",
    actionLabel: "Join Now",
    color: "#0088cc",
  },
  youtube: {
    label: "YouTube Channel",
    actionLabel: "Subscribe",
    color: "#FF0000",
  },
  instagram: {
    label: "Instagram Page",
    actionLabel: "Follow Now",
    color: "#E1306C",
  },
  facebook: {
    label: "Facebook Group",
    actionLabel: "Join Now",
    color: "#1877F2",
  },
  linkedin: {
    label: "LinkedIn Page",
    actionLabel: "Follow Now",
    color: "#0a66c2",
  }
};

interface PostSocialButtonsProps {
  settings: Record<string, any>;
}

export const PostSocialButtons: FC<PostSocialButtonsProps> = ({ settings }) => {
  const networks = ['whatsapp', 'telegram', 'youtube', 'instagram', 'facebook', 'linkedin'] as const;
  
  // Find enabled social channels
  const activeButtons = networks.map(net => {
    // 1. Check if explicitly enabled for posts
    const postEnabledKey = `post_social_${net}_enabled`;
    const isPostEnabled = settings[postEnabledKey]?.value === 'true';

    // 2. Get URL (post-specific URL takes priority, then fallback to global social URL)
    const postUrlKey = `post_social_${net}_url`;
    const globalUrlKey = `social_${net}_url`;
    const url = settings[postUrlKey]?.value || settings[globalUrlKey]?.value || '';

    return {
      network: net,
      enabled: isPostEnabled,
      url,
      ...NetworkConfig[net]
    };
  }).filter(btn => btn.enabled && btn.url);

  if (activeButtons.length === 0) {
    return null;
  }

  return (
    <div className="notranslate w-full flex flex-wrap items-center justify-center gap-4 py-4 border-b border-black/10">
      {activeButtons.map(btn => (
        <a
          key={btn.network}
          href={btn.url}
          target="_blank"
          rel="noopener noreferrer"
          className="animate-blink-border flex items-center justify-between bg-[#E0F2FE] hover:bg-[#D0EBFD] rounded-xl px-2.5 py-1.5 w-full max-w-[280px] sm:max-w-[300px] border-2 transition-colors group cursor-pointer"
          style={{
            // Set dynamic properties for the border blinking animation in src/index.css
            ['--blink-color' as any]: btn.color,
            ['--blink-color-glow' as any]: `${btn.color}44`,
          }}
        >
          {/* Left section: Real colored icon + label */}
          <div className="flex items-center gap-2 px-1">
            <span style={{ color: btn.color }}>
              {Icons[btn.network as keyof typeof Icons]("w-6 h-6 shrink-0")}
            </span>
            <span className="font-extrabold text-sm text-slate-800 tracking-wide group-hover:text-primary transition-colors">
              {btn.label}
            </span>
          </div>

          {/* Right section: Inner brand-colored action button with white logo */}
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-xs tracking-wider shadow-sm transition-transform active:scale-95 duration-100 shrink-0"
            style={{ backgroundColor: btn.color }}
          >
            <span className="text-white">
              {Icons[btn.network as keyof typeof Icons]("w-3.5 h-3.5 shrink-0")}
            </span>
            <span>{btn.actionLabel}</span>
          </div>
        </a>
      ))}
    </div>
  );
};
