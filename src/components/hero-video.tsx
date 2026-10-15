"use client";

import { useRef, useState } from "react";

/**
 * Welcome-page hero media. Autoplays the Lataffa product video muted (browser
 * rules) and offers a one-tap sound toggle. Falls back to the poster photo if
 * the video cannot load.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  const [failed, setFailed] = useState(false);

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    if (!next) void video.play().catch(() => {});
    setSound(!next);
  }

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/videos/lataffa-poster.jpg"
        alt="Lataffa perfume bottle"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        src="/videos/lataffa-hero.mp4"
        poster="/videos/lataffa-poster.jpg"
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        onClick={toggleSound}
        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/85 px-4 py-2 text-[12px] font-medium text-ink shadow-md backdrop-blur transition-colors hover:bg-white"
        aria-label={sound ? "Mute video" : "Play video with sound"}
      >
        <span aria-hidden>{sound ? "🔊" : "🔇"}</span>
        {sound ? "Sound on" : "Tap for sound"}
      </button>
    </div>
  );
}
