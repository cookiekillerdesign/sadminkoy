import { useEffect, useRef, useState } from 'react';
import { isVideo } from '../lib/media';

/**
 * One editable media slot from the admin panel (`site_media`).
 *
 * Renders nothing at all when the slot is empty or its file 404s, so an
 * unfilled — or later broken — slot can never leave a grey box or a broken
 * image icon in the middle of the page. Videos autoplay muted and only while
 * they're actually on screen.
 */
export default function SlotMedia({ slot, className = '', decorative = false }) {
  const [broken, setBroken] = useState(false);
  const videoRef = useRef(null);
  const video = slot ? isVideo(slot.kind) : false;

  useEffect(() => { setBroken(false); }, [slot && slot.url]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video || broken) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play?.().catch(() => { /* autoplay policy */ });
      else el.pause?.();
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [video, broken, slot && slot.url]);

  if (!slot || !slot.url || broken) return null;

  const style = slot.opacity != null && slot.opacity !== 1 ? { opacity: slot.opacity } : undefined;

  return (
    <div className={`slot-media ${className}`} style={style} aria-hidden={decorative ? 'true' : undefined}>
      {video ? (
        <video
          ref={videoRef}
          src={slot.url}
          poster={slot.poster || undefined}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setBroken(true)}
        />
      ) : (
        <img
          src={slot.url}
          alt={decorative ? '' : (slot.alt || '')}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
}
