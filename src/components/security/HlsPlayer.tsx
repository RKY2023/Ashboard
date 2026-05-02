'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface HlsPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  muted?: boolean;
  autoPlay?: boolean;
}

/**
 * HLS video player. Uses native playback in Safari and lazy-loads hls.js
 * everywhere else so the ~150KB library stays out of the initial bundle.
 */
export function HlsPlayer({
  src,
  poster,
  className,
  muted = true,
  autoPlay = true,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let destroyed = false;
    let hls: { destroy: () => void } | null = null;

    setStatus('loading');
    setErrorMessage(null);

    const onLoaded = () => {
      if (!destroyed) setStatus('ready');
    };

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', onLoaded);
    } else {
      void import('hls.js').then(({ default: Hls }) => {
        if (destroyed) return;
        if (!Hls.isSupported()) {
          setStatus('error');
          setErrorMessage('HLS is not supported in this browser');
          return;
        }
        const instance = new Hls({ enableWorker: true });
        hls = instance;
        instance.loadSource(src);
        instance.attachMedia(video);
        instance.on(Hls.Events.MANIFEST_PARSED, onLoaded);
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setStatus('error');
            setErrorMessage(`${data.type}: ${data.details}`);
          }
        });
      }).catch((err) => {
        if (destroyed) return;
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load HLS player');
      });
    }

    return () => {
      destroyed = true;
      video.removeEventListener('loadedmetadata', onLoaded);
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [src]);

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className ?? ''}`}>
      <video
        ref={videoRef}
        poster={poster}
        muted={muted}
        autoPlay={autoPlay}
        playsInline
        controls
        className="w-full h-full"
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-white/80 pointer-events-none">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-300 bg-black/60 text-sm p-4 text-center">
          <AlertTriangle className="w-6 h-6" />
          <span>Stream unavailable</span>
          {errorMessage && <span className="text-xs text-red-200/80">{errorMessage}</span>}
        </div>
      )}
    </div>
  );
}
