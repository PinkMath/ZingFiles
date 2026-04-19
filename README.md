# 🔄 FileConvert — Browser-Native Media Converter

> Convert images, audio, and video files instantly — right in your browser. No uploads, no servers, no limits.

# Try the site [aqui](https://pinkmath.github.io/ZingFiles/)

---

## ✨ Features

- **Image conversion** — JPG, PNG, WEBP, GIF, BMP (select multiple output formats at once)
    - **Audio conversion** — WAV, MP3, AAC, FLAC, OGG
    - **Video conversion** — WEBM, MP4, or extract the audio track only
    - **Multi-format output** — pick several formats at once and get a separate file for each
    - **Video trimmer** — set precise start/end timestamps before converting
    - **Drag & drop** upload with file reordering
    - **Lightbox preview** for converted images
    - **In-browser audio player** for converted audio files
    - **Download All as ZIP** — pack every output into a single zip file
    - **Zero uploads** — everything runs locally via Canvas, Web Audio API, and MediaRecorder
    - **Mobile-friendly** — fully responsive layout

    ---

## 🚀 Getting Started

### Prerequisites

    - Node.js 18+
    - npm or yarn

### Install & run

    ```bash
# Clone the repo
    git clone https://github.com/PinkMath/ZingFile.git
    cd your-repo

# Install dependencies
    npm install

# Start the dev server
    npm run dev
    ```

    Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

    ```bash
    npm run build
    ```

    Output goes to the `dist/` folder — ready to deploy to any static host (Vercel, Netlify, GitHub Pages, etc.).

    ---

## 🛠 Tech Stack

    | Layer | Library |
    |---|---|
    | Framework | React 19 + TypeScript |
    | Build tool | Vite |
    | Styling | Tailwind CSS |
    | Routing | React Router DOM |
    | MP3 encoding | @breezystack/lamejs |
    | ZIP packaging | JSZip |
    | Icons | Remix Icon + Font Awesome (CDN) |

    ---

## 📁 Project Structure

    ```
    src/
    ├── hooks/
│   └── useFileConverter.ts   # Core conversion logic (image/audio/video)
    ├── pages/
    │   └── home/
    │       ├── page.tsx
    │       └── components/
    │           ├── Header.tsx
    │           ├── UploadArea.tsx
    │           ├── FormatSelection.tsx   # Multi-format toggle picker
    │           ├── VideoTrimmer.tsx
    │           ├── ConversionProgress.tsx
    │           ├── DownloadLinks.tsx     # Cards + lightbox + ZIP download
    │           └── Footer.tsx
    ├── router/
    │   └── config.tsx
    └── main.tsx
    ```

    ---

## 🔒 Privacy

    All file processing happens **entirely in your browser** using native Web APIs:

    - `Canvas API` — image conversion
    - `Web Audio API` — audio decoding and re-encoding
    - `MediaRecorder API` — video/audio capture
    - `lamejs` — client-side MP3 encoding

    **Your files never leave your device.**

    ---

## 📄 License

    MIT — feel free to use, modify, and distribute.
