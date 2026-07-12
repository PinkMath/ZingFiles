import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_FORMATS,
  OUTPUT_FORMATS,
  detectEncodingCapabilities,
  evaluateFormatAvailability,
  getEnabledFormatsByCategory,
  getFormatsByCategory,
  toggleFormatSelection,
  type EncodingCapabilities,
  type FormatId,
  type MediaCategory,
  type OutputFormat,
} from './formats';

const EXPECTED_FORMATS = [
  { id: 'jpg', category: 'image', extension: 'jpg', mimeType: 'image/jpeg', enabled: true },
  { id: 'png', category: 'image', extension: 'png', mimeType: 'image/png', enabled: true },
  { id: 'webp', category: 'image', extension: 'webp', mimeType: 'image/webp', enabled: true },
  { id: 'gif', category: 'image', extension: 'gif', mimeType: 'image/gif', enabled: false },
  { id: 'bmp', category: 'image', extension: 'bmp', mimeType: 'image/bmp', enabled: false },
  { id: 'mp3', category: 'audio', extension: 'mp3', mimeType: 'audio/mpeg', enabled: true },
  { id: 'wav', category: 'audio', extension: 'wav', mimeType: 'audio/wav', enabled: true },
  { id: 'flac', category: 'audio', extension: 'flac', mimeType: 'audio/flac', enabled: false },
  { id: 'ogg', category: 'audio', extension: 'ogg', mimeType: 'audio/ogg', enabled: false },
  { id: 'aac', category: 'audio', extension: 'aac', mimeType: 'audio/aac', enabled: false },
  { id: 'mp4', category: 'video', extension: 'mp4', mimeType: 'video/mp4', enabled: false },
  { id: 'webm', category: 'video', extension: 'webm', mimeType: 'video/webm', enabled: true },
] as const;

function getFormat(id: FormatId): OutputFormat {
  const format = OUTPUT_FORMATS.find((candidate) => candidate.id === id);
  if (!format) throw new Error(`Missing test fixture for ${id}.`);
  return format;
}

function capabilities({
  canvasMimeTypes = [],
  mediaRecorderMimeTypes = [],
  mediaElementCaptureStream = true,
}: {
  canvasMimeTypes?: readonly string[];
  mediaRecorderMimeTypes?: readonly string[];
  mediaElementCaptureStream?: boolean;
} = {}): EncodingCapabilities {
  return {
    canvasMimeTypes: new Set(canvasMimeTypes),
    mediaRecorderMimeTypes: new Set(mediaRecorderMimeTypes),
    mediaElementCaptureStream,
  };
}

describe('output format configuration', () => {
  it('defines the audited extension, MIME, category, and enabled policy', () => {
    expect(
      OUTPUT_FORMATS.map(({ id, category, extension, mimeType, enabled }) => ({
        id,
        category,
        extension,
        mimeType,
        enabled,
      })),
    ).toEqual(EXPECTED_FORMATS);
  });

  it('keeps format ids and category-extension pairs unique', () => {
    const ids = OUTPUT_FORMATS.map((format) => format.id);
    const categoryExtensions = OUTPUT_FORMATS.map(
      (format) => `${format.category}:${format.extension}`,
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(categoryExtensions).size).toBe(categoryExtensions.length);
  });

  it('keeps defaults enabled, in-category, and backed by real encoding methods', () => {
    for (const category of ['image', 'audio', 'video'] as const) {
      const defaultFormat = getFormat(DEFAULT_FORMATS[category]);
      expect(defaultFormat.category).toBe(category);
      expect(defaultFormat.enabled).toBe(true);
      expect(defaultFormat.encodingMethod).not.toBe('unavailable');
    }

    for (const format of OUTPUT_FORMATS) {
      if (format.enabled) {
        expect(format.encodingMethod).not.toBe('unavailable');
      } else {
        expect(format.disabledReason).toBeTruthy();
      }
    }
  });

  it.each<{
    category: MediaCategory;
    all: readonly FormatId[];
    enabled: readonly FormatId[];
  }>([
    {
      category: 'image',
      all: ['jpg', 'png', 'webp', 'gif', 'bmp'],
      enabled: ['jpg', 'png', 'webp'],
    },
    {
      category: 'audio',
      all: ['mp3', 'wav', 'flac', 'ogg', 'aac'],
      enabled: ['mp3', 'wav'],
    },
    {
      category: 'video',
      all: ['mp4', 'webm'],
      enabled: ['webm'],
    },
  ])('filters $category formats without reintroducing disabled choices', ({ category, all, enabled }) => {
    expect(getFormatsByCategory(category).map((format) => format.id)).toEqual(all);
    expect(getEnabledFormatsByCategory(category).map((format) => format.id)).toEqual(enabled);
  });

  it('requires exact Canvas MIME support for conditional WebP', () => {
    const webp = getFormat('webp');

    expect(
      evaluateFormatAvailability(
        webp,
        capabilities({ canvasMimeTypes: ['image/png'] }),
      ),
    ).toMatchObject({ available: false });

    expect(
      evaluateFormatAvailability(
        webp,
        capabilities({ canvasMimeTypes: ['image/webp'] }),
      ),
    ).toEqual({ available: true });
  });

  it('does not treat MP4 recorder support as WebM support', () => {
    const webm = getFormat('webm');
    const mp4Only = capabilities({ mediaRecorderMimeTypes: ['video/mp4'] });

    expect(evaluateFormatAvailability(webm, mp4Only)).toMatchObject({
      available: false,
    });

    const exactWebmMime = 'video/webm;codecs=vp8,opus';
    expect(
      evaluateFormatAvailability(
        webm,
        capabilities({ mediaRecorderMimeTypes: [exactWebmMime] }),
      ),
    ).toEqual({ available: true, recorderMimeType: exactWebmMime });
  });

  it('locks WebM when source media capture is missing', () => {
    const webm = getFormat('webm');
    const result = evaluateFormatAvailability(
      webm,
      capabilities({
        mediaRecorderMimeTypes: ['video/webm'],
        mediaElementCaptureStream: false,
      }),
    );

    expect(result.available).toBe(false);
    expect(result.reason).toContain('preserve the source video audio');
  });

  it('keeps disabled formats unavailable even when a browser reports a matching MIME', () => {
    const mp4 = getFormat('mp4');
    const result = evaluateFormatAvailability(
      mp4,
      capabilities({ mediaRecorderMimeTypes: ['video/mp4'] }),
    );

    expect(result.available).toBe(false);
    expect(result.reason).toContain('Unavailable');
  });

  it('treats an older MediaRecorder without a capability probe as unavailable', () => {
    vi.stubGlobal('MediaRecorder', class MediaRecorderWithoutTypeProbe {});
    try {
      expect(() => detectEncodingCapabilities()).not.toThrow();
      expect(detectEncodingCapabilities().mediaRecorderMimeTypes.size).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('toggleFormatSelection', () => {
  it('adds a new format without mutating the current selection', () => {
    const current: readonly FormatId[] = ['jpg'];

    expect(toggleFormatSelection(current, 'png')).toEqual(['jpg', 'png']);
    expect(current).toEqual(['jpg']);
  });

  it('removes a selected format when another selection remains', () => {
    expect(toggleFormatSelection<FormatId>(['jpg', 'png'], 'jpg')).toEqual(['png']);
  });

  it('does not remove the sole selected format', () => {
    expect(toggleFormatSelection<FormatId>(['wav'], 'wav')).toEqual(['wav']);
  });
});
