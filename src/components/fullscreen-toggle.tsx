"use client";

import { useEffect, useState } from "react";

type DocumentWithWebkit = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type HTMLElementWithWebkit = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

function isFullscreenActive(doc: DocumentWithWebkit): boolean {
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

export function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const doc = document as DocumentWithWebkit;

    const handleChange = () => {
      setIsFullscreen(isFullscreenActive(doc));
    };

    handleChange();
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange as EventListener);

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange as EventListener);
    };
  }, []);

  const toggleFullscreen = async () => {
    const doc = document as DocumentWithWebkit;
    const root = document.documentElement as HTMLElementWithWebkit;

    if (isFullscreenActive(doc)) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return;
      }

      if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }

      return;
    }

    if (root.requestFullscreen) {
      await root.requestFullscreen();
      return;
    }

    if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen();
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        {isFullscreen ? (
          <>
            <path d="M9 15H5v4" />
            <path d="M15 15h4v4" />
            <path d="M9 9H5V5" />
            <path d="M15 9h4V5" />
          </>
        ) : (
          <>
            <path d="M9 3H3v6" />
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M15 21h6v-6" />
          </>
        )}
      </svg>
      {isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
    </button>
  );
}
