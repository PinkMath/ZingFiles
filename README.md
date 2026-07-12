# ZingFiles

ZingFiles is a privacy-first media converter that runs in the browser. It converts only formats that the current browser can genuinely encode, validates each output, and never treats changing a filename extension as a successful conversion.

[Open ZingFiles](https://loavy.github.io/ZingFiles/)

## What ZingFiles does

- Converts supported images and audio files entirely on the local device.
- Converts or trims video when the browser exposes a compatible encoder.
- Supports selecting multiple output formats where those formats are available.
- Provides previews, individual downloads, and a Download All ZIP archive.
- Rejects unavailable conversions instead of silently substituting another format.

User files are read and processed locally with browser APIs and are not uploaded to ZingFiles or an external file-processing service.

## Output format support

Support below describes output encoding. Whether an input file can be opened also depends on the browser's installed decoders.

| Format | Category | Availability | Conversion method and limitations |
| --- | --- | --- | --- |
| JPG/JPEG | Image | Enabled | Canvas JPEG encoder. Transparency is flattened onto a solid background. |
| PNG | Image | Enabled | Canvas PNG encoder. |
| WebP | Image | Browser-dependent | Enabled only when Canvas returns genuine WebP data and output validation passes. |
| GIF | Image | Disabled | Browser Canvas APIs do not provide reliable GIF encoding. |
| BMP | Image | Disabled | Browser Canvas APIs do not provide reliable BMP encoding. |
| WAV | Audio | Enabled | Encoded locally as PCM WAV. |
| MP3 | Audio | Enabled | Encoded locally with `@breezystack/lamejs`. |
| OGG/Opus | Audio | Disabled | Browser-native Ogg recording is not reliable across the target browsers. |
| FLAC | Audio | Disabled | No FLAC encoder is bundled in the Community version. |
| AAC | Audio | Disabled | No reliable standalone AAC encoder is available in the current browser-native implementation. |
| WebM | Video | Browser-dependent | Requires an exact `MediaRecorder` WebM encoder plus capturable video and audio tracks; the resulting WebM data is validated. |
| MP4 | Video | Disabled | Browser-native MP4 recording is not reliable enough for Phase 1. |

### Browser limitations

- Browser and operating-system codec support varies. Conditional formats are checked at runtime.
- A conditional format is reported as unavailable when its exact encoder or media-capture API is missing, or when its output fails validation. ZingFiles does not fall back to a different container.
- Audio and video decoding depends on the codecs contained in the source file, not only its extension.
- Canvas-based image conversion creates a static image; animation from an input GIF is not preserved.
- MP3 output currently supports mono and stereo sources. Other channel layouts return an error instead of dropping channels.
- MediaRecorder-based conversion can take approximately the duration of the selected clip.
- Video conversion stops with an error when the browser does not expose both source video and audio tracks, preventing silent audio loss. Video-only source files are therefore unavailable in Phase 1.
- Large files consume browser memory and may exceed device-specific limits.

For the most predictable results, use a current browser and keep it updated.

## Installation

### Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm

```bash
git clone https://github.com/loavy/ZingFiles.git
cd ZingFiles
npm install
```

## Development

Start the Vite development server:

```bash
npm run dev
```

The configured development URL is [http://localhost:3000/ZingFiles/](http://localhost:3000/ZingFiles/).

### Checks

```bash
npm run type-check
npm run lint
npm test
npm run build
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run type-check` | Run the TypeScript compiler without emitting files. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the conversion validation tests. |
| `npm run build` | Create a production build. |
| `npm run preview` | Preview the production build locally. |
| `npm run deploy` | Build and publish the `out/` folder to GitHub Pages. |

## Production build and deployment

```bash
npm run build
```

Vite writes the production build to `out/`.

The repository is configured for the GitHub Pages project path `/ZingFiles/`. To publish with the included `gh-pages` deployment command, run:

```bash
npm run deploy
```

For another static host, deploy the contents of `out/` and ensure that Vite's `base` setting matches the URL path where the application will be served.

## Technology

| Area | Technology |
| --- | --- |
| Application | React 19 and TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| Routing | React Router |
| Audio encoding | Web Audio API, a PCM WAV encoder, and lamejs |
| Image encoding | Canvas API |
| Video encoding | MediaRecorder when an exact encoder is available |
| ZIP archives | JSZip |
| Icons | Remix Icon |

## Roadmap

The following items are planned for a future Pro version and are not available today:

- Reliable FFmpeg-based audio and video conversion
- Batch presets
- Quality and bitrate controls
- Metadata removal
- Desktop packaging

## License

The ZingFiles Community repository is licensed under the MIT License.
