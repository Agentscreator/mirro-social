export interface VideoClip {
  id: string;
  src: string;
  startTime: number;
  endTime: number;
  duration: number;
  volume: number;
  speed: number;
  filters: VideoFilter[];
  position: { x: number; y: number };
  scale: number;
  rotation: number;
}

export interface AudioClip {
  id: string;
  src: string;
  startTime: number;
  endTime: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  name: string;
}

export interface TextOverlay {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  position: { x: number; y: number };
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  animation?: TextAnimation;
  style: 'normal' | 'bold' | 'italic';
}

export interface StickerOverlay {
  id: string;
  src: string;
  startTime: number;
  endTime: number;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  animation?: StickerAnimation;
}

export interface VideoFilter {
  id: string;
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'vintage' | 'sepia' | 'grayscale' | 'invert';
  intensity: number;
}

export interface TextAnimation {
  type: 'fadeIn' | 'slideIn' | 'typewriter' | 'bounce' | 'pulse';
  duration: number;
}

export interface StickerAnimation {
  type: 'bounce' | 'rotate' | 'pulse' | 'shake' | 'fadeIn';
  duration: number;
  loop: boolean;
}

export interface Timeline {
  videoClips: VideoClip[];
  audioClips: AudioClip[];
  textOverlays: TextOverlay[];
  stickerOverlays: StickerOverlay[];
  duration: number;
}

export interface VideoProject {
  id: string;
  name: string;
  timeline: Timeline;
  canvas: {
    width: number;
    height: number;
    aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
  };
  watermark?: {
    enabled: boolean;
    text: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SoundEffect {
  id: string;
  name: string;
  src: string;
  category: 'applause' | 'laugh' | 'whoosh' | 'impact' | 'ambient' | 'music';
  duration: number;
  preview?: string;
}

export interface VideoEditorState {
  project: VideoProject | null;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  selectedClip: string | null;
  selectedOverlay: string | null;
  isExporting: boolean;
  exportProgress: number;
}

export interface VideoEditorActions {
  createProject: (aspectRatio: VideoProject['canvas']['aspectRatio']) => void;
  loadProject: (project: VideoProject) => void;
  saveProject: () => Promise<void>;
  addVideoClip: (src: string) => void;
  addAudioClip: (audio: Omit<AudioClip, 'id'>) => void;
  addTextOverlay: (text: Omit<TextOverlay, 'id'>) => void;
  addStickerOverlay: (sticker: Omit<StickerOverlay, 'id'>) => void;
  updateVideoClip: (id: string, updates: Partial<VideoClip>) => void;
  updateAudioClip: (id: string, updates: Partial<AudioClip>) => void;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  updateStickerOverlay: (id: string, updates: Partial<StickerOverlay>) => void;
  removeVideoClip: (id: string) => void;
  removeAudioClip: (id: string) => void;
  removeTextOverlay: (id: string) => void;
  removeStickerOverlay: (id: string) => void;
  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
  setZoom: (zoom: number) => void;
  selectClip: (id: string | null) => void;
  selectOverlay: (id: string | null) => void;
  exportVideo: () => Promise<Blob>;
  duplicateClip: (id: string, type: 'video' | 'audio' | 'text' | 'sticker') => void;
  splitClip: (id: string, time: number, type: 'video' | 'audio') => void;
}

export type VideoEditorContextType = VideoEditorState & VideoEditorActions;

export interface ExportSettings {
  resolution: '1080p' | '720p' | '480p';
  frameRate: 30 | 60;
  quality: 'high' | 'medium' | 'low';
  format: 'mp4' | 'webm';
}

export interface PictureInPictureConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
  borderRadius: number;
  borderColor?: string;
  borderWidth: number;
}