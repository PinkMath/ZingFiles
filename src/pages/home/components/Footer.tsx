import { useMemo } from 'react';
import {
  detectEncodingCapabilities,
  evaluateFormatAvailability,
  OUTPUT_FORMATS,
} from '@/config/formats';

const CATEGORY_STYLE = {
  image: { icon: 'ri-image-line', color: 'text-orange-400/60' },
  audio: { icon: 'ri-music-line', color: 'text-emerald-400/60' },
  video: { icon: 'ri-video-line', color: 'text-violet-400/60' },
} as const;

const HIGHLIGHTS = [
  { icon: 'ri-computer-line', text: 'Processed on your device' },
  { icon: 'ri-lock-line', text: 'Files stay in your browser' },
  { icon: 'ri-wifi-off-line', text: 'No file uploads' },
  { icon: 'ri-checkbox-circle-line', text: 'Output format verified' },
];

export default function Footer() {
  const availableFormats = useMemo(() => {
    const capabilities = detectEncodingCapabilities();
    return OUTPUT_FORMATS.filter(
      (format) => evaluateFormatAvailability(format, capabilities).available,
    );
  }, []);
  const logoUrl = `${__BASE_PATH__}image.png`;

  return (
    <footer className="w-full bg-[#0a0a0a] border-t border-white/5 mt-8">
      <div className="border-b border-white/5 py-5">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-white/20 text-xs uppercase tracking-widest text-center mb-4">
            Outputs available in this browser
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {availableFormats.map((format) => {
              const style = CATEGORY_STYLE[format.category];
              return (
                <span
                  key={format.id}
                  className="flex items-center gap-1.5 bg-white/[0.03] border border-white/5 rounded-full px-3 py-1 text-xs text-white/40"
                >
                  <i className={`${style.icon} ${style.color} text-[10px]`} aria-hidden="true"></i>
                  {format.name}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {HIGHLIGHTS.map((highlight) => (
              <div key={highlight.text} className="flex flex-col items-center gap-2 text-center">
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-400/10 text-orange-400 text-base">
                  <i className={highlight.icon} aria-hidden="true"></i>
                </div>
                <p className="text-white/30 text-xs leading-tight">{highlight.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2">
              <img
                src={logoUrl}
                alt=""
                className="w-6 h-6 object-contain rounded"
              />
              <span className="text-white/30 text-xs font-['Space_Grotesk',sans-serif] font-semibold">
                ZingFiles Community
              </span>
            </div>
            <p className="text-white/20 text-xs">
              © {new Date().getFullYear()} ZingFiles · Files are never uploaded.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
