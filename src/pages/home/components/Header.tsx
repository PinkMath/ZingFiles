import { useMemo } from 'react';
import {
  detectEncodingCapabilities,
  evaluateFormatAvailability,
  getFormatsByCategory,
  type EncodingCapabilities,
  type MediaCategory,
} from '@/config/formats';

function availableFormatNames(
  category: MediaCategory,
  capabilities: EncodingCapabilities,
): string {
  return getFormatsByCategory(category)
    .filter((format) => evaluateFormatAvailability(format, capabilities).available)
    .map((format) => format.name.toUpperCase())
    .join(' · ');
}

export default function Header() {
  const formats = useMemo(() => {
    const capabilities = detectEncodingCapabilities();
    return {
      image: availableFormatNames('image', capabilities),
      audio: availableFormatNames('audio', capabilities),
      video: availableFormatNames('video', capabilities),
    };
  }, []);
  const logoUrl = `${__BASE_PATH__}image.png`;

  return (
    <header className="w-full bg-[#0e0e0e] border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src={logoUrl}
              alt="ZingFiles logo"
              className="w-10 h-10 object-contain rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none tracking-tight font-['Space_Grotesk',sans-serif]">
              ZingFiles
            </h1>
            <p className="text-orange-400 text-[10px] tracking-widest uppercase font-medium">
              Private browser media converter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3" aria-label="Formats available in this browser">
          {formats.image && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-white/50 bg-white/5 rounded-full px-3 py-1.5">
              <i className="ri-image-line text-orange-400 text-[10px]" aria-hidden="true"></i>
              {formats.image}
            </span>
          )}
          {formats.audio && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 bg-white/5 rounded-full px-3 py-1.5">
              <i className="ri-music-line text-emerald-400 text-[10px]" aria-hidden="true"></i>
              {formats.audio}
            </span>
          )}
          {formats.video && (
            <span className="hidden lg:flex items-center gap-1.5 text-xs text-white/50 bg-white/5 rounded-full px-3 py-1.5">
              <i className="ri-video-line text-violet-400 text-[10px]" aria-hidden="true"></i>
              {formats.video}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-3 py-1.5 whitespace-nowrap">
            <i className="ri-lock-line" aria-hidden="true"></i>
            Local only
          </span>
        </div>
      </div>
    </header>
  );
}
