import { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (name: string) => void;
  onReorder: (files: File[]) => void;
  onClear: () => void;
  disabled?: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileColor(f: File) {
  if (f.type.startsWith('image/')) return { icon: 'ri-image-2-line', color: 'text-orange-400', bg: 'bg-orange-400/10' };
  if (f.type.startsWith('audio/')) return { icon: 'ri-music-2-line', color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  if (f.type.startsWith('video/')) return { icon: 'ri-video-line', color: 'text-violet-400', bg: 'bg-violet-400/10' };
  return { icon: 'ri-file-line', color: 'text-white/40', bg: 'bg-white/5' };
}

// ─── Sortable row ─────────────────────────────────────────────────────────────

interface RowProps {
  file: File;
  index: number;
  total: number;
  onRemove: () => void;
  disabled?: boolean;
  isDraggingOverlay?: boolean;
}

function SortableFileRow({ file, index, total, onRemove, disabled, isDraggingOverlay }: RowProps) {
  const { icon, color, bg } = fileColor(file);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.name, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 border rounded-xl px-3 py-2.5 group transition-all duration-150
        ${isDragging ? 'opacity-0' : 'opacity-100'}
        ${isDraggingOverlay
          ? 'bg-[#252525] border-orange-400/40 scale-[1.02]'
          : 'bg-white/[0.03] border-white/5 hover:border-white/10'}
      `}
    >
      {/* Index badge */}
      <span className="text-[10px] text-white/20 tabular-nums w-4 text-center flex-shrink-0 font-['Space_Grotesk',sans-serif]">
        {index + 1}
      </span>

      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        disabled={disabled}
        className={`
          w-6 h-6 flex items-center justify-center flex-shrink-0 rounded
          text-white/20 hover:text-white/50 transition-colors
          ${disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
        `}
      >
        <i className="ri-draggable text-base"></i>
      </button>

      {/* File icon */}
      <div className={`w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 ${bg}`}>
        <i className={`${icon} text-sm ${color}`}></i>
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm font-medium truncate">{file.name}</p>
        <p className="text-white/25 text-xs">{formatBytes(file.size)} · {file.type || 'unknown'}</p>
      </div>

      {/* Order pills — only show on last file so user knows it's reorderable */}
      {total > 1 && index === 0 && (
        <span className="hidden md:flex items-center gap-1 text-[10px] text-white/20 bg-white/5 rounded-full px-2 py-0.5 whitespace-nowrap">
          <i className="ri-swap-line text-[10px]"></i>
          drag to reorder
        </span>
      )}

      {/* Remove — always visible on mobile (no hover on touch), subtle on desktop until hovered */}
      {!disabled && (
        <button
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
        >
          <i className="ri-close-line text-base"></i>
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function UploadArea({ files, onAdd, onRemove, onReorder, onClear, disabled }: Props) {
  const [draggingFile, setDraggingFile] = useState<File | null>(null);
  const [dropZoneDragging, setDropZoneDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const f = files.find((file) => file.name === event.active.id);
    setDraggingFile(f ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingFile(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = files.findIndex((f) => f.name === active.id);
    const newIndex = files.findIndex((f) => f.name === over.id);
    onReorder(arrayMove(files, oldIndex, newIndex));
  };

  const handleDropZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneDragging(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) onAdd(dropped);
  }, [onAdd, disabled]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length) onAdd(selected);
    e.target.value = '';
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4">
      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDropZoneDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDropZoneDragging(true); }}
        onDragLeave={() => setDropZoneDragging(false)}
        className={`
          relative w-full rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          flex flex-col items-center justify-center gap-3 md:gap-4 p-6 md:p-10 text-center select-none
          ${dropZoneDragging
            ? 'border-orange-400 bg-orange-400/5 scale-[1.01]'
            : 'border-white/10 bg-white/[0.02] hover:border-orange-400/40 hover:bg-white/[0.04]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*"
          className="hidden"
          onChange={handleInput}
          disabled={disabled}
        />

        <div className={`w-14 h-14 md:w-20 md:h-20 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 ${dropZoneDragging ? 'bg-orange-400/10 border-orange-400/30 scale-110' : ''}`}>
          <i className={`ri-upload-cloud-2-line text-3xl md:text-4xl ${dropZoneDragging ? 'text-orange-400' : 'text-white/30'} transition-colors duration-300`}></i>
        </div>

        <div>
          <p className="text-white font-semibold text-base font-['Space_Grotesk',sans-serif]">
            {dropZoneDragging ? 'Drop your files here!' : 'Drag & Drop files here'}
          </p>
          <p className="text-white/40 text-sm mt-1">
            or <span className="text-orange-400 underline underline-offset-2">browse files</span>
          </p>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
            <span className="text-white/25 text-xs">
              <i className="ri-image-line text-orange-400/60 mr-1"></i>
              Images · JPG PNG WEBP GIF BMP
            </span>
            <span className="text-white/25 text-xs">
              <i className="ri-music-line text-emerald-400/60 mr-1"></i>
              Audio · MP3 WAV AAC FLAC
            </span>
            <span className="text-white/25 text-xs">
              <i className="ri-video-line text-violet-400/60 mr-1"></i>
              Video · MP4 WEBM MOV AVI
            </span>
          </div>
        </div>

        <span className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-orange-400/40 rounded-tl-sm"></span>
        <span className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-orange-400/40 rounded-tr-sm"></span>
        <span className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-orange-400/40 rounded-bl-sm"></span>
        <span className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-orange-400/40 rounded-br-sm"></span>
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
                {files.length} file{files.length > 1 ? 's' : ''} queued
              </p>
              {files.length > 1 && (
                <span className="text-[10px] text-white/20 bg-white/5 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <i className="ri-draggable text-[10px]"></i>
                  drag to reorder
                </span>
              )}
            </div>
            <button
              onClick={onClear}
              disabled={disabled}
              className="text-xs text-white/30 hover:text-red-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              Clear all
            </button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={files.map((f) => f.name)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                {files.map((file, i) => (
                  <SortableFileRow
                    key={file.name}
                    file={file}
                    index={i}
                    total={files.length}
                    onRemove={() => onRemove(file.name)}
                    disabled={disabled}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {draggingFile && (
                <SortableFileRow
                  file={draggingFile}
                  index={files.findIndex((f) => f.name === draggingFile.name)}
                  total={files.length}
                  onRemove={() => {}}
                  isDraggingOverlay
                />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </section>
  );
}
