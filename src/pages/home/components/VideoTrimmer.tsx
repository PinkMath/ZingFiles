import { useEffect, useRef, useState } from 'react';
import { TrimSettings } from '@/hooks/useFileConverter';

// ─── CSS injected once for range thumb styling ────────────────────────────────
const RANGE_STYLE = `
  .trim-range { -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none; position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; }
  .trim-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid #8b5cf6; cursor: grab; pointer-events: all; margin-top: -7px; }
  .trim-range:active::-webkit-slider-thumb { cursor: grabbing; transform: scale(1.15); background: #8b5cf6; border-color: #fff; }
  .trim-range::-webkit-slider-runnable-track { height: 4px; background: transparent; }
  .trim-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid #8b5cf6; cursor: grab; pointer-events: all; }
  .trim-range::-moz-range-track { background: transparent; }
`;

function RangeStyleInjector() {
  return <style dangerouslySetInnerHTML={{ __html: RANGE_STYLE }} />;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00.0';
  const m   = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, '0')}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Dual range slider ────────────────────────────────────────────────────────

interface DualRangeProps {
  duration: number;
  start: number;
  end: number;
  onStartChange: (v: number) => void;
  onEndChange:   (v: number) => void;
  onSeek:        (v: number) => void;
  disabled?: boolean;
}

function DualRangeSlider({ duration, start, end, onStartChange, onEndChange, onSeek, disabled }: DualRangeProps) {
  if (duration <= 0) {
    return <div className="h-5 bg-white/5 rounded-full animate-pulse my-2" />;
  }

  const startPct = (start / duration) * 100;
  const endPct   = (end   / duration) * 100;

  // When start thumb is very close to the right edge give it higher z-index
  // so it can still be pulled leftward
  const startZ = start >= duration * 0.95 ? 4 : 2;
  const endZ   = start >= duration * 0.95 ? 2 : 4;

  const MIN_GAP = Math.max(0.2, duration * 0.005); // 0.5% min gap

  return (
    <div className="relative h-6 my-1 select-none">
      {/* Full track background */}
      <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 bg-white/10 rounded-full pointer-events-none" />

      {/* Dimmed before start */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 bg-white/5 rounded-l-full pointer-events-none"
        style={{ left: 0, width: `${startPct}%` }}
      />

      {/* Active range — violet */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 bg-violet-500 pointer-events-none"
        style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
      />

      {/* Dimmed after end */}
      <div
        className="absolute top-1/2 -translate-y-1/2 h-1 bg-white/5 rounded-r-full pointer-events-none"
        style={{ left: `${endPct}%`, right: 0 }}
      />

      {/* Start thumb input — CSS handles the visible thumb dot */}
      <input
        type="range" min={0} max={duration} step={0.05}
        value={start}
        disabled={disabled}
        onChange={(e) => {
          const v = Math.min(Number(e.target.value), end - MIN_GAP);
          const clamped = Math.max(0, v);
          onStartChange(clamped);
          onSeek(clamped);
        }}
        className="trim-range"
        style={{ zIndex: startZ }}
      />

      {/* End thumb input — CSS handles the visible thumb dot */}
      <input
        type="range" min={0} max={duration} step={0.05}
        value={end}
        disabled={disabled}
        onChange={(e) => {
          const v = Math.max(Number(e.target.value), start + MIN_GAP);
          const clamped = Math.min(duration, v);
          onEndChange(clamped);
          onSeek(clamped);
        }}
        className="trim-range"
        style={{ zIndex: endZ }}
      />
    </div>
  );
}

// ─── Single video trim card ───────────────────────────────────────────────────

interface TrimCardProps {
  file: File;
  trim: TrimSettings;
  onTrimChange: (start: number, end: number) => void;
  disabled?: boolean;
}

function VideoTrimCard({ file, trim, onTrimChange, disabled }: TrimCardProps) {
  const [duration, setDuration] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [objUrl, setObjUrl]     = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Create object URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleMetadata = () => {
    const dur = videoRef.current?.duration ?? 0;
    if (!isFinite(dur) || dur === 0) return;
    setDuration(dur);
    setLoading(false);
    // Init trim to full range on first load
    if (trim.end < 0) {
      onTrimChange(0, dur);
    }
  };

  const seekTo = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const effectiveStart = trim.start;
  const effectiveEnd   = trim.end < 0 ? duration : trim.end;
  const clipDur        = Math.max(0, effectiveEnd - effectiveStart);
  const savedPct       = duration > 0 ? (1 - clipDur / duration) * 100 : 0;

  const handleStartChange = (v: number) => onTrimChange(v, effectiveEnd);
  const handleEndChange   = (v: number) => onTrimChange(effectiveStart, v);
  const handleReset       = () => { onTrimChange(0, duration); seekTo(0); };

  return (
    <div className="bg-white/[0.025] border border-white/5 rounded-xl overflow-hidden flex flex-col md:flex-row gap-0">
      {/* Video preview pane */}
      <div className="relative w-full md:w-52 flex-shrink-0 bg-black flex items-center justify-center overflow-hidden min-h-[130px]">
        {objUrl && (
          <video
            ref={videoRef}
            src={objUrl}
            className="w-full h-full object-contain max-h-40 md:max-h-none"
            onLoadedMetadata={handleMetadata}
            preload="metadata"
            muted
            playsInline
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <i className="ri-loader-4-line text-white/30 text-2xl animate-spin"></i>
          </div>
        )}
        {/* Format badge */}
        <span className="absolute top-2 left-2 bg-black/70 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm font-['Space_Grotesk',sans-serif]">
          VIDEO
        </span>
      </div>

      {/* Controls pane */}
      <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
        {/* File name + size */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-white/80 text-sm font-medium truncate">{file.name}</p>
            <p className="text-white/30 text-xs mt-0.5">{formatBytes(file.size)}</p>
          </div>
          <button
            onClick={handleReset}
            disabled={disabled || loading}
            title="Reset to full clip"
            className="flex-shrink-0 flex items-center gap-1 text-[11px] text-white/25 hover:text-violet-400 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="w-3 h-3 flex items-center justify-center">
              <i className="ri-refresh-line"></i>
            </span>
            Reset
          </button>
        </div>

        {/* Duration summary */}
        <div className="flex items-center gap-2 flex-wrap">
          {duration > 0 && (
            <>
              <span className="text-[11px] text-white/30 bg-white/5 rounded-full px-2.5 py-1 whitespace-nowrap">
                Total: {fmtTime(duration)}
              </span>
              <i className="ri-arrow-right-s-line text-white/20 text-xs"></i>
              <span className="text-[11px] text-violet-400 bg-violet-400/10 border border-violet-400/20 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap">
                Clip: {fmtTime(clipDur)}
              </span>
              {savedPct > 1 && (
                <span className="text-[11px] text-emerald-400 bg-emerald-400/10 rounded-full px-2.5 py-1 whitespace-nowrap">
                  {savedPct.toFixed(0)}% trimmed
                </span>
              )}
            </>
          )}
          {loading && (
            <span className="text-[11px] text-white/25 animate-pulse">Loading video…</span>
          )}
        </div>

        {/* Dual range slider */}
        <DualRangeSlider
          duration={duration}
          start={effectiveStart}
          end={effectiveEnd}
          onStartChange={handleStartChange}
          onEndChange={handleEndChange}
          onSeek={seekTo}
          disabled={disabled || loading}
        />

        {/* Timestamp labels + manual inputs */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Start time */}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0"></div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Start</p>
              <input
                type="number"
                min={0}
                max={effectiveEnd - 0.1}
                step={0.1}
                value={effectiveStart.toFixed(1)}
                disabled={disabled || loading}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(Number(e.target.value), effectiveEnd - 0.1));
                  onTrimChange(v, effectiveEnd);
                  seekTo(v);
                }}
                className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 font-['Space_Grotesk',sans-serif] focus:outline-none focus:border-violet-400/50 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Waveform / timeline visual bar — hidden on mobile to save space */}
          <div className="hidden sm:flex flex-1 h-6 items-end gap-px overflow-hidden opacity-40">
            {Array.from({ length: 28 }, (_, i) => {
              const inRange = (i / 28) >= (effectiveStart / (duration || 1)) && (i / 28) <= (effectiveEnd / (duration || 1));
              const h = [4,7,10,6,12,8,5,14,9,7,11,6,13,8,5,10,7,12,6,9,14,8,5,11,7,10,6,9][i];
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-sm transition-colors ${inRange ? 'bg-violet-400' : 'bg-white/15'}`}
                  style={{ height: `${h * 1.5}px` }}
                />
              );
            })}
          </div>

          {/* End time */}
          <div className="flex items-center gap-2">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5 text-right">End</p>
              <input
                type="number"
                min={effectiveStart + 0.1}
                max={duration}
                step={0.1}
                value={effectiveEnd.toFixed(1)}
                disabled={disabled || loading}
                onChange={(e) => {
                  const v = Math.max(effectiveStart + 0.1, Math.min(Number(e.target.value), duration));
                  onTrimChange(effectiveStart, v);
                  seekTo(v);
                }}
                className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 font-['Space_Grotesk',sans-serif] focus:outline-none focus:border-violet-400/50 disabled:opacity-40"
              />
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-violet-500 flex-shrink-0"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main VideoTrimmer section ────────────────────────────────────────────────

interface Props {
  videoFiles: File[];
  trimMap: Record<string, TrimSettings>;
  onTrimChange: (fileName: string, start: number, end: number) => void;
  disabled?: boolean;
}

export default function VideoTrimmer({ videoFiles, trimMap, onTrimChange, disabled }: Props) {
  if (videoFiles.length === 0) return null;

  return (
    <>
      <RangeStyleInjector />
      <section className="w-full max-w-4xl mx-auto px-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
              <i className="ri-scissors-cut-line text-base"></i>
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm tracking-wide font-['Space_Grotesk',sans-serif]">
                Video Trimmer
              </h2>
              <p className="text-white/25 text-xs">
                Drag the handles or type exact timestamps to set start &amp; end points
              </p>
            </div>
            <div className="flex-1 h-px bg-white/5 ml-2"></div>
            <span className="text-xs text-violet-400 bg-violet-400/10 rounded-full px-3 py-1 font-medium whitespace-nowrap">
              {videoFiles.length} video{videoFiles.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-4">
            {videoFiles.map((file) => (
              <VideoTrimCard
                key={file.name}
                file={file}
                trim={trimMap[file.name] ?? { start: 0, end: -1 }}
                onTrimChange={(s, e) => onTrimChange(file.name, s, e)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
