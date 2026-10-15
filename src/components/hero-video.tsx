"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Welcome-page hero media.
 *
 * Starts playing the moment its first frames arrive: the poster is a clean
 * frame of the video itself (no baked-in play glyph), `muted` is rendered
 * server-side by React 19 so autoplay is never blocked, and a short retry
 * loop nudges browsers (iOS low power) that decline the first play().
 * Falls back to the poster photo if the video cannot load.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (!video.paused || tries > 20) {
        window.clearInterval(timer);
        return;
      }
      video.muted = true;
      void video.play().catch(() => {});
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img src="/videos/lataffa-poster.jpg" alt="Lataffa perfume bottle" className="h-full w-full object-cover" />
    );
  }

  return (
    <video
      ref={videoRef}
      src="/videos/lataffa-hero.mp4"
      poster="/videos/lataffa-poster.jpg"
      className="h-full w-full object-cover"
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      disableRemotePlayback
      onLoadedData={(event) => {
        event.currentTarget.muted = true;
        void event.currentTarget.play().catch(() => {});
      }}
      onError={() => setFailed(true)}
    />
  );
}
