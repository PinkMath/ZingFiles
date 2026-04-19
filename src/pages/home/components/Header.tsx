export default function Header() {
  return (
    <header className="w-full bg-[#0e0e0e] border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img
              src="https://public.readdy.ai/ai/img_res/035b783a-6a55-460d-9aee-dcbba6ffe561.png"
              alt="ZingFiles Logo"
              className="w-10 h-10 object-contain rounded-lg"
            />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none tracking-tight font-['Space_Grotesk',sans-serif]">
              ZingFiles
            </h1>
            <p className="text-orange-400 text-[10px] tracking-widest uppercase font-medium">
              Image &amp; Audio &amp; Video&nbsp;Converter
            </p>
          </div>
        </div>

        {/* Nav badges */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 bg-white/5 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 flex items-center justify-center">
              <i className="ri-image-line text-orange-400" style={{ fontSize: '10px' }}></i>
            </span>
            JPG · PNG · WEBP · GIF · BMP
          </span>
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/50 bg-white/5 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 flex items-center justify-center">
              <i className="ri-music-line text-orange-400" style={{ fontSize: '10px' }}></i>
            </span>
            MP3 · WAV · AAC · FLAC
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-full px-3 py-1.5 whitespace-nowrap">
            <span className="w-4 h-4 flex items-center justify-center">
              <i className="ri-flashlight-line"></i>
            </span>
            No Limits
          </span>
        </div>
      </div>
    </header>
  );
}
