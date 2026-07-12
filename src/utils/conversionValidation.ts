import {
  detectEncodingCapabilities,
  evaluateFormatAvailability,
  getFormat,
  normalizeMimeType,
  type EncodingCapabilities,
  type FormatId,
  type MediaCategory,
  type OutputFormat,
} from '@/config/formats';

export type ConversionErrorCode =
  | 'UNKNOWN_FORMAT'
  | 'FORMAT_DISABLED'
  | 'FORMAT_UNAVAILABLE'
  | 'EMPTY_OUTPUT'
  | 'MIME_MISMATCH'
  | 'BINARY_MISMATCH';

export class ConversionError extends Error {
  readonly code: ConversionErrorCode;

  constructor(
    message: string,
    code: ConversionErrorCode,
  ) {
    super(message);
    this.name = 'ConversionError';
    this.code = code;
  }
}

export interface EncodedOutput {
  readonly blob: Blob;
  readonly format: OutputFormat;
}

export function requireFormat(category: MediaCategory, id: string): OutputFormat {
  const format = getFormat(category, id);
  if (!format) {
    throw new ConversionError(
      `Unknown ${category} output format "${id}".`,
      'UNKNOWN_FORMAT',
    );
  }
  if (!format.enabled) {
    throw new ConversionError(
      format.disabledReason ?? `${format.name} conversion is unavailable.`,
      'FORMAT_DISABLED',
    );
  }
  return format;
}

export function requireAvailableFormat(
  category: MediaCategory,
  id: string,
  capabilities: EncodingCapabilities = detectEncodingCapabilities(),
): { format: OutputFormat; recorderMimeType?: string } {
  const format = requireFormat(category, id);
  const availability = evaluateFormatAvailability(format, capabilities);
  if (!availability.available) {
    throw new ConversionError(
      availability.reason ?? `${format.name} conversion is unavailable in this browser.`,
      'FORMAT_UNAVAILABLE',
    );
  }
  return { format, recorderMimeType: availability.recorderMimeType };
}

export function buildOutputFileName(inputName: string, format: OutputFormat): string {
  const baseName = inputName.replace(/\.[^.]+$/, '') || inputName;
  return `${baseName}.${format.extension}`;
}

export function buildUniqueOutputFileName(
  inputName: string,
  format: OutputFormat,
  existingNames: Iterable<string>,
): string {
  const desiredName = buildOutputFileName(inputName, format);
  const names = new Set(Array.from(existingNames, (name) => name.toLowerCase()));
  if (!names.has(desiredName.toLowerCase())) return desiredName;

  const suffix = `.${format.extension}`;
  const baseName = desiredName.slice(0, -suffix.length);
  let copyNumber = 2;
  let candidate = `${baseName} (${copyNumber})${suffix}`;
  while (names.has(candidate.toLowerCase())) {
    copyNumber += 1;
    candidate = `${baseName} (${copyNumber})${suffix}`;
  }
  return candidate;
}

function startsWith(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  return expected.every((byte, index) => bytes[offset + index] === byte);
}

function hasExpectedSignature(formatId: FormatId, bytes: Uint8Array): boolean {
  switch (formatId) {
    case 'jpg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'webp':
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8);
    case 'gif':
      return startsWith(bytes, [0x47, 0x49, 0x46, 0x38]);
    case 'bmp':
      return startsWith(bytes, [0x42, 0x4d]);
    case 'mp3':
      return startsWith(bytes, [0x49, 0x44, 0x33]) || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
    case 'wav':
      return startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x41, 0x56, 0x45], 8);
    case 'flac':
      return startsWith(bytes, [0x66, 0x4c, 0x61, 0x43]);
    case 'ogg':
      return startsWith(bytes, [0x4f, 0x67, 0x67, 0x53]);
    case 'aac':
      return (bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0);
    case 'mp4':
      return startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4);
    case 'webm':
      return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
  }
}

export async function validateEncodedOutput(
  format: OutputFormat,
  blob: Blob,
): Promise<EncodedOutput> {
  if (blob.size === 0) {
    throw new ConversionError(
      `${format.name} encoding produced an empty file.`,
      'EMPTY_OUTPUT',
    );
  }

  const actualMimeType = normalizeMimeType(blob.type);
  const expectedMimeType = normalizeMimeType(format.mimeType);
  if (actualMimeType !== expectedMimeType) {
    throw new ConversionError(
      `${format.name} encoding returned ${actualMimeType || 'an unknown MIME type'} instead of ${expectedMimeType}; the output was rejected to prevent a silent format fallback.`,
      'MIME_MISMATCH',
    );
  }

  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  if (!hasExpectedSignature(format.id, header)) {
    throw new ConversionError(
      `${format.name} encoding did not produce a valid ${format.name} file signature; the output was rejected.`,
      'BINARY_MISMATCH',
    );
  }

  return { blob, format };
}
