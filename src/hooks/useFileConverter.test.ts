import { describe, expect, it } from 'vitest';
import {
  ConversionError,
  requireFormat,
  validateEncodedOutput,
} from '@/utils/conversionValidation';
import { encodeMp3, encodeWav } from './useFileConverter';

function createAudioBuffer(
  channels: readonly Float32Array[],
  sampleRate: number,
): AudioBuffer {
  // Vitest runs in Node, so this small structural mock supplies only the
  // AudioBuffer fields consumed by the pure WAV and MP3 encoders.
  if (channels.length === 0) throw new Error('At least one channel is required.');
  const length = channels[0].length;
  if (channels.some((channel) => channel.length !== length)) {
    throw new Error('All test audio channels must have the same length.');
  }

  return {
    numberOfChannels: channels.length,
    sampleRate,
    length,
    duration: length / sampleRate,
    getChannelData(channel: number): Float32Array {
      const data = channels[channel];
      if (!data) throw new RangeError(`Audio channel ${channel} does not exist.`);
      return data;
    },
  } as AudioBuffer;
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
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

describe('encodeWav', () => {
  it('writes a genuine little-endian 16-bit PCM WAV header and interleaved samples', async () => {
    const buffer = createAudioBuffer(
      [
        new Float32Array([-1, 0, 1]),
        new Float32Array([0.5, -0.5, 0]),
      ],
      8_000,
    );

    const blob = encodeWav(buffer);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + 3 * 2 * 2);
    expect(readAscii(bytes, 0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(blob.size - 8);
    expect(readAscii(bytes, 8, 4)).toBe('WAVE');
    expect(readAscii(bytes, 12, 4)).toBe('fmt ');
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(8_000);
    expect(view.getUint32(28, true)).toBe(32_000);
    expect(view.getUint16(32, true)).toBe(4);
    expect(view.getUint16(34, true)).toBe(16);
    expect(readAscii(bytes, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(12);
    expect([
      view.getInt16(44, true),
      view.getInt16(46, true),
      view.getInt16(48, true),
      view.getInt16(50, true),
      view.getInt16(52, true),
      view.getInt16(54, true),
    ]).toEqual([-32_768, 16_383, 0, -16_384, 32_767, 0]);

    await expect(
      validateEncodedOutput(requireFormat('audio', 'wav'), blob),
    ).resolves.toMatchObject({ format: { id: 'wav' } });
  });
});

describe('encodeMp3', () => {
  it('uses the bundled encoder to produce MP3 frame bytes with the standard MIME type', async () => {
    const sampleRate = 44_100;
    const samples = Float32Array.from(
      { length: 4_608 },
      (_, index) => Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.25,
    );
    const blob = encodeMp3(createAudioBuffer([samples], sampleRate));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const startsWithId3 = readAscii(bytes, 0, 3) === 'ID3';
    const startsWithFrameSync = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;

    expect(blob.type).toBe('audio/mpeg');
    expect(blob.size).toBeGreaterThan(100);
    expect(startsWithId3 || startsWithFrameSync).toBe(true);
    expect(readAscii(bytes, 0, 4)).not.toBe('RIFF');

    await expect(
      validateEncodedOutput(requireFormat('audio', 'mp3'), blob),
    ).resolves.toMatchObject({ format: { id: 'mp3' } });
  });

  it('returns a clear unavailable error instead of silently dropping extra channels', () => {
    const channel = new Float32Array(1_152);
    const error = captureConversionError(() =>
      encodeMp3(createAudioBuffer([channel, channel, channel], 44_100)),
    );

    expect(error).toMatchObject({ code: 'FORMAT_UNAVAILABLE' });
    expect(error.message).toContain('mono and stereo');
  });
});
