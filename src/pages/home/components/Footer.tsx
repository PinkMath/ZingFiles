const FEATURES = [
  { icon: 'ri-image-line', label: 'JPG',  color: 'text-orange-400/60' },
  { icon: 'ri-image-line', label: 'PNG',  color: 'text-orange-400/60' },
  { icon: 'ri-image-line', label: 'WEBP', color: 'text-orange-400/60' },
  { icon: 'ri-image-line', label: 'GIF',  color: 'text-orange-400/60' },
  { icon: 'ri-image-line', label: 'BMP',  color: 'text-orange-400/60' },
  { icon: 'ri-music-line', label: 'WAV',  color: 'text-emerald-400/60' },
  { icon: 'ri-music-line', label: 'MP3',  color: 'text-emerald-400/60' },
  { icon: 'ri-music-line', label: 'AAC',  color: 'text-emerald-400/60' },
  { icon: 'ri-music-line', label: 'FLAC', color: 'text-emerald-400/60' },
  { icon: 'ri-music-line', label: 'OGG',  color: 'text-emerald-400/60' },
  { icon: 'ri-video-line', label: 'MP4',  color: 'text-violet-400/60' },
  { icon: 'ri-video-line', label: 'WEBM', color: 'text-violet-400/60' },
];

const HIGHLIGHTS = [
  { icon: 'ri-flashlight-line',     text: 'No file size limits' },
  { icon: 'ri-lock-line',           text: '100% private – runs in your browser' },
  { icon: 'ri-wifi-off-line',       text: 'No upload to server' },
  { icon: 'ri-infinity-line',       text: 'Unlimited conversions' },
];

export default function Footer() {
  return (
    <footer className="w-full bg-[#0a0a0a] border-t border-white/5 mt-8">
      {/* Supported formats strip */}
      <div className="border-b border-white/5 py-5">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-white/20 text-xs uppercase tracking-widest text-center mb-4">Supported Formats</p>
          <div className="flex flex-wrap justify-center gap-2">
            {FEATURES.map((f) => (
              <span
                key={f.label}
                className="flex items-center gap-1.5 bg-white/[0.03] border border-white/5 rounded-full px-3 py-1 text-xs text-white/40"
              >
                <span className="w-3 h-3 flex items-center justify-center">
                  <i className={`${f.icon} ${f.color}`} style={{ fontSize: '10px' }}></i>
                </span>
                {f.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {HIGHLIGHTS.map((h) => (
              <div key={h.text} className="flex flex-col items-center gap-2 text-center">
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-400/10 text-orange-400 text-base">
                  <i className={h.icon}></i>
                </div>
                <p className="text-white/30 text-xs leading-tight">{h.text}</p>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2">
              <img
                src="https://public.readdy.ai/ai/img_res/035b783a-6a55-460d-9aee-dcbba6ffe561.png"
                alt="ZingFiles"
                className="w-6 h-6 object-contain rounded"
              />
              <span className="text-white/30 text-xs font-['Space_Grotesk',sans-serif] font-semibold">ZingFiles</span>
            </div>
            <p className="text-white/20 text-xs">
              © {new Date().getFullYear()} ZingFiles · All conversions happen locally in your browser.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
