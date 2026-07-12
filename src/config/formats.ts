export type MediaCategory = 'image' | 'audio' | 'video';

export type ImageFormatId = 'jpg' | 'png' | 'webp' | 'gif' | 'bmp';
export type AudioFormatId = 'mp3' | 'wav' | 'flac' | 'ogg' | 'aac';
export type VideoFormatId = 'mp4' | 'webm';
export type FormatId = ImageFormatId | AudioFormatId | VideoFormatId;

export type EncodingMethod =
  | 'canvas'
  | 'lamejs'
  | 'pcm-wav'
  | 'media-recorder'
  | 'unavailable';

export interface OutputFormat {
  readonly id: FormatId;
  readonly name: string;
  readonly extension: string;
  readonly mimeType: string;
  readonly category: MediaCategory;
  readonly enabled: boolean;
  readonly encodingMethod: EncodingMethod;
  readonly methodDescription: string;
  readonly description: string;
  readonly aliases?: readonly string[];
  readonly mediaRecorderMimeTypes?: readonly string[];
  readonly browserSupport?: string;
  readonly disabledReason?: string;
}

export const OUTPUT_FORMATS: readonly OutputFormat[] = [
  {
    id: 'jpg',
    name: 'JPG',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    category: 'image',
    enabled: true,
    encodingMethod: 'canvas',
    methodDescription: 'Canvas JPEG encoder',
    description: 'Compact, widely supported photo format',
    aliases: ['jpeg'],
  },
  {
    id: 'png',
    name: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    category: 'image',
    enabled: true,
    encodingMethod: 'canvas',
    methodDescription: 'Canvas PNG encoder',
    description: 'Lossless image with transparency',
  },
  {
    id: 'webp',
    name: 'WebP',
    extension: 'webp',
    mimeType: 'image/webp',
    category: 'image',
    enabled: true,
    encodingMethod: 'canvas',
    methodDescription: 'Canvas WebP encoder',
    description: 'Modern image format with small files',
    browserSupport: 'Available only when this browser can encode WebP with Canvas.',
  },
  {
    id: 'gif',
    name: 'GIF',
    extension: 'gif',
    mimeType: 'image/gif',
    category: 'image',
    enabled: false,
    encodingMethod: 'unavailable',
    methodDescription: 'No GIF encoder is bundled',
    description: 'Graphics Interchange Format',
    disabledReason: 'Unavailable: Canvas does not encode GIF, and animation would be lost.',
  },
  {
    id: 'bmp',
    name: 'BMP',
    extension: 'bmp',
    mimeType: 'image/bmp',
    category: 'image',
    enabled: false,
    encodingMethod: 'unavailable',
    methodDescription: 'No BMP encoder is bundled',
    description: 'Uncompressed bitmap image',
    disabledReason: 'Unavailable: browsers do not provide a reliable Canvas BMP encoder.',
  },
  {
    id: 'mp3',
    name: 'MP3',
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    category: 'audio',
    enabled: true,
    encodingMethod: 'lamejs',
    methodDescription: 'LAME MP3 encoder',
    description: 'Popular compressed audio format',
  },
  {
    id: 'wav',
    name: 'WAV',
    extension: 'wav',
    mimeType: 'audio/wav',
    category: 'audio',
    enabled: true,
    encodingMethod: 'pcm-wav',
    methodDescription: 'Built-in 16-bit PCM WAV encoder',
    description: 'Uncompressed PCM audio',
  },
  {
    id: 'flac',
    name: 'FLAC',
    extension: 'flac',
    mimeType: 'audio/flac',
    category: 'audio',
    enabled: false,
    encodingMethod: 'unavailable',
    methodDescription: 'No FLAC encoder is bundled',
    description: 'Lossless compressed audio',
    disabledReason: 'Unavailable: ZingFiles does not yet include a FLAC encoder.',
  },
  {
    id: 'ogg',
    name: 'OGG',
    extension: 'ogg',
    mimeType: 'audio/ogg',
    category: 'audio',
    enabled: false,
    encodingMethod: 'unavailable',
    methodDescription: 'No cross-browser Ogg encoder is bundled',
    description: 'Open Ogg container with Opus audio',
    disabledReason: 'Unavailable: reliable Ogg encoding is not supported across the target browsers.',
  },
  {
    id: 'aac',
    name: 'AAC',
    extension: 'aac',
    mimeType: 'audio/aac',
    category: 'audio',
    enabled: false,
    encodingMethod: 'unavailable',
    methodDescription: 'No raw AAC encoder is bundled',
    description: 'Advanced Audio Coding stream',
    disabledReason: 'Unavailable: browser recording usually creates an MP4 container, not a genuine .aac file.',
  },
  {
    id: 'mp4',
    name: 'MP4',
    extension: 'mp4',
    mimeType: 'video/mp4',
    category: 'video',
    enabled: false,
    encodingMethod: 'unavailable',
    methodDescription: 'No reliable MP4 encoder is bundled',
    description: 'MP4 video container',
    disabledReason: 'Unavailable: browser MP4 recording is not reliable enough for Phase 1.',
  },
  {
    id: 'webm',
    name: 'WebM',
    extension: 'webm',
    mimeType: 'video/webm',
    category: 'video',
    enabled: true,
    encodingMethod: 'media-recorder',
    methodDescription: 'MediaRecorder WebM encoder',
    description: 'Browser-native WebM video',
    mediaRecorderMimeTypes: [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ],
    browserSupport: 'Requires exact WebM recording plus capturable video and audio tracks in this browser.',
  },
] as const;

export interface EncodingCapabilities {
  readonly canvasMimeTypes: ReadonlySet<string>;
  readonly mediaRecorderMimeTypes: ReadonlySet<string>;
  readonly mediaElementCaptureStream: boolean;
}

export interface FormatAvailability {
  readonly available: boolean;
  readonly reason?: string;
  readonly recorderMimeType?: string;
}

export const DEFAULT_FORMATS = {
  image: 'png',
  audio: 'wav',
  video: 'webm',
} as const satisfies Record<MediaCategory, FormatId>;

export function normalizeMimeType(mimeType: string): string {
  return mimeType.split(';', 1)[0].trim().toLowerCase();
}

export function getFormatsByCategory(category: MediaCategory): readonly OutputFormat[] {
  return OUTPUT_FORMATS.filter((format) => format.category === category);
}

export function getEnabledFormatsByCategory(category: MediaCategory): readonly OutputFormat[] {
  return getFormatsByCategory(category).filter((format) => format.enabled);
}

export function getFormatById(id: string): OutputFormat | undefined {
  const normalizedId = id.toLowerCase();
  return OUTPUT_FORMATS.find(
    (format) => format.id === normalizedId || format.aliases?.includes(normalizedId),
  );
}

export function getFormat(category: MediaCategory, id: string): OutputFormat | undefined {
  const format = getFormatById(id);
  return format?.category === category ? format : undefined;
}

export function detectEncodingCapabilities(): EncodingCapabilities {
  const canvasMimeTypes = new Set<string>();
  const mediaRecorderMimeTypes = new Set<string>();
  let mediaElementCaptureStream = false;

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    for (const format of OUTPUT_FORMATS) {
      if (format.enabled && format.encodingMethod === 'canvas') {
        try {
          const encoded = canvas.toDataURL(format.mimeType);
          if (encoded.toLowerCase().startsWith(`data:${format.mimeType}`)) {
            canvasMimeTypes.add(format.mimeType);
          }
        } catch {
          // The availability result below carries the user-facing explanation.
        }
      }
    }
    canvas.width = 0;
    canvas.height = 0;
  }

  if (typeof HTMLMediaElement !== 'undefined') {
    const mediaPrototype = HTMLMediaElement.prototype as HTMLMediaElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    mediaElementCaptureStream =
      typeof mediaPrototype.captureStream === 'function' ||
      typeof mediaPrototype.mozCaptureStream === 'function';
  }

  if (
    typeof MediaRecorder !== 'undefined' &&
    typeof MediaRecorder.isTypeSupported === 'function'
  ) {
    for (const format of OUTPUT_FORMATS) {
      for (const mimeType of format.mediaRecorderMimeTypes ?? []) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          mediaRecorderMimeTypes.add(mimeType);
        }
      }
    }
  }

  return {
    canvasMimeTypes,
    mediaRecorderMimeTypes,
    mediaElementCaptureStream,
  };
}

export function evaluateFormatAvailability(
  format: OutputFormat,
  capabilities: EncodingCapabilities,
): FormatAvailability {
  if (!format.enabled) {
    return { available: false, reason: format.disabledReason ?? `${format.name} conversion is unavailable.` };
  }

  if (format.encodingMethod === 'canvas') {
    const available = capabilities.canvasMimeTypes.has(format.mimeType);
    return available
      ? { available: true }
      : {
          available: false,
          reason: format.browserSupport ?? `This browser cannot encode ${format.name} images.`,
        };
  }

  if (format.encodingMethod === 'media-recorder') {
    if (format.category === 'video' && !capabilities.mediaElementCaptureStream) {
      return {
        available: false,
        reason: 'This browser cannot preserve the source video audio during conversion.',
      };
    }
    const recorderMimeType = format.mediaRecorderMimeTypes?.find((mimeType) =>
      capabilities.mediaRecorderMimeTypes.has(mimeType),
    );
    return recorderMimeType
      ? { available: true, recorderMimeType }
      : {
          available: false,
          reason: format.browserSupport ?? `This browser cannot encode ${format.name}.`,
        };
  }

  return { available: true };
}

export function getFormatAvailability(
  format: OutputFormat,
  capabilities = detectEncodingCapabilities(),
): FormatAvailability {
  return evaluateFormatAvailability(format, capabilities);
}

export function toggleFormatSelection<T extends string>(
  current: readonly T[],
  requested: T,
): T[] {
  if (!current.includes(requested)) return [...current, requested];
  if (current.length === 1) return [...current];
  return current.filter((format) => format !== requested);
}
