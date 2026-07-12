import { describe, expect, it, vi } from 'vitest';
import {
  removeAndRevokeObjectUrls,
  revokeObjectUrls,
} from './objectUrlRegistry';

interface TestResult {
  url: string;
  originalName: string;
  fileType: 'image' | 'video';
}

const RESULTS: Record<string, TestResult> = {
  image: { url: 'blob:image', originalName: 'photo.png', fileType: 'image' },
  video: { url: 'blob:video', originalName: 'clip.mp4', fileType: 'video' },
};

describe('object URL registry cleanup', () => {
  it('revokes every supplied URL', () => {
    const revoke = vi.fn();

    revokeObjectUrls(Object.values(RESULTS), revoke);

    expect(revoke.mock.calls).toEqual([['blob:image'], ['blob:video']]);
  });

  it('removes and revokes only stale results without mutating the current map', () => {
    const revoke = vi.fn();
    const next = removeAndRevokeObjectUrls(
      RESULTS,
      (result) => result.originalName === 'clip.mp4' && result.fileType === 'video',
      revoke,
    );

    expect(next).toEqual({ image: RESULTS.image });
    expect(RESULTS).toHaveProperty('video');
    expect(revoke).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:video');
  });
});
