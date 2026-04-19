// @ts-expect-error breezystack/lamejs has no TypeScript declarations
import lamejs from '@breezystack/lamejs';
import { useState, useCallback } from 'react';

export type ConversionStatus = 'idle' | 'converting' | 'done' | 'error';
export type FileType = 'image' | 'audio' | 'video';

export interface TrimSettings {
  start: number;
  end: number; // -1 = full duration
}
export type TrimMap = Record<string, TrimSettings>;

export interface ConvertedFile {
  name: string;
  url: string;
  size: number;
  format: string;
  originalName: string;
  fileType: FileType;
}

export interface ProgressState {
  current: number;
  total: number;
  percent: number;
  fileName: string;
}

// ─── WAV encoder ──────────────────────────────────────────────────────────────

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const ch  = buffer.numberOfChannels;
  const sr  = buffer.sampleRate;
  const len = buffer.length;
  const bps = 2;
  const dataLen = len * ch * bps;
  const ab   = new ArrayBuffer(44 + dataLen);
  const view = new DataView(ab);
  const ws = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  ws(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true);
  ws(8, 'WAVE'); ws(12, 'fmt ');
  view.setUint32(16, 16, true);   view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);   view.setUint32(24, sr, true);
  view.setUint32(28, sr * ch * bps, true);
  view.setUint16(32, ch * bps, true); view.setUint16(34, 16, true);
  ws(36, 'data'); view.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(c)[i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return ab;
}

// ─── MP3 encoder via lamejs ───────────────────────────────────────────────────

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

function encodeMp3(buffer: AudioBuffer): Blob {
  const channels   = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const kbps       = 192;
  const mp3enc     = new lamejs.Mp3Encoder(Math.min(channels, 2), sampleRate, kbps);
  const blockSize  = 1152;
  const mp3Data: Int8Array[] = [];

  const left  = float32ToInt16(buffer.getChannelData(0));
  const right = channels > 1 ? float32ToInt16(buffer.getChannelData(1)) : left;

  for (let i = 0; i < left.length; i += blockSize) {
    const l = left.subarray(i, i + blockSize);
    const r = right.subarray(i, i + blockSize);
    const encoded = channels > 1 ? mp3enc.encodeBuffer(l, r) : mp3enc.encodeBuffer(l);
    if (encoded.length > 0) mp3Data.push(new Int8Array(encoded));
  }
  const tail = mp3enc.flush();
  if (tail.length > 0) mp3Data.push(new Int8Array(tail));
  return new Blob(mp3Data, { type: 'audio/mp3' });
}

// ─── MediaRecorder encoder (real-time, used for OGG / AAC) ───────────────────

async function encodeWithMediaRecorder(
  buffer: AudioBuffer,
  mimeType: string,
  ext: string,
): Promise<{ blob: Blob; ext: string }> {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mimeType)) {
    // Fallback to WAV when the browser can't natively encode the format
    const wav = encodeWav(buffer);
    return { blob: new Blob([wav], { type: 'audio/wav' }), ext: 'wav' };
  }
  return new Promise((resolve, reject) => {
    const ctx         = new AudioContext({ sampleRate: buffer.sampleRate });
    const destination = ctx.createMediaStreamDestination();
    const source      = ctx.createBufferSource();
    source.buffer     = buffer;
    source.connect(destination);

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(destination.stream, { mimeType });
    } catch {
      ctx.close();
      const wav = encodeWav(buffer);
      resolve({ blob: new Blob([wav], { type: 'audio/wav' }), ext: 'wav' });
      return;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      ctx.close();
      resolve({ blob: new Blob(chunks, { type: mimeType }), ext });
    };
    recorder.onerror = (e) => { ctx.close(); reject(e); };

    recorder.start(100);
    source.start(0);
    source.onended = () => setTimeout(() => recorder.stop(), 200);
  });
}

// ─── Unified audio buffer → target format ────────────────────────────────────

async function encodeAudioBuffer(
  buffer: AudioBuffer,
  targetFmt: string,
): Promise<{ blob: Blob; ext: string }> {
  switch (targetFmt) {
    case 'mp3': {
      const blob = encodeMp3(buffer);
      return { blob, ext: 'mp3' };
    }
    case 'ogg': {
      // Try ogg/opus (Firefox) then webm/opus (Chrome) — same codec, different container
      const ogg  = 'audio/ogg;codecs=opus';
      const webm = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(ogg)) {
        return encodeWithMediaRecorder(buffer, ogg, 'ogg');
      }
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(webm)) {
        return encodeWithMediaRecorder(buffer, webm, 'ogg');
      }
      // Fallback WAV
      const wav = encodeWav(buffer);
      return { blob: new Blob([wav], { type: 'audio/wav' }), ext: 'wav' };
    }
    case 'aac': {
      const mp4  = 'audio/mp4;codecs=mp4a.40.2';
      const mp4b = 'audio/mp4';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mp4)) {
        return encodeWithMediaRecorder(buffer, mp4, 'aac');
      }
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mp4b)) {
        return encodeWithMediaRecorder(buffer, mp4b, 'aac');
      }
      // Fallback WAV
      const wav = encodeWav(buffer);
      return { blob: new Blob([wav], { type: 'audio/wav' }), ext: 'wav' };
    }
    case 'flac':
    case 'wav':
    default: {
      const wav = encodeWav(buffer);
      const ext = targetFmt === 'flac' ? 'flac' : 'wav';
      return { blob: new Blob([wav], { type: 'audio/wav' }), ext };
    }
  }
}

// Trim an AudioBuffer to [start, end] seconds
function sliceAudioBuffer(buffer: AudioBuffer, start: number, end: number): AudioBuffer {
  const sr         = buffer.sampleRate;
  const startFrame = Math.floor(start * sr);
  const endFrame   = Math.min(Math.ceil(end * sr), buffer.length);
  const length     = Math.max(1, endFrame - startFrame);
  const out        = new AudioContext().createBuffer(buffer.numberOfChannels, length, sr);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    out.getChannelData(c).set(buffer.getChannelData(c).subarray(startFrame, endFrame));
  }
  return out;
}

// ─── Audio conversion ─────────────────────────────────────────────────────────

async function convertAudio(
  file: File, targetFmt: string, onProgress: (p: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  onProgress(10);
  const ab  = await file.arrayBuffer();
  onProgress(30);
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(ab);
  onProgress(55);
  ctx.close();
  onProgress(65);
  const result = await encodeAudioBuffer(buf, targetFmt);
  onProgress(95);
  return result;
}

// ─── Image conversion ─────────────────────────────────────────────────────────

async function convertImage(
  file: File, targetFmt: string, onProgress: (p: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  onProgress(15);
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
  URL.revokeObjectURL(url);
  onProgress(50);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  if (['jpg', 'jpeg', 'bmp'].includes(targetFmt)) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(img, 0, 0);
  onProgress(75);
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
  };
  const mime = mimeMap[targetFmt] ?? 'image/jpeg';
  const ext  = targetFmt === 'jpeg' ? 'jpg' : targetFmt;
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), mime, 0.95));
  onProgress(95);
  return { blob, ext };
}

// ─── Audio-only extraction from video ─────────────────────────────────────────

async function extractAudioFromVideo(
  file: File, trimStart: number, trimEnd: number,
  targetAudioFmt: string,
  onProgress: (p: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  onProgress(10);
  const ab  = await file.arrayBuffer();
  onProgress(35);
  const ctx = new AudioContext();
  let buf: AudioBuffer;
  try {
    buf = await ctx.decodeAudioData(ab);
  } catch {
    ctx.close();
    throw new Error('Could not decode audio from this video file — it may have no audio track.');
  }
  onProgress(55);
  ctx.close();
  const start  = Math.max(0, trimStart);
  const end    = trimEnd < 0 ? buf.duration : Math.min(trimEnd, buf.duration);
  const sliced = (start > 0 || end < buf.duration) ? sliceAudioBuffer(buf, start, end) : buf;
  onProgress(65);
  const result = await encodeAudioBuffer(sliced, targetAudioFmt);
  onProgress(95);
  return result;
}

// ─── Video conversion ─────────────────────────────────────────────────────────

function pickMime(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',      'video/webm;codecs=vp8',
    'video/webm',                 'video/mp4',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'video/webm';
}

async function convertVideo(
  file: File,
  targetFmt: string,
  trimStart: number,
  trimEnd: number,
  removeAudio: boolean,
  audioOnlyFmt: string,
  onProgress: (p: number) => void,
): Promise<{ blob: Blob; ext: string }> {
  // ── Audio-only mode ───────────────────────────────────────────────────────
  if (targetFmt === 'audio-only') {
    return extractAudioFromVideo(file, trimStart, trimEnd, audioOnlyFmt, onProgress);
  }

  // ── Video mode ────────────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    onProgress(5);
    const url     = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src         = url;
    videoEl.preload     = 'auto';
    videoEl.crossOrigin = 'anonymous';
    videoEl.playsInline = true;
    // Always mute the element — we capture audio via Web Audio API, not native output.
    // This prevents audio from leaking through speakers during conversion.
    videoEl.muted = true;

    videoEl.onloadedmetadata = () => {
      onProgress(10);
      const actualStart = Math.max(0, trimStart);
      const actualEnd   = trimEnd < 0 ? videoEl.duration : Math.min(trimEnd, videoEl.duration);
      const clipDur     = Math.max(0.1, actualEnd - actualStart);

      const W = videoEl.videoWidth  || 1280;
      const H = videoEl.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      // ── Audio capture via captureStream ────────────────────────────────────
      // We call captureStream() BEFORE seeking/playing so the browser registers
      // the element as a capture source immediately.
      // The `muted` attribute only suppresses speaker output — audio tracks in
      // the returned MediaStream are always live and carry real audio data.
      type AnyVideo = HTMLVideoElement & {
        captureStream?:    () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      };
      let audioTracks: MediaStreamTrack[] = [];
      if (!removeAudio) {
        try {
          const rawStream =
            (videoEl as AnyVideo).captureStream?.() ??
            (videoEl as AnyVideo).mozCaptureStream?.();
          if (rawStream) audioTracks = rawStream.getAudioTracks();
        } catch (_) { /* no audio — carry on */ }
      }

      const canvasStream = canvas.captureStream(60);
      const combined     = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ]);

      const chosenMime = pickMime();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(combined, {
          mimeType: chosenMime,
          videoBitsPerSecond: 8_000_000,
          audioBitsPerSecond: 192_000,
        });
      } catch (_) {
        try { recorder = new MediaRecorder(combined, { mimeType: chosenMime }); }
        catch (__) { recorder = new MediaRecorder(combined); }
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        const mimeUsed = recorder.mimeType || chosenMime;
        const ext = mimeUsed.includes('mp4') ? 'mp4' : 'webm';
        resolve({ blob: new Blob(chunks, { type: mimeUsed }), ext });
      };

      let rafId: number;
      let stopped = false;
      const stopRecording = () => {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(rafId);
        ctx.drawImage(videoEl, 0, 0, W, H);
        onProgress(96);
        // Give MediaRecorder a moment to flush its final chunk before stopping
        setTimeout(() => {
          try { if (recorder.state !== 'inactive') recorder.stop(); }
          catch (_) { /* already stopped */ }
        }, 300);
      };

      const drawFrame = () => {
        if (videoEl.currentTime >= actualEnd) {
          stopRecording();
          return;
        }
        ctx.drawImage(videoEl, 0, 0, W, H);
        const elapsed = Math.max(0, videoEl.currentTime - actualStart);
        onProgress(Math.min(10 + (elapsed / clipDur) * 85, 94));
        rafId = requestAnimationFrame(drawFrame);
      };

      videoEl.onplay  = () => { rafId = requestAnimationFrame(drawFrame); };
      // Safety net: video ended naturally (e.g. trimEnd == full duration)
      videoEl.onended = () => stopRecording();
      videoEl.onerror = (e) => reject(e);

      videoEl.currentTime = actualStart;
      videoEl.onseeked    = () => {
        recorder.start(100);
        videoEl.play().catch(reject);
      };
    };

    videoEl.onerror = reject;
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function getFileType(f: File): FileType {
  if (f.type.startsWith('image/')) return 'image';
  if (f.type.startsWith('audio/')) return 'audio';
  if (f.type.startsWith('video/')) return 'video';
  return 'image';
}

export function useFileConverter() {
  const [files,    setFiles]    = useState<File[]>([]);
  const [trimMap,  setTrimMap]  = useState<TrimMap>({});

  const [imageFormats,      setImageFormats]      = useState<string[]>(['webp']);
  const [audioFormats,      setAudioFormats]      = useState<string[]>(['wav']);
  const [videoFormats,      setVideoFormats]      = useState<string[]>(['webm']);
  const [videoAudioFormat,  setVideoAudioFormat]  = useState('wav');

  const [status,       setStatus]       = useState<ConversionStatus>('idle');
  const [progress,     setProgress]     = useState<ProgressState>({ current: 0, total: 0, percent: 0, fileName: '' });
  const [convertedMap, setConvertedMap] = useState<Record<string, ConvertedFile>>({});
  const [error,        setError]        = useState<string | null>(null);

  // Toggle a format in/out of a multi-select list (always keep at least one)
  const makeToggler = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    (fmt: string) =>
      setter((prev) =>
        prev.includes(fmt)
          ? prev.length > 1 ? prev.filter((f) => f !== fmt) : prev
          : [...prev, fmt],
      );

  const toggleImageFormat = useCallback(makeToggler(setImageFormats), []);
  const toggleAudioFormat = useCallback(makeToggler(setAudioFormats), []);
  const toggleVideoFormat = useCallback(makeToggler(setVideoFormats), []);

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const fresh = incoming.filter((f) => !names.has(f.name));
      setTrimMap((m) => {
        const next = { ...m };
        fresh.filter((f) => f.type.startsWith('video/')).forEach((f) => {
          if (!next[f.name]) next[f.name] = { start: 0, end: -1 };
        });
        return next;
      });
      return [...prev, ...fresh];
    });
    setError(null);
  }, []);

  const setTrim = useCallback((fileName: string, start: number, end: number) => {
    setTrimMap((m) => ({ ...m, [fileName]: { start, end } }));
  }, []);

  const removeFile = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setTrimMap((m) => { const n = { ...m }; delete n[name]; return n; });
    setConvertedMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (k.startsWith(`${name}::`)) delete next[k]; });
      return next;
    });
  }, []);

  const reorderFiles = useCallback((ordered: File[]) => setFiles(ordered), []);

  const clearAll = useCallback(() => {
    setFiles([]); setConvertedMap({}); setTrimMap({});
    setStatus('idle'); setError(null);
  }, []);

  const convert = useCallback(async () => {
    // Build list of (file, format) pairs that haven't been converted yet
    type Job = { file: File; format: string };
    const jobs: Job[] = [];
    for (const file of files) {
      const ftype = getFileType(file);
      const fmts  = ftype === 'image' ? imageFormats : ftype === 'audio' ? audioFormats : videoFormats;
      for (const fmt of fmts) {
        const key = `${file.name}::${fmt}`;
        if (!convertedMap[key]) jobs.push({ file, format: fmt });
      }
    }
    if (jobs.length === 0) return;

    setStatus('converting'); setError(null);
    const newConverted: Record<string, ConvertedFile> = {};

    for (let i = 0; i < jobs.length; i++) {
      const { file, format } = jobs[i];
      const ftype = getFileType(file);
      const label = format.toUpperCase();
      const fp    = (p: number) => setProgress({
        current: i + 1, total: jobs.length,
        percent: Math.round(((i / jobs.length) + (p / 100) / jobs.length) * 100),
        fileName: `${file.name} → ${label}`,
      });
      fp(0);
      try {
        let blob: Blob; let ext: string;
        if (ftype === 'audio') {
          ({ blob, ext } = await convertAudio(file, format, fp));
        } else if (ftype === 'video') {
          const trim = trimMap[file.name] ?? { start: 0, end: -1 };
          ({ blob, ext } = await convertVideo(file, format, trim.start, trim.end, false, videoAudioFormat, fp));
        } else {
          ({ blob, ext } = await convertImage(file, format, fp));
        }
        fp(99);
        const base = file.name.replace(/\.[^.]+$/, '');
        const outFileType: FileType = (format === 'audio-only' && ftype === 'video') ? 'audio' : ftype;
        const key = `${file.name}::${format}`;
        newConverted[key] = {
          name: `${base}.${ext}`, url: URL.createObjectURL(blob),
          size: blob.size, format: ext.toUpperCase(),
          originalName: file.name, fileType: outFileType,
        };
      } catch (err) {
        setError(`Failed to convert "${file.name}" → ${label}: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('error'); return;
      }
    }
    setProgress({ current: jobs.length, total: jobs.length, percent: 100, fileName: '' });
    setConvertedMap((prev) => ({ ...prev, ...newConverted }));
    setStatus('done');
  }, [files, convertedMap, trimMap, imageFormats, audioFormats, videoFormats, videoAudioFormat]);

  const results = Object.values(convertedMap);

  // Count total pending (file × format) jobs
  const pendingCount = files.reduce((acc, f) => {
    const ftype = getFileType(f);
    const fmts  = ftype === 'image' ? imageFormats : ftype === 'audio' ? audioFormats : videoFormats;
    return acc + fmts.filter((fmt) => !convertedMap[`${f.name}::${fmt}`]).length;
  }, 0);

  return {
    files, addFiles, removeFile, reorderFiles, clearAll,
    trimMap, setTrim,
    imageFormats, toggleImageFormat,
    audioFormats, toggleAudioFormat,
    videoFormats, toggleVideoFormat,
    videoAudioFormat, setVideoAudioFormat,
    status, progress, results, pendingCount, error, convert,
    hasImages: files.some((f) => getFileType(f) === 'image'),
    hasAudio:  files.some((f) => getFileType(f) === 'audio'),
    hasVideo:  files.some((f) => getFileType(f) === 'video'),
  };
}
