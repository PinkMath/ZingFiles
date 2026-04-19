import { useState } from 'react';
import JSZip from 'jszip';
import { ConvertedFile } from '@/hooks/useFileConverter';

interface Props {
  results: ConvertedFile[];
  onReset: () => void;
}

const AUDIO_FMTS = new Set(['MP3', 'WAV', 'AAC', 'FLAC', 'OGG']);
const VIDEO_FMTS = new Set(['MP4', 'WEBM', 'MOV', 'AVI', 'MKV']);

function isAudioFile(fmt: string) { return AUDIO_FMTS.has(fmt.toUpperCase()); }
function isVideoFile(fmt: string) { return VIDEO_FMTS.has(fmt.toUpperCase()); }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function forceDownload(url: string, fileName: string) {
  // The url is already a blob: URL created by URL.createObjectURL() in the hook.
  // Directly clicking an anchor with the download attribute is the most reliable
  // way to force a download across all file types without opening a new tab.
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
interface LightboxProps {
  file: ConvertedFile;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

function Lightbox({ file, onClose, onPrev, onNext, hasPrev, hasNext }: LightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Nav: prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer z-10 whitespace-nowrap"
        >
          <i className="ri-arrow-left-s-line text-xl"></i>
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={file.url}
          alt={file.name}
          className="max-w-full max-h-[75vh] object-contain rounded-xl"
          style={{ imageRendering: 'auto' }}
        />
        {/* Info bar */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-5 py-2">
          <span className="text-orange-400 text-xs font-bold font-['Space_Grotesk',sans-serif]">{file.format}</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-white/50 text-xs truncate max-w-[200px]">{file.name}</span>
          <span className="text-white/20 text-xs">·</span>
          <span className="text-white/40 text-xs">{formatBytes(file.size)}</span>
          <button
            onClick={() => forceDownload(file.url, file.name)}
            className="ml-1 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer whitespace-nowrap font-semibold transition"
          >
            <span className="w-3 h-3 flex items-center justify-center">
              <i className="ri-download-line"></i>
            </span>
            Download
          </button>
        </div>
      </div>

      {/* Nav: next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer z-10 whitespace-nowrap"
        >
          <i className="ri-arrow-right-s-line text-xl"></i>
        </button>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer whitespace-nowrap"
      >
        <i className="ri-close-line text-lg"></i>
      </button>
    </div>
  );
}

// ─── Image card ──────────────────────────────────────────────────────────────
interface ImageCardProps {
  file: ConvertedFile;
  onPreview: () => void;
}

function ImageCard({ file, onPreview }: ImageCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="group bg-white/[0.03] border border-white/5 hover:border-orange-400/25 rounded-xl overflow-hidden transition-all duration-300">
      {/* Thumbnail */}
      <div
        className="relative w-full h-40 bg-white/[0.03] cursor-zoom-in overflow-hidden"
        onClick={onPreview}
      >
        {!error ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="ri-loader-4-line text-white/20 text-2xl animate-spin"></i>
              </div>
            )}
            <img
              src={file.url}
              alt={file.name}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              className={`w-full h-full object-contain transition-all duration-500 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'repeating-conic-gradient(#1a1a1a 0% 25%, #151515 0% 50%) 0 0 / 12px 12px' }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <i className="ri-image-2-line text-white/20 text-3xl"></i>
            <p className="text-white/20 text-xs">Preview unavailable</p>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 bg-black/60 rounded-full px-3 py-1.5 text-white text-xs backdrop-blur-sm">
            <span className="w-3.5 h-3.5 flex items-center justify-center">
              <i className="ri-zoom-in-line"></i>
            </span>
            Full preview
          </div>
        </div>

        {/* Format badge */}
        <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-['Space_Grotesk',sans-serif]">
          {file.format}
        </span>
      </div>

      {/* Meta + download */}
      <div className="p-3">
        <p className="text-white/70 text-xs font-medium truncate mb-0.5">{file.name}</p>
        <p className="text-white/25 text-xs mb-3">{formatBytes(file.size)}</p>
        <button
          onClick={() => forceDownload(file.url, file.name)}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-download-line"></i>
          </span>
          Download
        </button>
      </div>
    </div>
  );
}

// ─── Audio card ──────────────────────────────────────────────────────────────
function AudioCard({ file }: { file: ConvertedFile }) {
  return (
    <div className="group bg-white/[0.03] border border-white/5 hover:border-emerald-400/25 rounded-xl overflow-hidden transition-all duration-300">
      {/* Audio visual header */}
      <div className="relative w-full h-40 bg-gradient-to-br from-emerald-900/20 to-white/[0.02] flex flex-col items-center justify-center gap-3">
        <div className="w-14 h-14 flex items-center justify-center rounded-full bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-2xl">
          <i className="ri-music-2-fill"></i>
        </div>
        {/* Fake waveform bars */}
        <div className="flex items-end gap-0.5 h-6">
          {[3,5,8,6,10,7,4,9,5,8,6,10,4,7,3,6,9,5,8,4].map((h, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-emerald-400/40"
              style={{ height: `${h * 2}px` }}
            />
          ))}
        </div>
        {/* Badge */}
        <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-['Space_Grotesk',sans-serif]">
          {file.format}
        </span>
      </div>

      {/* Player + meta */}
      <div className="p-3">
        <p className="text-white/70 text-xs font-medium truncate mb-0.5">{file.name}</p>
        <p className="text-white/25 text-xs mb-2">{formatBytes(file.size)}</p>
        {/* Native audio player */}
        <audio
          controls
          src={file.url}
          className="w-full h-7 mb-2"
          style={{ accentColor: '#34d399' }}
        />
        <button
          onClick={() => forceDownload(file.url, file.name)}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-download-line"></i>
          </span>
          Download
        </button>
      </div>
    </div>
  );
}

// ─── Video card ──────────────────────────────────────────────────────────────
function VideoCard({ file }: { file: ConvertedFile }) {
  return (
    <div className="group bg-white/[0.03] border border-white/5 hover:border-violet-400/25 rounded-xl overflow-hidden transition-all duration-300">
      {/* Video preview */}
      <div className="relative w-full h-40 bg-black flex items-center justify-center overflow-hidden">
        <video
          src={file.url}
          controls
          className="w-full h-full object-contain"
          preload="metadata"
        />
        {/* Format badge */}
        <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-['Space_Grotesk',sans-serif] pointer-events-none">
          {file.format}
        </span>
      </div>

      {/* Meta + download */}
      <div className="p-3">
        <p className="text-white/70 text-xs font-medium truncate mb-0.5">{file.name}</p>
        <p className="text-white/25 text-xs mb-3">{formatBytes(file.size)}</p>
        <button
          onClick={() => forceDownload(file.url, file.name)}
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap"
        >
          <span className="w-3.5 h-3.5 flex items-center justify-center">
            <i className="ri-download-line"></i>
          </span>
          Download
        </button>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function DownloadLinks({ results, onReset }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [zipping, setZipping] = useState(false);

  if (results.length === 0) return null;

  const imageResults = results.filter((r) => !isAudioFile(r.format) && !isVideoFile(r.format));

  const handleDownloadAll = async () => {
    if (zipping) return;
    setZipping(true);
    try {
      const zip = new JSZip();
      // Fetch each blob URL and add to zip
      await Promise.all(
        results.map(async (r) => {
          const res = await fetch(r.url);
          const blob = await res.blob();
          zip.file(r.name, blob);
        })
      );
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = 'converted_files.zip';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
    } finally {
      setZipping(false);
    }
  };

  const openLightbox = (file: ConvertedFile) => {
    const idx = imageResults.findIndex((r) => r.name === file.name);
    if (idx !== -1) setLightboxIdx(idx);
  };

  return (
    <>
      {/* Lightbox */}
      {lightboxIdx !== null && imageResults[lightboxIdx] && (
        <Lightbox
          file={imageResults[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((p) => (p !== null ? p - 1 : p))}
          onNext={() => setLightboxIdx((p) => (p !== null ? p + 1 : p))}
          hasPrev={lightboxIdx > 0}
          hasNext={lightboxIdx < imageResults.length - 1}
        />
      )}

      <section className="w-full max-w-4xl mx-auto px-4">
        {/* Section header */}
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:gap-2">
          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              <i className="ri-download-cloud-2-line text-emerald-400"></i>
            </div>
            <h2 className="text-white font-semibold text-sm tracking-wide font-['Space_Grotesk',sans-serif] whitespace-nowrap">
              Ready to Download
            </h2>
            <span className="bg-emerald-400/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              {results.length}
            </span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="text-xs text-white/30 hover:text-white/60 transition-colors cursor-pointer whitespace-nowrap px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              <span className="w-3 h-3 inline-flex items-center justify-center mr-1">
                <i className="ri-restart-line"></i>
              </span>
              Convert more
            </button>
            {results.length > 1 && (
              <button
                onClick={handleDownloadAll}
                disabled={zipping}
                className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap px-4 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <span className="w-3 h-3 inline-flex items-center justify-center">
                  {zipping
                    ? <i className="ri-loader-4-line animate-spin"></i>
                    : <i className="ri-folder-zip-line"></i>
                  }
                </span>
                {zipping ? 'Packing ZIP…' : `Download All (${results.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => {
            // Use fileType first (most reliable), fall back to format string matching
            if (r.fileType === 'video' || isVideoFile(r.format)) return <VideoCard key={r.name} file={r} />;
            if (r.fileType === 'audio' || isAudioFile(r.format)) return <AudioCard key={r.name} file={r} />;
            return <ImageCard key={r.name} file={r} onPreview={() => openLightbox(r)} />;
          })}
        </div>

        {imageResults.length > 0 && (
          <p className="mt-3 text-center text-white/20 text-xs">
            <span className="w-3 h-3 inline-flex items-center justify-center mr-1">
              <i className="ri-zoom-in-line"></i>
            </span>
            Click any image thumbnail for a full-size preview
          </p>
        )}
      </section>
    </>
  );
}
