
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { VideoScript, Segment, TransitionEffect, TextOverlayStyle, WordTiming, MediaClip, AudioClip } from '../types';
import PreviewWindow from './PreviewWindow';
import Timeline from './Timeline';
import Toolbar from './Toolbar';
import MediaSearchModal from './MediaSearchModal';
import AIToolsModal from './AIToolsModal';
import AudioModal from './AudioModal';
import ExportModal from './ExportModal';
import { estimateWordTimings } from '../utils/media';
import { UndoIcon, RedoIcon, ExportIcon } from './icons';

interface VideoEditorProps {
  initialScript: VideoScript;
}

const VideoEditor: React.FC<VideoEditorProps> = ({ initialScript }) => {
  const [title, setTitle] = useState(initialScript.title);
  
  // History State
  const [history, setHistory] = useState<{
      past: { segments: Segment[], audioTracks: AudioClip[] }[];
      present: { segments: Segment[], audioTracks: AudioClip[] };
      future: { segments: Segment[], audioTracks: AudioClip[] }[];
  }>({
      past: [],
      present: { 
          segments: initialScript.segments, 
          audioTracks: initialScript.audioTracks || [] 
      },
      future: []
  });

  const segments = history.present.segments;
  const audioTracks = history.present.audioTracks;

  // --- PLAYBACK STATE ---
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackIntervalRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // --- UI STATE (Menu) ---
  const [activeMenu, setActiveMenu] = useState<string | null>(null); // 'edit', 'audio', 'text', 'overlay', 'effect'

  // Calculate total duration
  const totalDuration = segments.reduce((acc, s) => acc + s.duration, 0);

  const updateHistory = useCallback((newSegments: Segment[], newAudioTracks: AudioClip[]) => {
      setHistory(curr => ({
          past: [...curr.past, curr.present],
          present: { segments: newSegments, audioTracks: newAudioTracks },
          future: []
      }));
  }, []);

  const updateSegments = useCallback((newSegmentsOrUpdater: Segment[] | ((prev: Segment[]) => Segment[])) => {
      const newSegments = typeof newSegmentsOrUpdater === 'function' 
          ? newSegmentsOrUpdater(history.present.segments) 
          : newSegmentsOrUpdater;
      updateHistory(newSegments, history.present.audioTracks);
  }, [history.present, updateHistory]);
  
  const updateAudioTracks = useCallback((newTracksOrUpdater: AudioClip[] | ((prev: AudioClip[]) => AudioClip[])) => {
      const newTracks = typeof newTracksOrUpdater === 'function'
          ? newTracksOrUpdater(history.present.audioTracks)
          : newTracksOrUpdater;
      updateHistory(history.present.segments, newTracks);
  }, [history.present, updateHistory]);

  const handleUndo = useCallback(() => {
      setHistory(curr => {
          if (curr.past.length === 0) return curr;
          const previous = curr.past[curr.past.length - 1];
          const newPast = curr.past.slice(0, curr.past.length - 1);
          return {
              past: newPast,
              present: previous,
              future: [curr.present, ...curr.future]
          };
      });
  }, []);

  const handleRedo = useCallback(() => {
      setHistory(curr => {
          if (curr.future.length === 0) return curr;
          const next = curr.future[0];
          const newFuture = curr.future.slice(1);
          return {
              past: [...curr.past, curr.present],
              present: next,
              future: newFuture
          };
      });
  }, []);


  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(segments[0]?.id || null);
  
  useEffect(() => {
      if (isPlaying) {
          let elapsed = 0;
          for (const seg of segments) {
              if (currentTime >= elapsed && currentTime < elapsed + seg.duration) {
                  if (activeSegmentId !== seg.id) {
                      setActiveSegmentId(seg.id);
                  }
                  break;
              }
              elapsed += seg.duration;
          }
      }
  }, [currentTime, isPlaying, segments]); 

  // Modal States
  const [isMediaSearchOpen, setIsMediaSearchOpen] = useState(false);
  const [mediaSearchTarget, setMediaSearchTarget] = useState<{clipId: string | null}>({ clipId: null });
  const [mediaSearchMode, setMediaSearchMode] = useState<'default' | 'wizard'>('default');
  const [isAIToolsOpen, setIsAIToolsOpen] = useState(false);
  const [activeClipIdForTools, setActiveClipIdForTools] = useState<string | null>(null);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [audioModalTargetTrack, setAudioModalTargetTrack] = useState<'music' | 'sfx' | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1);

  // Segment Safety
  useEffect(() => {
      if (activeSegmentId && !segments.find(s => s.id === activeSegmentId)) {
          setActiveSegmentId(segments[0]?.id || null);
      }
  }, [segments, activeSegmentId]);

  const activeSegmentIndex = segments.findIndex(s => s.id === activeSegmentId);
  const activeSegment = segments[activeSegmentIndex] || null;

  // --- PLAYBACK LOGIC ---
  const togglePlay = useCallback(() => {
      setIsPlaying(prev => !prev);
  }, []);

  const handleSeek = useCallback((time: number) => {
      const clampedTime = Math.max(0, Math.min(time, totalDuration));
      setCurrentTime(clampedTime);
      let elapsed = 0;
      for (const seg of segments) {
          if (clampedTime >= elapsed && clampedTime < elapsed + seg.duration) {
              setActiveSegmentId(seg.id);
              break;
          }
          elapsed += seg.duration;
      }
  }, [totalDuration, segments]);

  useEffect(() => {
      if (isPlaying) {
          lastTimeRef.current = performance.now();
          const loop = (timestamp: number) => {
              const delta = (timestamp - lastTimeRef.current) / 1000;
              lastTimeRef.current = timestamp;
              setCurrentTime(prev => {
                  const nextTime = prev + delta;
                  if (nextTime >= totalDuration) {
                      setIsPlaying(false);
                      return 0; 
                  }
                  return nextTime;
              });
              playbackIntervalRef.current = requestAnimationFrame(loop);
          };
          playbackIntervalRef.current = requestAnimationFrame(loop);
      } else {
          if (playbackIntervalRef.current) cancelAnimationFrame(playbackIntervalRef.current);
      }
      return () => { if (playbackIntervalRef.current) cancelAnimationFrame(playbackIntervalRef.current); };
  }, [isPlaying, totalDuration]);


  // --- HANDLERS ---
  const handleUpdateSegmentText = useCallback((segmentId: string, newText: string) => {
    updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, narration_text: newText, wordTimings: undefined } : s));
  }, [updateSegments]);
  
  const handleUpdateSegmentMedia = useCallback((segmentId: string, clipId: string | null, newMediaUrl: string, newMediaType: 'image' | 'video') => {
    updateSegments(prev => prev.map(s => {
        if (s.id !== segmentId) return s;
        if (clipId) {
            return { ...s, media: s.media.map(clip => clip.id === clipId ? { ...clip, url: newMediaUrl, type: newMediaType } : clip) };
        } 
        return { ...s, media: [...s.media, { id: `clip-${Date.now()}`, url: newMediaUrl, type: newMediaType }] };
      }));
  }, [updateSegments]);

  const handleCreateNewSegment = useCallback((newMediaUrl: string, newMediaType: 'image' | 'video') => {
      const newSegment: Segment = {
          id: `segment-${Date.now()}`,
          narration_text: "",
          search_keywords_for_media: "",
          media: [{ id: `clip-${Date.now()}`, url: newMediaUrl, type: newMediaType }],
          duration: 3,
          audioVolume: 1.0,
          transition: 'fade',
          textOverlayStyle: { fontFamily: 'Arial', fontSize: 40, color: '#EAB308', position: 'bottom', backgroundColor: 'rgba(0, 0, 0, 0.5)', animation: 'scale', maxCaptionLines: 2 }
      };
      updateSegments(prev => [...prev, newSegment]);
  }, [updateSegments]);

  const handleUpdateSegmentAudio = useCallback((segmentId: string, newAudioUrl: string | undefined, audioDuration?: number) => {
    updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, audioUrl: newAudioUrl, duration: (audioDuration && audioDuration > 0 && audioDuration < s.duration ? audioDuration : s.duration) } : s));
  }, [updateSegments]);

  const handleUpdateWordTimings = useCallback((segmentId: string, timings: WordTiming[]) => {
      updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, wordTimings: timings } : s));
  }, [updateSegments]);
  
  const handleAutoGenerateSubtitles = useCallback(() => {
      updateSegments(prev => prev.map(s => ({ ...s, wordTimings: estimateWordTimings(s.narration_text, s.duration) })));
  }, [updateSegments]);

  const handleUpdateSegmentVolume = useCallback((segmentId: string, newVolume: number) => {
      updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, audioVolume: newVolume } : s));
  }, [updateSegments]);

  const handleUpdateSegmentDuration = useCallback((segmentId: string, newDuration: number) => {
      updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, duration: newDuration } : s));
  }, [updateSegments]);

  const handleUpdateSegmentTransition = useCallback((segmentId: string, newTransition: TransitionEffect) => {
    updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, transition: newTransition } : s));
  }, [updateSegments]);

  const handleUpdateSegmentTextOverlayStyle = useCallback((segmentId: string, styleUpdate: Partial<TextOverlayStyle>) => {
    updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, textOverlayStyle: { ...s.textOverlayStyle!, ...styleUpdate } } : s));
  }, [updateSegments]);

  const handleSplitSegment = useCallback((segmentId: string, splitTime: number) => {
    const original = segments.find(s => s.id === segmentId);
    if (!original || splitTime < 0.5 || splitTime > original.duration - 0.5) return;

    const index = segments.indexOf(original);
    const durA = splitTime;
    const durB = original.duration - splitTime;

    // Simplified split logic for text
    const segA = { ...original, duration: durA, audioUrl: undefined };
    const segB = { ...original, id: `segment-${Date.now()}-split`, duration: durB, media: original.media.map(m => ({ ...m, id: `clip-${Date.now()}-split` })), audioUrl: undefined };

    const newSegments = [...segments];
    newSegments.splice(index, 1, segA, segB);
    updateSegments(newSegments);
    setActiveSegmentId(segA.id);
  }, [segments, updateSegments]);

  const handleDeleteSegment = useCallback(() => {
    if (!activeSegmentId) return;
    updateSegments(prev => {
        if (prev.length <= 1) return prev;
        return prev.filter(s => s.id !== activeSegmentId);
    });
  }, [activeSegmentId, updateSegments]);

  // --- AUDIO TRACKS ---
  const handleAddAudioTrack = useCallback((url: string, type: 'music' | 'sfx', duration: number, name: string) => {
      updateAudioTracks(prev => [...prev, { id: `audio-${Date.now()}`, url, name, type, startTime: 0, duration: duration || 10, volume: 0.8 }]);
  }, [updateAudioTracks]);

  const handleUpdateAudioTrack = useCallback((trackId: string, updates: Partial<AudioClip>) => {
      updateAudioTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
  }, [updateAudioTracks]);

  const handleDeleteAudioTrack = useCallback((trackId: string) => {
      updateAudioTracks(prev => prev.filter(t => t.id !== trackId));
  }, [updateAudioTracks]);


  return (
    <div className="flex flex-col h-full w-full bg-black text-white font-sans overflow-hidden">
        
        {/* HEADER */}
        <div className="h-12 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-4 z-50 flex-shrink-0">
            <button className="text-gray-400 hover:text-white" onClick={() => window.location.reload()}>✕</button>
            <div className="flex gap-4">
                <button onClick={handleUndo} disabled={history.past.length === 0} className="text-gray-400 disabled:opacity-30"><UndoIcon /></button>
                <button onClick={handleRedo} disabled={history.future.length === 0} className="text-gray-400 disabled:opacity-30"><RedoIcon /></button>
            </div>
            <button onClick={() => setIsExportOpen(true)} className="px-4 py-1.5 bg-cyan-600 rounded-full text-xs font-bold hover:bg-cyan-500">
                Export
            </button>
        </div>

        {/* MAIN PREVIEW AREA (Resizable) */}
        <div className="flex-grow flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden py-4">
             <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
                 <PreviewWindow 
                    title={title}
                    onTitleChange={setTitle}
                    segments={segments} 
                    activeSegmentId={activeSegmentId!}
                    onUpdateSegments={updateSegments} 
                    segment={activeSegment || segments[0]} 
                    
                    // Passing Dummy layout props as we moved logic to Toolbar
                    showScriptPanel={false} setShowScriptPanel={() => {}}
                    showPropertiesPanel={false} setShowPropertiesPanel={() => {}}

                    currentTime={currentTime} isPlaying={isPlaying} totalDuration={totalDuration}
                    onPlayPause={togglePlay} onSeek={handleSeek}

                    onTextChange={handleUpdateSegmentText}
                    onUpdateAudio={handleUpdateSegmentAudio}
                    onUpdateWordTimings={handleUpdateWordTimings}
                    onAutoGenerateSubtitles={() => {}} // Handled in toolbar
                    onUpdateTextOverlayStyle={handleUpdateSegmentTextOverlayStyle}
                    onUpdateDuration={handleUpdateSegmentDuration}
                    onUpdateTransition={handleUpdateSegmentTransition}
                    onUpdateVolume={handleUpdateSegmentVolume}
                    isLastSegment={false}
                    onOpenMediaSearch={() => {}} // Handled in toolbar
                    onRemoveMedia={() => {}}
                    onEditClipWithAI={() => {}}
                    onReorderClips={() => {}}
                    onSplitSegment={handleSplitSegment}
                />
             </div>
        </div>

        {/* TIMELINE AREA (Fixed Height) */}
        <div className="h-32 bg-[#0f0f0f] border-t border-white/5 relative z-40">
             <Timeline 
                segments={segments}
                audioTracks={audioTracks}
                onReorder={updateSegments}
                activeSegmentId={activeSegmentId}
                setActiveSegmentId={setActiveSegmentId}
                onUpdateTransition={handleUpdateSegmentTransition}
                onUpdateVolume={handleUpdateSegmentVolume}
                timelineZoom={timelineZoom}
                onNudgeSegment={() => {}}
                onAddSegment={() => {
                    setMediaSearchMode('wizard');
                    setMediaSearchTarget({ clipId: null });
                    setIsMediaSearchOpen(true);
                }}
                onUpdateAudioTrack={handleUpdateAudioTrack}
                onDeleteAudioTrack={handleDeleteAudioTrack}
                onAddAudioTrack={(type) => {
                    setAudioModalTargetTrack(type);
                    setIsAudioModalOpen(true);
                }}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onSeek={handleSeek}
            />
        </div>

        {/* BOTTOM TOOLBAR / ACTION PANEL */}
        <div className="h-16 bg-[#000] border-t border-white/10 z-50">
             <Toolbar 
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                onOpenMediaSearch={() => {
                    setMediaSearchMode('default');
                    setMediaSearchTarget({ clipId: activeSegment?.media[0]?.id || null });
                    setIsMediaSearchOpen(true);
                }}
                onOpenAudioModal={(type) => {
                    setAudioModalTargetTrack(type);
                    setIsAudioModalOpen(true);
                }}
                onOpenAITools={() => {
                    setActiveClipIdForTools(activeSegment?.media[0]?.id || null);
                    setIsAIToolsOpen(true);
                }}
                onSplit={() => activeSegment && handleSplitSegment(activeSegment.id, Math.min(activeSegment.duration - 0.5, 1.5))}
                onDelete={handleDeleteSegment}
                activeSegment={activeSegment}
                onUpdateVolume={handleUpdateSegmentVolume}
                onUpdateText={handleUpdateSegmentText}
                onAutoCaptions={handleAutoGenerateSubtitles}
                onUpdateStyle={handleUpdateSegmentTextOverlayStyle}
            />
        </div>

        {/* MODALS */}
        {isMediaSearchOpen && (
            <MediaSearchModal
                isOpen={isMediaSearchOpen}
                onClose={() => setIsMediaSearchOpen(false)}
                onSelectMedia={(newUrl, newType) => {
                    if (mediaSearchMode === 'wizard') {
                        handleCreateNewSegment(newUrl, newType);
                    } else if (activeSegment) {
                        handleUpdateSegmentMedia(activeSegment.id, mediaSearchTarget.clipId, newUrl, newType);
                    }
                }}
                initialKeywords={activeSegment?.search_keywords_for_media || ''}
                narrationText={activeSegment?.narration_text || ''}
                mode={mediaSearchMode}
                videoTitle={title}
            />
        )}
        {isAIToolsOpen && activeSegment && (
            <AIToolsModal
                isOpen={isAIToolsOpen}
                onClose={() => setIsAIToolsOpen(false)}
                segment={activeSegment}
                activeClipId={activeClipIdForTools || activeSegment.media[0].id}
                onUpdateMedia={(newUrl) => handleUpdateSegmentMedia(activeSegment.id, activeClipIdForTools, newUrl, 'image')}
                onUpdateAudio={(newUrl, duration) => handleUpdateSegmentAudio(activeSegment.id, newUrl, duration)}
            />
        )}
         {isAudioModalOpen && activeSegment && (
            <AudioModal
                isOpen={isAudioModalOpen}
                onClose={() => setIsAudioModalOpen(false)}
                segment={activeSegment}
                targetTrackType={audioModalTargetTrack}
                onUpdateAudio={(newUrl, duration) => handleUpdateSegmentAudio(activeSegment.id, newUrl, duration)}
                onAddAudioTrack={handleAddAudioTrack}
                initialSearchTerm={initialScript.backgroundMusicKeywords}
            />
        )}
        <ExportModal 
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            title={title}
            segments={segments}
            audioTracks={audioTracks}
        />
    </div>
  );
};

export default VideoEditor;
