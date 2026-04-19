import { useState } from 'react';

interface Props {
  hasImages: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  imageFormats: string[];
  audioFormats: string[];
  videoFormats: string[];
  videoAudioFormat: string;
  onToggleImageFormat: (f: string) => void;
  onToggleAudioFormat: (f: string) => void;
  onToggleVideoFormat: (f: string) => void;
  onVideoAudioFormat: (f: string) => void;
  disabled?: boolean;
  onConvert: () => void;
  filesCount: number;
  pendingCount: number;
}

const IMAGE_FORMATS = [
  { value: 'jpg',  label: 'JPG',  desc: 'JPEG — great for photos' },
  { value: 'png',  label: 'PNG',  desc: 'Lossless with transparency' },
  { value: 'webp', label: 'WEBP', desc: 'Modern, small file size' },
  { value: 'gif',  label: 'GIF',  desc: 'Supports animation' },
  { value: 'bmp',  label: 'BMP',  desc: 'Uncompressed bitmap' },
];

const AUDIO_FORMATS = [
  { value: 'wav',  label: 'WAV',  desc: 'Lossless PCM, universal' },
  { value: 'mp3',  label: 'MP3',  desc: 'Popular compressed format' },
  { value: 'aac',  label: 'AAC',  desc: 'High quality compression' },
  { value: 'flac', label: 'FLAC', desc: 'Lossless compressed audio' },
  { value: 'ogg',  label: 'OGG',  desc: 'Open source codec' },
];

const VIDEO_FORMATS = [
  { value: 'webm',       label: 'WEBM',       desc: 'Best browser support' },
  { value: 'mp4',        label: 'MP4',        desc: 'Universal playback' },
  { value: 'audio-only', label: 'Audio Only', desc: 'Extract audio track' },
];

interface MultiPickerProps {
  label: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  checkColor: string;
  options: { value: string; label: string; desc: string }[];
  selected: string[];
  onToggle: (v: string) => void;
  disabled?: boolean;
}

function FormatMultiPicker({
  label, icon, color, borderColor, bgColor, checkColor,
  options, selected, onToggle, disabled,
}: MultiPickerProps) {
  return (
    <div>
      <p className={`text-xs uppercase tracking-widest font-semibold mb-3 ${color}`}>
        <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
          <i className={icon}></i>
        </span>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          const isLast     = isSelected && selected.length === 1;
          return (
            <button
              key={opt.value}
              onClick={() => !disabled && !isLast && onToggle(opt.value)}
              disabled={disabled}
              title={opt.desc}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold
                transition-all duration-200 whitespace-nowrap font-['Space_Grotesk',sans-serif]
                ${isSelected
                  ? `${borderColor} ${bgColor} ${color}`
                  : 'border-white/10 text-white/35 hover:border-white/25 hover:text-white/55'}
                ${disabled ? 'opacity-40 cursor-not-allowed' : isLast ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              {isSelected && (
                <span className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                  <i className={`ri-check-line text-xs ${checkColor}`}></i>
                </span>
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
      {selected.length > 1 && (
        <p className={`mt-2 text-xs ${color} opacity-60`}>
          {selected.length} formats selected — you&apos;ll get {selected.length} output files per file
        </p>
      )}
    </div>
  );
}

// Simple single-select dropdown (used for audio-only output format)
function FormatDropdown({
  label, icon, color, activeBorderColor, checkColor,
  value, options, onChange, disabled,
}: {
  label: string; icon: string; color: string; activeBorderColor: string; checkColor: string;
  value: string; options: { value: string; label: string; desc: string }[];
  onChange: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <p className={`text-xs uppercase tracking-widest font-semibold mb-3 ${color}`}>
        <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5">
          <i className={icon}></i>
        </span>
        {label}
      </p>
      <button
        onClick={() => !disabled && setOpen((p) => !p)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-3
          bg-white/[0.04] border rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer
          ${open ? activeBorderColor : 'border-white/10 hover:border-white/20'}
          ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
          whitespace-nowrap
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-sm font-bold tracking-wide flex-shrink-0 ${color} font-['Space_Grotesk',sans-serif]`}>
            {selected?.label}
          </span>
          <span className="hidden sm:inline text-white/30 text-xs truncate">{selected?.desc}</span>
        </div>
        <div className="w-4 h-4 flex items-center justify-center text-white/30">
          {open ? <i className="ri-arrow-up-s-line"></i> : <i className="ri-arrow-down-s-line"></i>}
        </div>
      </button>
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`
                w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer whitespace-nowrap
                ${opt.value === value ? 'bg-white/5' : 'hover:bg-white/5'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${opt.value === value ? color : 'text-white/60'} font-['Space_Grotesk',sans-serif]`}>
                  {opt.label}
                </span>
                <span className="text-white/30 text-xs">{opt.desc}</span>
              </div>
              {opt.value === value && (
                <div className="w-4 h-4 flex items-center justify-center">
                  <i className={`ri-check-line ${checkColor} text-sm`}></i>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FormatSelection({
  hasImages, hasAudio, hasVideo,
  imageFormats, audioFormats, videoFormats, videoAudioFormat,
  onToggleImageFormat, onToggleAudioFormat, onToggleVideoFormat, onVideoAudioFormat,
  disabled, onConvert, filesCount, pendingCount,
}: Props) {
  const canConvert = pendingCount > 0 && !disabled;
  const noFiles    = filesCount === 0;

  const showImage = hasImages || noFiles;
  const showAudio = hasAudio  || noFiles;
  const showVideo = hasVideo  || noFiles;
  const colCount  = [showImage, showAudio, showVideo].filter(Boolean).length;
  const gridClass =
    colCount === 3 ? 'md:grid-cols-3' :
    colCount === 2 ? 'md:grid-cols-2' : 'grid-cols-1';

  const audioOnlySelected = videoFormats.includes('audio-only');

  return (
    <section className="w-full max-w-4xl mx-auto px-4">
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 flex items-center justify-center">
            <i className="ri-settings-3-line text-orange-400"></i>
          </div>
          <h2 className="text-white font-semibold text-sm tracking-wide font-['Space_Grotesk',sans-serif]">
            Output Format
          </h2>
          <div className="flex-1 h-px bg-white/5 ml-2"></div>
        </div>
        <p className="text-white/25 text-xs mb-5 ml-8">
          Pick one or more — each selected format generates a separate output file
        </p>

        {/* Multi-pickers grid */}
        <div className={`grid gap-6 ${gridClass}`}>
          {showImage && (
            <FormatMultiPicker
              label="Image"
              icon="ri-image-line"
              color="text-orange-400"
              borderColor="border-orange-400/40"
              bgColor="bg-orange-400/[0.08]"
              checkColor="text-orange-400"
              options={IMAGE_FORMATS}
              selected={hasImages ? imageFormats : ['webp']}
              onToggle={onToggleImageFormat}
              disabled={disabled}
            />
          )}
          {showAudio && (
            <FormatMultiPicker
              label="Audio"
              icon="ri-music-line"
              color="text-emerald-400"
              borderColor="border-emerald-400/40"
              bgColor="bg-emerald-400/[0.08]"
              checkColor="text-emerald-400"
              options={AUDIO_FORMATS}
              selected={hasAudio ? audioFormats : ['wav']}
              onToggle={onToggleAudioFormat}
              disabled={disabled}
            />
          )}
          {showVideo && (
            <FormatMultiPicker
              label="Video"
              icon="ri-video-line"
              color="text-violet-400"
              borderColor="border-violet-400/40"
              bgColor="bg-violet-400/[0.08]"
              checkColor="text-violet-400"
              options={VIDEO_FORMATS}
              selected={hasVideo ? videoFormats : ['webm']}
              onToggle={onToggleVideoFormat}
              disabled={disabled}
            />
          )}
        </div>

        {/* Audio output format — only when Video → Audio Only is selected */}
        {(hasVideo || filesCount === 0) && audioOnlySelected && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <FormatDropdown
              label="Audio Output Format"
              icon="ri-music-line"
              color="text-violet-400"
              activeBorderColor="border-violet-400/50 bg-white/[0.06]"
              checkColor="text-violet-400"
              value={videoAudioFormat}
              options={AUDIO_FORMATS}
              onChange={onVideoAudioFormat}
              disabled={disabled}
            />
          </div>
        )}

        {/* Notes */}
        <div className="mt-4 flex flex-col gap-1.5">
          {hasAudio && (
            <p className="text-xs text-white/20 flex items-start gap-1.5">
              <span className="w-3 h-3 flex items-center justify-center mt-0.5 flex-shrink-0">
                <i className="ri-information-line"></i>
              </span>
              Audio outputs as high-quality WAV PCM — browsers can&apos;t natively encode MP3/AAC/FLAC.
            </p>
          )}
          {hasVideo && !audioOnlySelected && (
            <p className="text-xs text-white/20 flex items-start gap-1.5">
              <span className="w-3 h-3 flex items-center justify-center mt-0.5 flex-shrink-0">
                <i className="ri-information-line"></i>
              </span>
              Video converts in real-time via Canvas + MediaRecorder — conversion takes as long as the clip&apos;s duration.
            </p>
          )}
          {hasVideo && audioOnlySelected && (
            <p className="text-xs text-white/20 flex items-start gap-1.5">
              <span className="w-3 h-3 flex items-center justify-center mt-0.5 flex-shrink-0">
                <i className="ri-music-line text-violet-400/60"></i>
              </span>
              Audio Only mode — extracts the audio track from your video instantly.
            </p>
          )}
        </div>

        {/* Convert button */}
        <button
          onClick={onConvert}
          disabled={!canConvert}
          className={`
            mt-6 w-full py-4 rounded-xl font-bold text-base transition-all duration-300 cursor-pointer whitespace-nowrap
            font-['Space_Grotesk',sans-serif] flex items-center justify-center gap-2
            ${canConvert
              ? 'bg-orange-500 hover:bg-orange-400 text-white active:scale-[0.98]'
              : 'bg-white/5 text-white/20 cursor-not-allowed'}
          `}
        >
          <span className="w-5 h-5 flex items-center justify-center">
            <i className="ri-flashlight-fill"></i>
          </span>
          {filesCount === 0
            ? 'Upload files to convert'
            : disabled
            ? 'Converting…'
            : pendingCount === 0
            ? 'All files converted'
            : `Convert now — ${pendingCount} job${pendingCount > 1 ? 's' : ''}`}
        </button>
      </div>
    </section>
  );
}
