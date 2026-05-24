import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubeOverlay({ videoId, originalUrl }: { videoId: string, originalUrl: string }) {
  const playerRef = useRef<any>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  // generate a unique id for the player container
  const playerId = useRef(`yt-player-${videoId}-${Math.random().toString(36).substring(2, 9)}`).current;

  useEffect(() => {
    // We only want YouTube to load once globally
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      // Check if player container still exists
      if (!document.getElementById(playerId)) return;
      
      playerRef.current = new window.YT.Player(playerId, {
        videoId: videoId,
        playerVars: {
          end: 120,       // Ends exactly at 120 seconds
          rel: 0,        // No related videos
          modestbranding: 1,
          fs: 1,         // Allow full screen before it stops
        },
        events: {
          onStateChange: (event: any) => {
            // YT.PlayerState.ENDED = 0
            // When the video ends (due to our 'end: 60' parameter or natural end), show overlay
            if (event.data === 0) {
              setShowOverlay(true);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Wait for API to be ready
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previous) previous();
        // Since API is ready globally, multiple instances could be waiting
        // Dispatching a custom event might be better, or just rely on a small timeout to let all instances initialize
        initPlayer();
      };
      
      // Fallback check in case the event already fired or another component overrode it
      const interval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(interval);
          if (!playerRef.current) initPlayer();
        }
      }, 500);
      return () => clearInterval(interval);
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, playerId]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ boxShadow: 'var(--box-shadow-strong)' }}>
      {/* We must wrap the placeholder div because YouTube API REPLACES the element. By leaving the parent intact, we keep React happy. */}
      <div className="w-full h-full">
        <div id={playerId} className="w-full h-full" />
      </div>
      
      {showOverlay && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-10 p-5 px-4 text-center pb-8 animate-in fade-in duration-300">
          <p className="text-white text-xl md:text-2xl font-black mb-6 drop-shadow-md">
            Full video dekhne ke liye yahaan click karen
          </p>
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-[#FF0000] hover:bg-[#CC0000] text-white text-lg font-bold rounded-full transition-all shadow-[0_4px_14px_0_rgb(255,0,0,39%)] hover:shadow-[0_6px_20px_rgba(255,0,0,23%)] hover:-translate-y-0.5 active:translate-y-0"
          >
            Watch on YouTube
          </a>
        </div>
      )}
    </div>
  );
}
