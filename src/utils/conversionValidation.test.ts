import { describe, expect, it, vi } from 'vitest';
import {
  OUTPUT_FORMATS,
  type EncodingCapabilities,
  type FormatId,
  type OutputFormat,
} from '@/config/formats';
import {
  buildOutputFileName,
  buildUniqueOutputFileName,
  ConversionError,
  requireAvailableFormat,
  requireFormat,
  validateEncodedOutput,
} from './conversionValidation';

const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const WEBP_SIGNATURE = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
]);
const WEBM_SIGNATURE = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);

function getConfiguredFormat(id: FormatId): OutputFormat {
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

function captureConversionError(action: () => unknown): ConversionError {
  try {
    action();
  } catch (error) {
    if (error instanceof ConversionError) return error;
    throw error;
  }
  throw new Error('Expected a ConversionError, but the operation succeeded.');
}

async function captureRejectedConversionError(
  operation: Promise<unknown>,
): Promise<ConversionError> {
  try {
    await operation;
  } catch (error) {
    if (error instanceof ConversionError) return error;
    throw error;
  }
  throw new Error('Expected a ConversionError, but the operation succeeded.');
}

describe('format request validation', () => {
  it('accepts aliases only within the requested media category', () => {
    expect(requireFormat('image', 'jpeg')).toMatchObject({
      id: 'jpg',
      extension: 'jpg',
      mimeType: 'image/jpeg',
    });

    const categoryMismatch = captureConversionError(() =>
      requireFormat('audio', 'jpeg'),
    );
    expect(categoryMismatch).toMatchObject({ code: 'UNKNOWN_FORMAT' });
    expect(categoryMismatch.message).toContain('Unknown audio output format');
  });

  it('rejects an unknown output rather than defaulting to another encoder', () => {
    const error = captureConversionError(() => requireFormat('image', 'tiff'));

    expect(error).toMatchObject({ code: 'UNKNOWN_FORMAT' });
    expect(error.message).toContain('tiff');
  });

  it('rejects a FLAC request before an encoder can return WAV data', () => {
    const encoder = vi.fn();
    const error = captureConversionError(() => {
      const { format } = requireAvailableFormat('audio', 'flac', capabilities());
      encoder(format);
    });

    expect(error).toMatchObject({ code: 'FORMAT_DISABLED' });
    expect(error.message).toContain('FLAC encoder');
    expect(encoder).not.toHaveBeenCalled();
  });

  it('requires target-specific WebM recorder support', () => {
    const error = captureConversionError(() =>
      requireAvailableFormat(
        'video',
        'webm',
        capabilities({ mediaRecorderMimeTypes: ['video/mp4'] }),
      ),
    );

    expect(error).toMatchObject({ code: 'FORMAT_UNAVAILABLE' });
    expect(error.message).toContain('WebM');

    const recorderMimeType = 'video/webm;codecs=vp9';
    expect(
      requireAvailableFormat(
        'video',
        'webm',
        capabilities({ mediaRecorderMimeTypes: [recorderMimeType] }),
      ),
    ).toMatchObject({ format: { id: 'webm' }, recorderMimeType });
  });
});

describe('encoded output validation', () => {
  it('accepts a non-empty output whose MIME and signature match the request', async () => {
    const webp = requireFormat('image', 'webp');
    const blob = new Blob([WEBP_SIGNATURE], { type: 'image/webp' });

    await expect(validateEncodedOutput(webp, blob)).resolves.toEqual({
      blob,
      format: webp,
    });
  });

  it('rejects PNG-as-WebP when Canvas reports the fallback MIME', async () => {
    const webp = requireFormat('image', 'webp');
    const pngFallback = new Blob([PNG_SIGNATURE], { type: 'image/png' });
    const error = await captureRejectedConversionError(
      validateEncodedOutput(webp, pngFallback),
    );

    expect(error).toMatchObject({ code: 'MIME_MISMATCH' });
    expect(error.message).toContain('silent format fallback');
    expect(error.message).toContain('image/png');
    expect(error.message).toContain('image/webp');
  });

  it('rejects PNG bytes disguised with a WebP MIME type', async () => {
    const webp = requireFormat('image', 'webp');
    const disguisedPng = new Blob([PNG_SIGNATURE], { type: 'image/webp' });
    const error = await captureRejectedConversionError(
      validateEncodedOutput(webp, disguisedPng),
    );

    expect(error).toMatchObject({ code: 'BINARY_MISMATCH' });
    expect(error.message).toContain('valid WebP file signature');
  });

  it('rejects WebM bytes disguised as MP4', async () => {
    const mp4 = getConfiguredFormat('mp4');
    const disguisedWebm = new Blob([WEBM_SIGNATURE], { type: 'video/mp4' });
    const error = await captureRejectedConversionError(
      validateEncodedOutput(mp4, disguisedWebm),
    );

    expect(error).toMatchObject({ code: 'BINARY_MISMATCH' });
    expect(error.message).toContain('valid MP4 file signature');
  });

  it('accepts genuine WebM header bytes with a codec-qualified MIME type', async () => {
    const webm = requireFormat('video', 'webm');
    const blob = new Blob([WEBM_SIGNATURE], {
      type: 'video/webm;codecs=vp8,opus',
    });

    await expect(validateEncodedOutput(webm, blob)).resolves.toEqual({
      blob,
      format: webm,
    });
  });

  it('rejects empty encoder output with a clear error code', async () => {
    const png = requireFormat('image', 'png');
    const error = await captureRejectedConversionError(
      validateEncodedOutput(png, new Blob([], { type: 'image/png' })),
    );

    expect(error).toMatchObject({ code: 'EMPTY_OUTPUT' });
    expect(error.message).toContain('empty file');
  });
});

describe('output file names', () => {
  it('replaces only the final input extension with the canonical extension', () => {
    const jpg = requireFormat('image', 'jpg');

    expect(buildOutputFileName('holiday.photo.jpeg', jpg)).toBe('holiday.photo.jpg');
    expect(buildOutputFileName('extensionless', jpg)).toBe('extensionless.jpg');
  });

  it('creates a case-insensitively unique output name without changing its extension', () => {
    const webm = requireFormat('video', 'webm');
    const existing = ['CLIP.webm', 'clip (2).webm'];

    expect(buildUniqueOutputFileName('clip.mp4', webm, existing)).toBe('clip (3).webm');
  });
});
