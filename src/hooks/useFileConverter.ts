import { Mp3Encoder } from '@breezystack/lamejs';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_FORMATS,
  toggleFormatSelection,
  type AudioFormatId,
  type FormatId,
  type ImageFormatId,
  type MediaCategory,
  type OutputFormat,
  type VideoFormatId,
} from '@/config/formats';
import {
  buildUniqueOutputFileName,
  ConversionError,
  requireAvailableFormat,
  validateEncodedOutput,
  type EncodedOutput,
} from '@/utils/conversionValidation';
import {
  removeAndRevokeObjectUrls,
  revokeObjectUrls,
} from '@/utils/objectUrlRegistry';

export type ConversionStatus = 'idle' | 'converting' | 'done' | 'error';
export type FileType = MediaCategory;

export interface TrimSettings {
  start: number;
  end: number;
}

export type TrimMap = Record<string, TrimSettings>;

export interface ConvertedFile {
  name: string;
  url: string;
  size: number;
  format: string;
  formatId: FormatId;
  mimeType: string;
  originalName: string;
  fileType: FileType;
}

export interface ProgressState {
  current: number;
  total: number;
  percent: number;
  fileName: string;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frameCount = buffer.length;
  const bytesPerSample = 2;
  const dataLength = frameCount * channels * bytesPerSample;
  const output = new ArrayBuffer(44 + dataLength);
  const view = new DataView(output);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  const channelData = Array.from(
    { length: channels },
    (_, channel) => buffer.getChannelData(channel),
  );
  let offset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([output], { type: 'audio/wav' });
}

function float32ToInt16(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, input[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

export function encodeMp3(buffer: AudioBuffer): Blob {
  if (buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) {
    throw new ConversionError(
      'MP3 conversion currently supports mono and stereo audio only.',
      'FORMAT_UNAVAILABLE',
    );
  }

  const encoder = new Mp3Encoder(buffer.numberOfChannels, buffer.sampleRate, 192);
  const blockSize = 1152;
  const chunks: Uint8Array[] = [];
  const left = float32ToInt16(buffer.getChannelData(0));
  const right = buffer.numberOfChannels === 2
    ? float32ToInt16(buffer.getChannelData(1))
    : undefined;

  for (let offset = 0; offset < left.length; offset += blockSize) {
    const leftBlock = left.subarray(offset, offset + blockSize);
    const rightBlock = right?.subarray(offset, offset + blockSize);
    const encoded = encoder.encodeBuffer(leftBlock, rightBlock);
    if (encoded.length > 0) chunks.push(new Uint8Array(encoded));
  }

  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(new Uint8Array(tail));
  return new Blob(chunks, { type: 'audio/mpeg' });
}

async function convertAudio(
  file: File,
  format: OutputFormat,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<EncodedOutput> {
  const context = new AudioContext();
  try {
    signal.throwIfAborted();
    onProgress(10);
    const fileData = await file.arrayBuffer();
    signal.throwIfAborted();
    onProgress(30);
    let decoded: AudioBuffer;
    try {
      decoded = await context.decodeAudioData(fileData);
    } catch {
      throw new Error('This browser could not decode the source audio file.');
    }
    signal.throwIfAborted();
    onProgress(60);

    let blob: Blob;
    if (format.id === 'wav') {
      blob = encodeWav(decoded);
    } else if (format.id === 'mp3') {
      blob = encodeMp3(decoded);
    } else {
      throw new ConversionError(
        `${format.name} audio encoding is unavailable.`,
        'FORMAT_UNAVAILABLE',
      );
    }

    onProgress(90);
    return await validateEncodedOutput(format, blob);
  } finally {
    await context.close().catch(() => undefined);
  }
}

async function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      signal.removeEventListener('abort', abort);
      image.onload = null;
      image.onerror = null;
    };
    const abort = () => {
      cleanup();
      image.src = '';
      reject(signal.reason);
    };
    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('This browser could not decode the source image.'));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    image.src = url;
  });
  return image;
}

async function convertImage(
  file: File,
  format: OutputFormat,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<EncodedOutput> {
  const inputUrl = URL.createObjectURL(file);
  let image: HTMLImageElement | undefined;
  const canvas = document.createElement('canvas');
  try {
    onProgress(15);
    image = await loadImage(inputUrl, signal);
    signal.throwIfAborted();
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error('The source image has invalid dimensions.');
    }

    onProgress(45);
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas image conversion is unavailable in this browser.');

    if (format.id === 'jpg') {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0);
    onProgress(70);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error(`${format.name} encoding returned no data.`));
        },
        format.mimeType,
        0.92,
      );
    });

    signal.throwIfAborted();
    onProgress(90);
    return await validateEncodedOutput(format, blob);
  } finally {
    if (image) {
      image.onload = null;
      image.onerror = null;
      image.src = '';
    }
    canvas.width = 0;
    canvas.height = 0;
    URL.revokeObjectURL(inputUrl);
  }
}

type CapturableVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function readableBrowserError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message) return error;
  return new Error(fallback);
}

async function convertVideo(
  file: File,
  format: OutputFormat,
  recorderMimeType: string,
  trimStart: number,
  trimEnd: number,
  onProgress: (percent: number) => void,
  signal: AbortSignal,
): Promise<EncodedOutput> {
  return new Promise<EncodedOutput>((resolve, reject) => {
    const inputUrl = URL.createObjectURL(file);
    const video = document.createElement('video') as CapturableVideo;
    let sourceStream: MediaStream | undefined;
    let recorder: MediaRecorder | undefined;
    let progressTimer: ReturnType<typeof setInterval> | undefined;
    let watchdogTimer: ReturnType<typeof setTimeout> | undefined;
    let lastMediaTime = 0;
    let settled = false;
    let cleaned = false;
    let stopRequested = false;

    function abort() {
      fail(signal.reason, `${format.name} conversion was cancelled.`);
    }

    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      signal.removeEventListener('abort', abort);
      if (progressTimer !== undefined) clearInterval(progressTimer);
      if (watchdogTimer !== undefined) clearTimeout(watchdogTimer);
      sourceStream?.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // The browser already ended this captured track.
        }
      });
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== 'inactive') {
          try {
            recorder.stop();
          } catch {
            // The recorder is already stopping or failed before it became active.
          }
        }
      }
      try {
        video.pause();
      } catch {
        // The media element never reached a playable state.
      }
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.ontimeupdate = null;
      video.onended = null;
      video.onerror = null;
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        // Removing the source URL is sufficient when load() is unavailable.
      }
      URL.revokeObjectURL(inputUrl);
    }

    function fail(error: unknown, fallback: string) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(readableBrowserError(error, fallback));
    }

    function armWatchdog(timeout: number, message: string) {
      if (watchdogTimer !== undefined) clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => fail(undefined, message), timeout);
    }

    const chunks: Blob[] = [];
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true;

    video.onerror = () => {
      fail(undefined, 'This browser could not decode the source video file.');
    };

    video.onloadedmetadata = () => {
      try {
        if (!Number.isFinite(video.duration) || video.duration <= 0) {
          throw new Error('The source video duration is unavailable.');
        }
        const actualStart = Math.max(0, trimStart);
        const actualEnd = trimEnd < 0
          ? video.duration
          : Math.min(trimEnd, video.duration);
        if (actualEnd <= actualStart) {
          throw new Error('The selected video trim range is empty.');
        }

        const capture = video.captureStream ?? video.mozCaptureStream;
        if (!capture) {
          throw new ConversionError(
            'This browser cannot capture video media for WebM conversion.',
            'FORMAT_UNAVAILABLE',
          );
        }
        sourceStream = capture.call(video);
        if (sourceStream.getVideoTracks().length === 0) {
          throw new Error('The browser did not expose a capturable video track.');
        }
        if (sourceStream.getAudioTracks().length === 0) {
          throw new Error(
            'No capturable audio track was found. The conversion was stopped to avoid silently removing source audio.',
          );
        }

        try {
          recorder = new MediaRecorder(sourceStream, {
            mimeType: recorderMimeType,
            videoBitsPerSecond: 8_000_000,
            audioBitsPerSecond: 192_000,
          });
        } catch (error) {
          throw new ConversionError(
            `The browser reported ${format.name} support but could not start its encoder: ${readableBrowserError(error, 'unknown recorder error').message}`,
            'FORMAT_UNAVAILABLE',
          );
        }

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = () => {
          fail(undefined, `${format.name} recording failed in this browser.`);
        };
        recorder.onstop = () => {
          if (settled) return;
          settled = true;
          try {
            const actualMimeType = recorder?.mimeType ?? '';
            const outputBlob = new Blob(chunks, { type: actualMimeType });
            cleanup();
            void validateEncodedOutput(format, outputBlob).then(resolve, reject);
          } catch (error) {
            cleanup();
            reject(readableBrowserError(error, `${format.name} output could not be finalized.`));
          }
        };

        const stopRecording = () => {
          if (stopRequested || !recorder || recorder.state === 'inactive') return;
          stopRequested = true;
          video.pause();
          onProgress(95);
          armWatchdog(15_000, `${format.name} encoder did not finish the output file.`);
          try {
            recorder.stop();
          } catch (error) {
            fail(error, `${format.name} recording could not be stopped.`);
          }
        };
        const updateProgress = () => {
          if (stopRequested) return;
          const elapsed = Math.max(0, video.currentTime - actualStart);
          const clipDuration = actualEnd - actualStart;
          onProgress(Math.min(10 + (elapsed / clipDuration) * 84, 94));
          if (video.currentTime > lastMediaTime + 0.01) {
            lastMediaTime = video.currentTime;
            armWatchdog(30_000, `${format.name} conversion stalled during playback.`);
          }
          if (video.currentTime >= actualEnd) stopRecording();
        };

        video.ontimeupdate = updateProgress;
        video.onended = stopRecording;
        const beginRecording = () => {
          if (!recorder) return;
          try {
            recorder.start(250);
          } catch (error) {
            fail(error, `${format.name} recording could not start.`);
            return;
          }
          lastMediaTime = video.currentTime;
          armWatchdog(30_000, `${format.name} conversion stalled during playback.`);
          progressTimer = setInterval(updateProgress, 100);
          void video.play().catch((error) => {
            fail(error, 'The browser blocked video playback needed for conversion.');
          });
        };

        onProgress(10);
        armWatchdog(20_000, `${format.name} conversion could not start after loading the video.`);
        if (Math.abs(video.currentTime - actualStart) < 0.01) {
          beginRecording();
        } else {
          video.onseeked = () => {
            video.onseeked = null;
            beginRecording();
          };
          video.currentTime = actualStart;
        }
      } catch (error) {
        fail(error, `${format.name} conversion could not be initialized.`);
      }
    };

    onProgress(5);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    armWatchdog(20_000, 'The browser did not load the source video metadata in time.');
    video.src = inputUrl;
  });
}

export function getFileType(file: File): FileType | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

export function useFileConverter() {
  const [files, setFiles] = useState<File[]>([]);
  const [trimMap, setTrimMap] = useState<TrimMap>({});
  const [imageFormats, setImageFormats] = useState<ImageFormatId[]>([DEFAULT_FORMATS.image]);
  const [audioFormats, setAudioFormats] = useState<AudioFormatId[]>([DEFAULT_FORMATS.audio]);
  const [videoFormats, setVideoFormats] = useState<VideoFormatId[]>([DEFAULT_FORMATS.video]);
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total: 0,
    percent: 0,
    fileName: '',
  });
  const [convertedMap, setConvertedMap] = useState<Record<string, ConvertedFile>>({});
  const convertedMapRef = useRef<Record<string, ConvertedFile>>({});
  const activeConversionRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    convertedMapRef.current = convertedMap;
  }, [convertedMap]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      activeConversionRef.current?.abort(new DOMException('Conversion cancelled.', 'AbortError'));
      revokeObjectUrls(Object.values(convertedMapRef.current));
      convertedMapRef.current = {};
    };
  }, []);

  const toggleImageFormat = useCallback((format: ImageFormatId) => {
    setImageFormats((current) => toggleFormatSelection(current, format));
  }, []);
  const toggleAudioFormat = useCallback((format: AudioFormatId) => {
    setAudioFormats((current) => toggleFormatSelection(current, format));
  }, []);
  const toggleVideoFormat = useCallback((format: VideoFormatId) => {
    setVideoFormats((current) => toggleFormatSelection(current, format));
  }, []);

  const addFiles = useCallback((incoming: File[]) => {
    const accepted = incoming.filter((file) => getFileType(file) !== null);
    const rejected = incoming.filter((file) => getFileType(file) === null);

    setFiles((current) => {
      const names = new Set(current.map((file) => file.name));
      const fresh = accepted.filter((file) => !names.has(file.name));
      return [...current, ...fresh];
    });
    setTrimMap((current) => {
      const next = { ...current };
      for (const file of accepted) {
        if (getFileType(file) === 'video' && !next[file.name]) {
          next[file.name] = { start: 0, end: -1 };
        }
      }
      return next;
    });

    if (rejected.length > 0) {
      setError(`Unsupported file type: ${rejected.map((file) => file.name).join(', ')}.`);
      setStatus('error');
    } else {
      setError(null);
      setStatus((current) => current === 'error' ? 'idle' : current);
    }
  }, []);

  const setTrim = useCallback((fileName: string, start: number, end: number) => {
    setTrimMap((current) => ({ ...current, [fileName]: { start, end } }));
    setConvertedMap((current) => {
      const next = removeAndRevokeObjectUrls(
        current,
        (converted) => converted.originalName === fileName && converted.fileType === 'video',
      );
      convertedMapRef.current = next;
      return next;
    });
  }, []);

  const removeFile = useCallback((name: string) => {
    setFiles((current) => current.filter((file) => file.name !== name));
    setTrimMap((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setConvertedMap((current) => {
      const next = removeAndRevokeObjectUrls(
        current,
        (converted) => converted.originalName === name,
      );
      convertedMapRef.current = next;
      return next;
    });
  }, []);

  const reorderFiles = useCallback((ordered: File[]) => setFiles(ordered), []);

  const clearAll = useCallback(() => {
    activeConversionRef.current?.abort(new DOMException('Conversion cancelled.', 'AbortError'));
    activeConversionRef.current = null;
    revokeObjectUrls(Object.values(convertedMapRef.current));
    convertedMapRef.current = {};
    setFiles([]);
    setConvertedMap({});
    setTrimMap({});
    setProgress({ current: 0, total: 0, percent: 0, fileName: '' });
    setStatus('idle');
    setError(null);
  }, []);

  const convert = useCallback(async () => {
    type Job = { file: File; formatId: FormatId; category: FileType };
    const jobs: Job[] = [];
    for (const file of files) {
      const category = getFileType(file);
      if (!category) continue;
      const selectedFormats = category === 'image'
        ? imageFormats
        : category === 'audio'
          ? audioFormats
          : videoFormats;
      for (const formatId of selectedFormats) {
        if (!convertedMap[`${file.name}::${formatId}`]) {
          jobs.push({ file, formatId, category });
        }
      }
    }
    if (jobs.length === 0) return;

    activeConversionRef.current?.abort(new DOMException('A new conversion started.', 'AbortError'));
    const controller = new AbortController();
    activeConversionRef.current = controller;
    setStatus('converting');
    setError(null);

    for (let index = 0; index < jobs.length; index += 1) {
      const { file, formatId, category } = jobs[index];
      const updateProgress = (jobPercent: number) => {
        const overallPercent = Math.round(
          ((index / jobs.length) + (jobPercent / 100 / jobs.length)) * 100,
        );
        setProgress({
          current: index + 1,
          total: jobs.length,
          percent: overallPercent,
          fileName: `${file.name} → ${formatId.toUpperCase()}`,
        });
      };

      try {
        updateProgress(0);
        const { format, recorderMimeType } = requireAvailableFormat(category, formatId);
        let output: EncodedOutput;
        if (category === 'image') {
          output = await convertImage(file, format, updateProgress, controller.signal);
        } else if (category === 'audio') {
          output = await convertAudio(file, format, updateProgress, controller.signal);
        } else {
          const trim = trimMap[file.name] ?? { start: 0, end: -1 };
          if (!recorderMimeType) {
            throw new ConversionError(
              `${format.name} recording is unavailable in this browser.`,
              'FORMAT_UNAVAILABLE',
            );
          }
          output = await convertVideo(
            file,
            format,
            recorderMimeType,
            trim.start,
            trim.end,
            updateProgress,
            controller.signal,
          );
        }

        if (controller.signal.aborted || !mountedRef.current) return;
        updateProgress(99);
        const outputName = buildUniqueOutputFileName(
          file.name,
          output.format,
          Object.values(convertedMapRef.current).map((converted) => converted.name),
        );
        const converted: ConvertedFile = {
          name: outputName,
          url: URL.createObjectURL(output.blob),
          size: output.blob.size,
          format: output.format.name,
          formatId: output.format.id,
          mimeType: output.format.mimeType,
          originalName: file.name,
          fileType: category,
        };
        const key = `${file.name}::${formatId}`;
        const nextConvertedMap = { ...convertedMapRef.current, [key]: converted };
        convertedMapRef.current = nextConvertedMap;
        setConvertedMap(nextConvertedMap);
      } catch (caught) {
        if (controller.signal.aborted || !mountedRef.current) return;
        const message = readableBrowserError(caught, 'Unknown conversion error.').message;
        setError(`Failed to convert "${file.name}" to ${formatId.toUpperCase()}: ${message}`);
        setStatus('error');
        if (activeConversionRef.current === controller) activeConversionRef.current = null;
        return;
      }
    }

    setProgress({
      current: jobs.length,
      total: jobs.length,
      percent: 100,
      fileName: '',
    });
    setStatus('done');
    if (activeConversionRef.current === controller) activeConversionRef.current = null;
  }, [
    files,
    convertedMap,
    trimMap,
    imageFormats,
    audioFormats,
    videoFormats,
  ]);

  const pendingCount = files.reduce((total, file) => {
    const category = getFileType(file);
    if (!category) return total;
    const selectedFormats = category === 'image'
      ? imageFormats
      : category === 'audio'
        ? audioFormats
        : videoFormats;
    return total + selectedFormats.filter(
      (formatId) => !convertedMap[`${file.name}::${formatId}`],
    ).length;
  }, 0);

  return {
    files,
    addFiles,
    removeFile,
    reorderFiles,
    clearAll,
    trimMap,
    setTrim,
    imageFormats,
    toggleImageFormat,
    audioFormats,
    toggleAudioFormat,
    videoFormats,
    toggleVideoFormat,
    status,
    progress,
    results: Object.values(convertedMap),
    pendingCount,
    error,
    convert,
    hasImages: files.some((file) => getFileType(file) === 'image'),
    hasAudio: files.some((file) => getFileType(file) === 'audio'),
    hasVideo: files.some((file) => getFileType(file) === 'video'),
  };
}
