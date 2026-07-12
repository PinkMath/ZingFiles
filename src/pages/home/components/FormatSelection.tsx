import { useMemo } from 'react';
import {
  detectEncodingCapabilities,
  evaluateFormatAvailability,
  getFormatsByCategory,
  type AudioFormatId,
  type FormatAvailability,
  type ImageFormatId,
  type MediaCategory,
  type OutputFormat,
  type VideoFormatId,
} from '@/config/formats';

interface Props {
  hasImages: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  imageFormats: ImageFormatId[];
  audioFormats: AudioFormatId[];
  videoFormats: VideoFormatId[];
  onToggleImageFormat: (format: ImageFormatId) => void;
  onToggleAudioFormat: (format: AudioFormatId) => void;
  onToggleVideoFormat: (format: VideoFormatId) => void;
  disabled?: boolean;
  onConvert: () => void;
  filesCount: number;
  pendingCount: number;
}

interface FormatOption {
  format: OutputFormat;
  availability: FormatAvailability;
}

interface MultiPickerProps {
  label: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  checkColor: string;
  options: readonly FormatOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  disabled?: boolean;
}

function FormatMultiPicker({
  label,
  icon,
  color,
  borderColor,
  bgColor,
  checkColor,
  options,
  selected,
  onToggle,
  disabled,
}: MultiPickerProps) {
  const browserChecked = options.filter((option) => option.format.browserSupport);

  return (
    <div>
      <p className={`text-xs uppercase tracking-widest font-semibold mb-3 ${color}`}>
        <span className="w-4 h-4 inline-flex items-center justify-center mr-1.5" aria-hidden="true">
          <i className={icon}></i>
        </span>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(({ format, availability }) => {
          const isSelected = selected.includes(format.id);
          const isLast = isSelected && selected.length === 1;
          const isUnavailable = !availability.available;
          const explanation = isUnavailable
            ? availability.reason
            : format.description;

          return (
            <button
              key={format.id}
              type="button"
              onClick={() => {
                if (!isUnavailable) onToggle(format.id);
              }}
              disabled={disabled}
              aria-disabled={isUnavailable || undefined}
              aria-pressed={isSelected}
              aria-label={`${format.name}. ${explanation ?? ''}`}
              title={explanation}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-bold
                transition-all duration-200 whitespace-nowrap font-['Space_Grotesk',sans-serif]
                ${isSelected && !isUnavailable
                  ? `${borderColor} ${bgColor} ${color}`
                  : 'border-white/10 text-white/35 hover:border-white/25 hover:text-white/55'}
                ${isUnavailable ? 'opacity-35 cursor-not-allowed line-through' : ''}
                ${disabled ? 'opacity-40 cursor-not-allowed' : isLast ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              {isSelected && !isUnavailable && (
                <span className="w-3 h-3 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <i className={`ri-check-line text-xs ${checkColor}`}></i>
                </span>
              )}
              {isUnavailable && (
                <span className="w-3 h-3 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <i className="ri-lock-line text-xs"></i>
                </span>
              )}
              {format.name}
            </button>
          );
        })}
      </div>
      {selected.length > 1 && (
        <p className={`mt-2 text-xs ${color} opacity-60`}>
          {selected.length} formats selected — you&apos;ll get {selected.length} outputs per file
        </p>
      )}
      {browserChecked.length > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-white/25">
          {browserChecked.map(({ format }) => format.name).join(' and ')} availability is checked in this browser.
          Locked choices cannot be encoded reliably and will never be substituted.
        </p>
      )}
    </div>
  );
}

function selectedFormatsAreAvailable(
  category: MediaCategory,
  selected: readonly string[],
  options: Readonly<Record<MediaCategory, readonly FormatOption[]>>,
): boolean {
  return selected.every((formatId) =>
    options[category].some(
      (option) => option.format.id === formatId && option.availability.available,
    ),
  );
}

export default function FormatSelection({
  hasImages,
  hasAudio,
  hasVideo,
  imageFormats,
  audioFormats,
  videoFormats,
  onToggleImageFormat,
  onToggleAudioFormat,
  onToggleVideoFormat,
  disabled,
  onConvert,
  filesCount,
  pendingCount,
}: Props) {
  const formatOptions = useMemo(() => {
    const capabilities = detectEncodingCapabilities();
    const buildOptions = (category: MediaCategory): FormatOption[] =>
      getFormatsByCategory(category).map((format) => ({
        format,
        availability: evaluateFormatAvailability(format, capabilities),
      }));

    return {
      image: buildOptions('image'),
      audio: buildOptions('audio'),
      video: buildOptions('video'),
    } satisfies Record<MediaCategory, FormatOption[]>;
  }, []);

  const noFiles = filesCount === 0;
  const showImage = hasImages || noFiles;
  const showAudio = hasAudio || noFiles;
  const showVideo = hasVideo || noFiles;
  const colCount = [showImage, showAudio, showVideo].filter(Boolean).length;
  const gridClass = colCount === 3
    ? 'md:grid-cols-3'
    : colCount === 2
      ? 'md:grid-cols-2'
      : 'grid-cols-1';

  const selectionAvailable =
    (!hasImages || selectedFormatsAreAvailable('image', imageFormats, formatOptions)) &&
    (!hasAudio || selectedFormatsAreAvailable('audio', audioFormats, formatOptions)) &&
    (!hasVideo || selectedFormatsAreAvailable('video', videoFormats, formatOptions));
  const canConvert = pendingCount > 0 && !disabled && selectionAvailable;

  return (
    <section className="w-full max-w-4xl mx-auto px-4">
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 flex items-center justify-center" aria-hidden="true">
            <i className="ri-settings-3-line text-orange-400"></i>
          </div>
          <h2 className="text-white font-semibold text-sm tracking-wide font-['Space_Grotesk',sans-serif]">
            Output Format
          </h2>
          <div className="flex-1 h-px bg-white/5 ml-2"></div>
        </div>
        <p className="text-white/25 text-xs mb-5 ml-8">
          Pick one or more. Each selected format creates a separately encoded file.
        </p>

        <div className={`grid gap-6 ${gridClass}`}>
          {showImage && (
            <FormatMultiPicker
              label="Image"
              icon="ri-image-line"
              color="text-orange-400"
              borderColor="border-orange-400/40"
              bgColor="bg-orange-400/[0.08]"
              checkColor="text-orange-400"
              options={formatOptions.image}
              selected={imageFormats}
              onToggle={(format) => onToggleImageFormat(format as ImageFormatId)}
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
              options={formatOptions.audio}
              selected={audioFormats}
              onToggle={(format) => onToggleAudioFormat(format as AudioFormatId)}
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
              options={formatOptions.video}
              selected={videoFormats}
              onToggle={(format) => onToggleVideoFormat(format as VideoFormatId)}
              disabled={disabled}
            />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <p className="text-xs text-white/25 flex items-start gap-1.5">
            <span className="w-3 h-3 flex items-center justify-center mt-0.5 flex-shrink-0" aria-hidden="true">
              <i className="ri-information-line"></i>
            </span>
            Formats without a genuine encoder are disabled. Output MIME type and file signature are verified before download.
          </p>
          {hasVideo && (
            <p className="text-xs text-white/20 flex items-start gap-1.5">
              <span className="w-3 h-3 flex items-center justify-center mt-0.5 flex-shrink-0" aria-hidden="true">
                <i className="ri-video-line"></i>
              </span>
              WebM records in real time and requires capturable video and audio tracks; video-only sources return an error.
            </p>
          )}
          {!selectionAvailable && filesCount > 0 && (
            <p className="text-xs text-amber-400/80" role="alert">
              The selected output is unavailable in this browser. Choose an unlocked format to continue.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onConvert}
          disabled={!canConvert}
          className={`
            mt-6 w-full py-4 rounded-xl font-bold text-base transition-all duration-300 whitespace-nowrap
            font-['Space_Grotesk',sans-serif] flex items-center justify-center gap-2
            ${canConvert
              ? 'bg-orange-500 hover:bg-orange-400 text-white active:scale-[0.98] cursor-pointer'
              : 'bg-white/5 text-white/20 cursor-not-allowed'}
          `}
        >
          <span className="w-5 h-5 flex items-center justify-center" aria-hidden="true">
            <i className="ri-flashlight-fill"></i>
          </span>
          {filesCount === 0
            ? 'Upload files to convert'
            : disabled
              ? 'Converting…'
              : !selectionAvailable
                ? 'Selected format unavailable'
                : pendingCount === 0
                  ? 'All files converted'
                  : `Convert now — ${pendingCount} job${pendingCount > 1 ? 's' : ''}`}
        </button>
      </div>
    </section>
  );
}
