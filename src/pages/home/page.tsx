import { useFileConverter } from '@/hooks/useFileConverter';
import Header from './components/Header';
import UploadArea from './components/UploadArea';
import VideoTrimmer from './components/VideoTrimmer';
import FormatSelection from './components/FormatSelection';
import ConversionProgress from './components/ConversionProgress';
import DownloadLinks from './components/DownloadLinks';
import Footer from './components/Footer';

export default function Home() {
  const {
    files, addFiles, removeFile, reorderFiles, clearAll,
    trimMap, setTrim,
    imageFormats, toggleImageFormat,
    audioFormats, toggleAudioFormat,
    videoFormats, toggleVideoFormat,
    videoAudioFormat, setVideoAudioFormat,
    status, progress, results, pendingCount, error,
    convert, hasImages, hasAudio, hasVideo,
  } = useFileConverter();

  const videoFiles = files.filter((f) => f.type.startsWith('video/'));

  const isConverting = status === 'converting';

  const handleReset = () => {
    clearAll();
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-['Inter',sans-serif]">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <Header />

      {/* ─── Main content ────────────────────────────────────────────── */}
      <main className="flex-1 w-full py-6 md:py-12">
        <div className="max-w-4xl mx-auto px-4 mb-6 md:mb-10 text-center">
          <p className="text-white/20 text-xs uppercase tracking-[0.2em] font-medium mb-2 md:mb-3">
            Browser-native · Zero uploads · No limits
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-['Space_Grotesk',sans-serif] leading-tight">
            Convert Images, Audio &amp; Video
            <span className="text-orange-400"> Instantly</span>
          </h2>
          <p className="text-white/30 text-xs sm:text-sm mt-2 md:mt-3 max-w-lg mx-auto">
            Drag and drop your files, trim videos to exact timestamps, pick a format, and download — all in your browser.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* ─── Upload Area ─────────────────────────────────────────── */}
          <UploadArea
            files={files}
            onAdd={addFiles}
            onRemove={removeFile}
            onReorder={reorderFiles}
            onClear={clearAll}
            disabled={isConverting}
          />

          {/* ─── Video Trimmer ───────────────────────────────────────── */}
          {hasVideo && (
            <VideoTrimmer
              videoFiles={videoFiles}
              trimMap={trimMap}
              onTrimChange={setTrim}
              disabled={isConverting}
            />
          )}

          {/* ─── Format Selection ──────────────────────────────────── */}
          <FormatSelection
            hasImages={hasImages}
            hasAudio={hasAudio}
            hasVideo={hasVideo}
            imageFormats={imageFormats}
            audioFormats={audioFormats}
            videoFormats={videoFormats}
            videoAudioFormat={videoAudioFormat}
            onToggleImageFormat={toggleImageFormat}
            onToggleAudioFormat={toggleAudioFormat}
            onToggleVideoFormat={toggleVideoFormat}
            onVideoAudioFormat={setVideoAudioFormat}
            disabled={isConverting}
            onConvert={convert}
            filesCount={files.length}
            pendingCount={pendingCount}
          />

          {/* ─── Conversion Progress ─────────────────────────────────── */}
          <ConversionProgress
            status={status}
            progress={progress}
            error={error}
          />

          {/* ─── Download Links ──────────────────────────────────────── */}
          {results.length > 0 && (
            <DownloadLinks
              results={results}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
