"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Welcome-page hero media.
 *
 * Autoplay requires the muted attribute set at hydration (React does not
 * server-render it), hence the ref. The poster photo shows instantly while
 * the 1.3 MB H.264 video streams, then it loops forever.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = true;
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
      onError={() => setFailed(true)}
    />
  );
}
