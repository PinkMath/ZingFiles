import { ConversionStatus, ProgressState } from '@/hooks/useFileConverter';
import { useEffect, useState } from 'react';

interface Props {
  status: ConversionStatus;
  progress: ProgressState;
  error: string | null;
}

const STATUS_MESSAGES: Record<string, string[]> = {
  converting: [
    'Reading file data…',
    'Decoding pixels…',
    'Applying format encoding…',
    'Optimising output…',
    'Almost there…',
  ],
};

export default function ConversionProgress({ status, progress, error }: Props) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (status !== 'converting') { setMsgIdx(0); return; }
    const id = setInterval(() => setMsgIdx((p) => (p + 1) % STATUS_MESSAGES.converting.length), 1200);
    return () => clearInterval(id);
  }, [status]);

  if (status === 'idle') return null;

  return (
    <section className="w-full max-w-4xl mx-auto px-4">
      <div
        className={`rounded-2xl border p-6 transition-all duration-500
          ${status === 'error'
            ? 'bg-red-500/5 border-red-500/20'
            : status === 'done'
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-orange-400/5 border-orange-400/20'
          }`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-base flex-shrink-0
                ${status === 'error' ? 'bg-red-500/20 text-red-400'
                  : status === 'done' ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-orange-400/20 text-orange-400'}`}
            >
              {status === 'error' && <i className="ri-error-warning-line"></i>}
              {status === 'done'  && <i className="ri-checkbox-circle-line"></i>}
              {status === 'converting' && (
                <i className="ri-loader-4-line animate-spin"></i>
              )}
            </div>
            <div className="min-w-0">
              <p className={`font-semibold text-sm font-['Space_Grotesk',sans-serif]
                ${status === 'error' ? 'text-red-400'
                  : status === 'done' ? 'text-emerald-400'
                  : 'text-orange-400'}`}>
                {status === 'error' ? 'Conversion failed'
                  : status === 'done' ? 'All done!'
                  : 'Converting…'}
              </p>
              <p className="text-white/30 text-xs truncate">
                {status === 'converting'
                  ? `${progress.current} / ${progress.total}  ·  ${progress.fileName}`
                  : status === 'done'
                  ? `${progress.total} file${progress.total > 1 ? 's' : ''} converted successfully`
                  : ''}
              </p>
            </div>
          </div>
          <span
            className={`text-xl sm:text-2xl font-bold tabular-nums flex-shrink-0 font-['Space_Grotesk',sans-serif]
              ${status === 'error' ? 'text-red-400'
                : status === 'done' ? 'text-emerald-400'
                : 'text-orange-400'}`}
          >
            {progress.percent}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out
              ${status === 'error' ? 'bg-red-400'
                : status === 'done' ? 'bg-emerald-400'
                : 'bg-gradient-to-r from-orange-500 to-orange-400'}`}
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        {/* Status message / error */}
        {status === 'converting' && (
          <p className="mt-3 text-white/25 text-xs flex items-center gap-1.5">
            <span className="w-3 h-3 flex items-center justify-center">
              <i className="ri-radio-button-line text-orange-400 animate-pulse"></i>
            </span>
            {STATUS_MESSAGES.converting[msgIdx]}
          </p>
        )}
        {status === 'error' && error && (
          <p className="mt-3 text-red-400/80 text-xs">{error}</p>
        )}
      </div>
    </section>
  );
}
