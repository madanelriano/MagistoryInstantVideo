
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { VideoScript, Segment, TransitionEffect, TextOverlayStyle, WordTiming, MediaClip, AudioClip } from '../types';
import PreviewWindow from './PreviewWindow';
import Timeline from './Timeline';
import Sidebar from './Sidebar';
import ResourcePanel from './ResourcePanel';
import PropertiesPanel from './PropertiesPanel';
import AIToolsModal from './AIToolsModal';
import ExportModal from './ExportModal';
import { estimateWordTimings } from '../utils/media';
import { UndoIcon, RedoIcon } from './icons';

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

  // --- UI STATE ---
  const [activeSidebarTab, setActiveSidebarTab] = useState('media');
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(segments[0]?.id || null);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAIToolsOpen, setIsAIToolsOpen] = useState(false);

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


  // --- HANDLERS (Same as before, adapted for direct calls) ---
  const handleUpdateSegmentText = useCallback((segmentId: string, newText: string) => {
    updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, narration_text: newText, wordTimings: undefined } : s));
  }, [updateSegments]);
  
  // Replaces Modal Selection
  const handleResourceSelectMedia = useCallback((newUrl: string, type: 'image' | 'video') => {
      if (!activeSegmentId) return;
      // Replace media of currently selected segment
      updateSegments(prev => prev.map(s => {
        if (s.id !== activeSegmentId) return s;
        // Simple replace of first clip for this demo, or append? CapCut usually adds to track. 
        // For this app logic: Replace the clip in the segment.
        return { 
            ...s, 
            media: [{ id: `clip-${Date.now()}`, url: newUrl, type }] 
        };
      }));
  }, [activeSegmentId, updateSegments]);

  const handleResourceSelectAudio = useCallback((url: string, name: string) => {
      // Add as background track
      updateAudioTracks(prev => [...prev, { 
          id: `audio-${Date.now()}`, 
          url, 
          name, 
          type: 'music', 
          startTime: currentTime, 
          duration: 10, 
          volume: 0.8 
      }]);
  }, [updateAudioTracks, currentTime]);

  const handleResourceAddText = useCallback((text: string) => {
      if (activeSegmentId) {
          handleUpdateSegmentText(activeSegmentId, text);
      }
  }, [activeSegmentId, handleUpdateSegmentText]);


  const handleUpdateSegmentAudio = useCallback((segmentId: string, newAudioUrl: string | undefined, audioDuration?: number) => {
    updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, audioUrl: newAudioUrl, duration: (audioDuration && audioDuration > 0 && audioDuration < s.duration ? audioDuration : s.duration) } : s));
  }, [updateSegments]);

  const handleUpdateWordTimings = useCallback((segmentId: string, timings: WordTiming[]) => {
      updateSegments(prev => prev.map(s => s.id === segmentId ? { ...s, wordTimings: timings } : s));
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
    // Logic kept but usage moved to Properties or Shortcut (not simplified UI)
    const original = segments.find(s => s.id === segmentId);
    if (!original || splitTime < 0.5 || splitTime > original.duration - 0.5) return;
    // ... split implementation existing ...
    const index = segments.indexOf(original);
    const durA = splitTime;
    const durB = original.duration - splitTime;
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

  // Audio Track handlers
  const handleUpdateAudioTrack = useCallback((trackId: string, updates: Partial<AudioClip>) => {
      updateAudioTracks(prev => prev.map(t => t.id === trackId ? { ...t, ...updates } : t));
  }, [updateAudioTracks]);

  const handleDeleteAudioTrack = useCallback((trackId: string) => {
      updateAudioTracks(prev => prev.filter(t => t.id !== trackId));
  }, [updateAudioTracks]);


  return (
    <div className="flex flex-col h-screen w-full bg-[#0a0a0a] text-white font-sans overflow-hidden">
        
        {/* TOP BAR / MENU */}
        <div className="h-14 bg-[#121212] border-b border-gray-800 flex items-center justify-between px-4 z-50 flex-shrink-0">
             <div className="flex items-center gap-4">
                 <button className="text-gray-400 hover:text-white" onClick={() => window.location.reload()}>
                    <div className="font-bold text-lg text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Magistory</div>
                 </button>
                 <div className="h-4 w-px bg-gray-700 mx-2"></div>
                 <input 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="bg-transparent text-gray-300 text-sm focus:text-white outline-none w-48 hover:bg-white/5 px-2 py-1 rounded"
                />
             </div>
            
            <div className="flex items-center gap-2">
                 <div className="flex bg-black/20 rounded-md p-0.5 mr-4">
                    <button onClick={handleUndo} disabled={history.past.length === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30"><UndoIcon className="w-4 h-4" /></button>
                    <button onClick={handleRedo} disabled={history.future.length === 0} className="p-2 text-gray-400 hover:text-white disabled:opacity-30"><RedoIcon className="w-4 h-4" /></button>
                </div>
                <button onClick={() => setIsExportOpen(true)} className="px-5 py-1.5 bg-cyan-600 rounded-lg text-xs font-bold hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20">
                    Export
                </button>
            </div>
        </div>

        {/* WORKSPACE AREA (Grid) */}
        <div className="flex-grow flex overflow-hidden">
             
             {/* LEFT SIDEBAR (Icons) */}
             <Sidebar activeTab={activeSidebarTab} setActiveTab={setActiveSidebarTab} />

             {/* RESOURCE PANEL (Slide out) */}
             <ResourcePanel 
                activeTab={activeSidebarTab}
                onSelectMedia={handleResourceSelectMedia}
                onSelectAudio={handleResourceSelectAudio}
                onAddText={handleResourceAddText}
                onOpenAITools={() => setIsAIToolsOpen(true)}
             />

             {/* CENTER PREVIEW STAGE */}
             <div className="flex-grow bg-[#0a0a0a] flex flex-col relative min-w-0">
                <div className="flex-grow flex items-center justify-center p-8 bg-[#0a0a0a] bg-[radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:16px_16px]">
                    <div className="relative shadow-2xl shadow-black ring-1 ring-white/10" style={{ height: '80%', aspectRatio: '16/9' }}>
                        <PreviewWindow 
                            title={title}
                            onTitleChange={setTitle}
                            segments={segments} 
                            activeSegmentId={activeSegmentId!}
                            onUpdateSegments={updateSegments} 
                            segment={activeSegment || segments[0]} 
                            currentTime={currentTime} isPlaying={isPlaying} totalDuration={totalDuration}
                            onPlayPause={togglePlay} onSeek={handleSeek}
                            // Callbacks for preview window direct manipulation if enabled
                            onTextChange={handleUpdateSegmentText}
                            onUpdateAudio={handleUpdateSegmentAudio}
                            onUpdateWordTimings={handleUpdateWordTimings}
                            onUpdateTextOverlayStyle={handleUpdateSegmentTextOverlayStyle}
                            onUpdateDuration={handleUpdateSegmentDuration}
                            onUpdateTransition={handleUpdateSegmentTransition}
                            onUpdateVolume={handleUpdateSegmentVolume}
                            isLastSegment={false}
                            onOpenMediaSearch={() => {}} 
                            onRemoveMedia={() => {}}
                            onEditClipWithAI={() => {}}
                            onReorderClips={() => {}}
                            onSplitSegment={handleSplitSegment}
                        />
                    </div>
                </div>
                
                {/* TIMELINE AREA (Bottom of Center) */}
                <div className="h-64 bg-[#121212] border-t border-gray-800 flex flex-col z-10 flex-shrink-0">
                    <div className="h-8 border-b border-gray-800 flex items-center justify-between px-4 bg-[#161616]">
                        <div className="flex gap-4 text-xs text-gray-400">
                           <button onClick={() => setTimelineZoom(z => Math.max(0.5, z-0.2))} className="hover:text-white">-</button>
                           <span>Zoom</span>
                           <button onClick={() => setTimelineZoom(z => Math.min(3, z+0.2))} className="hover:text-white">+</button>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                            {new Date(currentTime * 1000).toISOString().substr(14, 5)} / {new Date(totalDuration * 1000).toISOString().substr(14, 5)}
                        </div>
                    </div>
                    <div className="flex-grow relative">
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
                            onAddSegment={() => {}} // Could trigger media tab
                            onUpdateAudioTrack={handleUpdateAudioTrack}
                            onDeleteAudioTrack={handleDeleteAudioTrack}
                            onAddAudioTrack={() => setActiveSidebarTab('audio')}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            onSeek={handleSeek}
                        />
                    </div>
                </div>
             </div>

             {/* RIGHT PROPERTIES PANEL */}
             <PropertiesPanel 
                segment={activeSegment}
                onUpdateVolume={handleUpdateSegmentVolume}
                onUpdateText={handleUpdateSegmentText}
                onUpdateStyle={handleUpdateSegmentTextOverlayStyle}
                onUpdateTransition={handleUpdateSegmentTransition}
                onDelete={handleDeleteSegment}
             />

        </div>

        {/* MODALS - Only for specialized heavy tasks now */}
        {isAIToolsOpen && activeSegment && (
            <AIToolsModal
                isOpen={isAIToolsOpen}
                onClose={() => setIsAIToolsOpen(false)}
                segment={activeSegment}
                activeClipId={activeSegment.media[0].id}
                onUpdateMedia={(newUrl) => handleResourceSelectMedia(newUrl, 'image')} // Limitation: always image for now in AI tools
                onUpdateAudio={(newUrl, duration) => handleUpdateSegmentAudio(activeSegment.id, newUrl, duration)}
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
