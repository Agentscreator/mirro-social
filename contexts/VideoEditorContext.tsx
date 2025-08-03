'use client';

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
  VideoProject, 
  VideoEditorState, 
  VideoEditorActions, 
  VideoEditorContextType,
  VideoClip,
  AudioClip,
  TextOverlay,
  StickerOverlay,
  Timeline
} from '@/types/video-editor';

const initialState: VideoEditorState = {
  project: null,
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  selectedClip: null,
  selectedOverlay: null,
  isExporting: false,
  exportProgress: 0,
};

type VideoEditorAction =
  | { type: 'CREATE_PROJECT'; payload: { aspectRatio: VideoProject['canvas']['aspectRatio'] } }
  | { type: 'LOAD_PROJECT'; payload: VideoProject }
  | { type: 'ADD_VIDEO_CLIP'; payload: string }
  | { type: 'ADD_AUDIO_CLIP'; payload: Omit<AudioClip, 'id'> }
  | { type: 'ADD_TEXT_OVERLAY'; payload: Omit<TextOverlay, 'id'> }
  | { type: 'ADD_STICKER_OVERLAY'; payload: Omit<StickerOverlay, 'id'> }
  | { type: 'UPDATE_VIDEO_CLIP'; payload: { id: string; updates: Partial<VideoClip> } }
  | { type: 'UPDATE_AUDIO_CLIP'; payload: { id: string; updates: Partial<AudioClip> } }
  | { type: 'UPDATE_TEXT_OVERLAY'; payload: { id: string; updates: Partial<TextOverlay> } }
  | { type: 'UPDATE_STICKER_OVERLAY'; payload: { id: string; updates: Partial<StickerOverlay> } }
  | { type: 'REMOVE_VIDEO_CLIP'; payload: string }
  | { type: 'REMOVE_AUDIO_CLIP'; payload: string }
  | { type: 'REMOVE_TEXT_OVERLAY'; payload: string }
  | { type: 'REMOVE_STICKER_OVERLAY'; payload: string }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SELECT_CLIP'; payload: string | null }
  | { type: 'SELECT_OVERLAY'; payload: string | null }
  | { type: 'SET_EXPORT_PROGRESS'; payload: number }
  | { type: 'SET_EXPORTING'; payload: boolean }
  | { type: 'DUPLICATE_CLIP'; payload: { id: string; type: 'video' | 'audio' | 'text' | 'sticker' } }
  | { type: 'SPLIT_CLIP'; payload: { id: string; time: number; type: 'video' | 'audio' } };

const generateId = () => Math.random().toString(36).substr(2, 9);

const getAspectRatioDimensions = (aspectRatio: VideoProject['canvas']['aspectRatio']) => {
  switch (aspectRatio) {
    case '9:16': return { width: 720, height: 1280 }; // TikTok/Instagram Stories
    case '16:9': return { width: 1920, height: 1080 }; // YouTube
    case '1:1': return { width: 1080, height: 1080 }; // Instagram square
    case '4:5': return { width: 1080, height: 1350 }; // Instagram portrait
    default: return { width: 720, height: 1280 };
  }
};

function videoEditorReducer(state: VideoEditorState, action: VideoEditorAction): VideoEditorState {
  switch (action.type) {
    case 'CREATE_PROJECT': {
      const dimensions = getAspectRatioDimensions(action.payload.aspectRatio);
      const newProject: VideoProject = {
        id: generateId(),
        name: `Project ${new Date().toLocaleDateString()}`,
        timeline: {
          videoClips: [],
          audioClips: [],
          textOverlays: [],
          stickerOverlays: [],
          duration: 0,
        },
        canvas: {
          ...dimensions,
          aspectRatio: action.payload.aspectRatio,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return { ...state, project: newProject };
    }

    case 'LOAD_PROJECT':
      return { ...state, project: action.payload };

    case 'ADD_VIDEO_CLIP': {
      if (!state.project) return state;
      const newClip: VideoClip = {
        id: generateId(),
        src: action.payload,
        startTime: state.project.timeline.duration,
        endTime: state.project.timeline.duration + 5, // Default 5 seconds
        duration: 5,
        volume: 1,
        speed: 1,
        filters: [],
        position: { x: 0, y: 0 },
        scale: 1,
        rotation: 0,
      };
      const updatedProject = {
        ...state.project,
        timeline: {
          ...state.project.timeline,
          videoClips: [...state.project.timeline.videoClips, newClip],
          duration: Math.max(state.project.timeline.duration, newClip.endTime),
        },
        updatedAt: new Date(),
      };
      return { ...state, project: updatedProject };
    }

    case 'ADD_AUDIO_CLIP': {
      if (!state.project) return state;
      const newClip: AudioClip = {
        ...action.payload,
        id: generateId(),
      };
      const updatedProject = {
        ...state.project,
        timeline: {
          ...state.project.timeline,
          audioClips: [...state.project.timeline.audioClips, newClip],
          duration: Math.max(state.project.timeline.duration, newClip.endTime),
        },
        updatedAt: new Date(),
      };
      return { ...state, project: updatedProject };
    }

    case 'ADD_TEXT_OVERLAY': {
      if (!state.project) return state;
      const newOverlay: TextOverlay = {
        ...action.payload,
        id: generateId(),
      };
      const updatedProject = {
        ...state.project,
        timeline: {
          ...state.project.timeline,
          textOverlays: [...state.project.timeline.textOverlays, newOverlay],
        },
        updatedAt: new Date(),
      };
      return { ...state, project: updatedProject };
    }

    case 'ADD_STICKER_OVERLAY': {
      if (!state.project) return state;
      const newOverlay: StickerOverlay = {
        ...action.payload,
        id: generateId(),
      };
      const updatedProject = {
        ...state.project,
        timeline: {
          ...state.project.timeline,
          stickerOverlays: [...state.project.timeline.stickerOverlays, newOverlay],
        },
        updatedAt: new Date(),
      };
      return { ...state, project: updatedProject };
    }

    case 'UPDATE_VIDEO_CLIP': {
      if (!state.project) return state;
      const updatedClips = state.project.timeline.videoClips.map(clip =>
        clip.id === action.payload.id ? { ...clip, ...action.payload.updates } : clip
      );
      const maxEndTime = Math.max(...updatedClips.map(clip => clip.endTime), 0);
      const updatedProject = {
        ...state.project,
        timeline: {
          ...state.project.timeline,
          videoClips: updatedClips,
          duration: Math.max(maxEndTime, state.project.timeline.duration),
        },
        updatedAt: new Date(),
      };
      return { ...state, project: updatedProject };
    }

    case 'REMOVE_VIDEO_CLIP': {
      if (!state.project) return state;
      const filteredClips = state.project.timeline.videoClips.filter(clip => clip.id !== action.payload);
      const updatedProject = {
        ...state.project,
        timeline: {
          ...state.project.timeline,
          videoClips: filteredClips,
        },
        updatedAt: new Date(),
      };
      return { ...state, project: updatedProject, selectedClip: state.selectedClip === action.payload ? null : state.selectedClip };
    }

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };

    case 'SELECT_CLIP':
      return { ...state, selectedClip: action.payload, selectedOverlay: null };

    case 'SELECT_OVERLAY':
      return { ...state, selectedOverlay: action.payload, selectedClip: null };

    case 'SET_EXPORT_PROGRESS':
      return { ...state, exportProgress: action.payload };

    case 'SET_EXPORTING':
      return { ...state, isExporting: action.payload };

    default:
      return state;
  }
}

const VideoEditorContext = createContext<VideoEditorContextType | undefined>(undefined);

export function VideoEditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(videoEditorReducer, initialState);

  const createProject = useCallback((aspectRatio: VideoProject['canvas']['aspectRatio']) => {
    dispatch({ type: 'CREATE_PROJECT', payload: { aspectRatio } });
  }, []);

  const loadProject = useCallback((project: VideoProject) => {
    dispatch({ type: 'LOAD_PROJECT', payload: project });
  }, []);

  const saveProject = useCallback(async () => {
    if (!state.project) return;
    // TODO: Implement project saving to backend
    console.log('Saving project:', state.project);
  }, [state.project]);

  const addVideoClip = useCallback((src: string) => {
    dispatch({ type: 'ADD_VIDEO_CLIP', payload: src });
  }, []);

  const addAudioClip = useCallback((audio: Omit<AudioClip, 'id'>) => {
    dispatch({ type: 'ADD_AUDIO_CLIP', payload: audio });
  }, []);

  const addTextOverlay = useCallback((text: Omit<TextOverlay, 'id'>) => {
    dispatch({ type: 'ADD_TEXT_OVERLAY', payload: text });
  }, []);

  const addStickerOverlay = useCallback((sticker: Omit<StickerOverlay, 'id'>) => {
    dispatch({ type: 'ADD_STICKER_OVERLAY', payload: sticker });
  }, []);

  const updateVideoClip = useCallback((id: string, updates: Partial<VideoClip>) => {
    dispatch({ type: 'UPDATE_VIDEO_CLIP', payload: { id, updates } });
  }, []);

  const updateAudioClip = useCallback((id: string, updates: Partial<AudioClip>) => {
    dispatch({ type: 'UPDATE_AUDIO_CLIP', payload: { id, updates } });
  }, []);

  const updateTextOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
    dispatch({ type: 'UPDATE_TEXT_OVERLAY', payload: { id, updates } });
  }, []);

  const updateStickerOverlay = useCallback((id: string, updates: Partial<StickerOverlay>) => {
    dispatch({ type: 'UPDATE_STICKER_OVERLAY', payload: { id, updates } });
  }, []);

  const removeVideoClip = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_VIDEO_CLIP', payload: id });
  }, []);

  const removeAudioClip = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_AUDIO_CLIP', payload: id });
  }, []);

  const removeTextOverlay = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TEXT_OVERLAY', payload: id });
  }, []);

  const removeStickerOverlay = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_STICKER_OVERLAY', payload: id });
  }, []);

  const setCurrentTime = useCallback((time: number) => {
    dispatch({ type: 'SET_CURRENT_TIME', payload: time });
  }, []);

  const play = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: true });
  }, []);

  const pause = useCallback(() => {
    dispatch({ type: 'SET_PLAYING', payload: false });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: zoom });
  }, []);

  const selectClip = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_CLIP', payload: id });
  }, []);

  const selectOverlay = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_OVERLAY', payload: id });
  }, []);

  const exportVideo = useCallback(async (): Promise<Blob> => {
    if (!state.project) throw new Error('No project to export');
    
    dispatch({ type: 'SET_EXPORTING', payload: true });
    dispatch({ type: 'SET_EXPORT_PROGRESS', payload: 0 });

    try {
      // TODO: Implement video export logic
      // This would involve rendering the canvas frame by frame and encoding to video
      const blob = new Blob([''], { type: 'video/mp4' });
      
      dispatch({ type: 'SET_EXPORT_PROGRESS', payload: 100 });
      return blob;
    } finally {
      dispatch({ type: 'SET_EXPORTING', payload: false });
    }
  }, [state.project]);

  const duplicateClip = useCallback((id: string, type: 'video' | 'audio' | 'text' | 'sticker') => {
    dispatch({ type: 'DUPLICATE_CLIP', payload: { id, type } });
  }, []);

  const splitClip = useCallback((id: string, time: number, type: 'video' | 'audio') => {
    dispatch({ type: 'SPLIT_CLIP', payload: { id, time, type } });
  }, []);

  const value: VideoEditorContextType = {
    ...state,
    createProject,
    loadProject,
    saveProject,
    addVideoClip,
    addAudioClip,
    addTextOverlay,
    addStickerOverlay,
    updateVideoClip,
    updateAudioClip,
    updateTextOverlay,
    updateStickerOverlay,
    removeVideoClip,
    removeAudioClip,
    removeTextOverlay,
    removeStickerOverlay,
    setCurrentTime,
    play,
    pause,
    setZoom,
    selectClip,
    selectOverlay,
    exportVideo,
    duplicateClip,
    splitClip,
  };

  return (
    <VideoEditorContext.Provider value={value}>
      {children}
    </VideoEditorContext.Provider>
  );
}

export function useVideoEditor() {
  const context = useContext(VideoEditorContext);
  if (context === undefined) {
    throw new Error('useVideoEditor must be used within a VideoEditorProvider');
  }
  return context;
}