
import React, { useRef, useMemo, useEffect } from 'react';
import type { Segment } from '../types';
import { PlayIcon, PauseIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { generateSubtitleChunks } from '../utils/media';

interface PreviewWindowProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  segment: Segment; 
  segments: Segment[];
  activeSegmentId: string;
  onUpdateSegments: (segments: Segment[]) => void;
  currentTime: number;
  isPlaying: boolean;
  totalDuration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  // ... pass-through props retained for compatibility but unused directly in this simplified view
  [key: string]: any; 
}

const PreviewWindow: React.FC<PreviewWindowProps> = ({ 
    title, onTitleChange, segments, currentTime, isPlaying, totalDuration, onPlayPause, onSeek
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    const currentRenderState = useMemo(() => {
        let elapsed = 0;
        for (const seg of segments) {
            if (currentTime >= elapsed && currentTime < elapsed + seg.duration) {
                const localTime = currentTime - elapsed;
                const clipDuration = seg.duration / seg.media.length;
                const clipIndex = Math.min(seg.media.length - 1, Math.floor(localTime / clipDuration));
                const activeClip = seg.media[clipIndex];
                return { segment: seg, clip: activeClip, localTime, clipIndex };
            }
            elapsed += seg.duration;
        }
        return null;
    }, [currentTime, segments]);

    // Audio Sync
    useEffect(() => {
        if (!audioRef.current) return;
        const activeSeg = currentRenderState?.segment;
        if (activeSeg?.audioUrl) {
            if (!audioRef.current.src.includes(activeSeg.audioUrl)) {
                 audioRef.current.src = activeSeg.audioUrl;
            }
            const expectedTime = currentRenderState?.localTime || 0;
            if (Math.abs(audioRef.current.currentTime - expectedTime) > 0.3) {
                audioRef.current.currentTime = expectedTime;
            }
            if (isPlaying) audioRef.current.play().catch(() => {});
            else audioRef.current.pause();
            audioRef.current.volume = activeSeg.audioVolume ?? 1.0;
        } else {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
    }, [currentRenderState?.segment.id, currentRenderState?.localTime, isPlaying]);

    // Subtitle Rendering
    const renderKaraokeText = () => {
        const renderSeg = currentRenderState?.segment;
        if (!renderSeg || !renderSeg.textOverlayStyle || !renderSeg.narration_text) return null;
        
        const timings = renderSeg.wordTimings;
        if (!timings || timings.length === 0) return null;

        const currentStyle = renderSeg.textOverlayStyle;
        const localTime = currentRenderState?.localTime || 0;

        const subtitleChunks = generateSubtitleChunks(timings, currentStyle.fontSize, currentStyle.maxCaptionLines || 2, 800);
        const displayChunk = subtitleChunks.find(c => localTime >= c.start && localTime <= c.end);

        if (!displayChunk) return null;

        return (
            <p 
                style={{
                    fontFamily: currentStyle.fontFamily,
                    fontSize: `${currentStyle.fontSize}px`,
                    backgroundColor: currentStyle.backgroundColor,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
                    textAlign: 'center',
                    lineHeight: 1.4
                }}
                className="p-2 rounded-md transition-all duration-100"
            >
                {displayChunk.timings.map((t, i) => {
                    const isActive = localTime >= t.start && localTime < t.end;
                    return (
                        <span key={i} style={{ color: isActive ? currentStyle.color : '#FFFFFF', opacity: isActive ? 1 : 0.7, marginRight: '0.25em' }}>
                            {t.word}
                        </span>
                    );
                })}
            </p>
        )
    }

    return (
        <div className="flex flex-col h-full w-full bg-[#0a0a0a] relative">
            {/* Title Overlay */}
            <div className="absolute top-0 left-0 w-full p-2 z-20 flex justify-center opacity-0 hover:opacity-100 transition-opacity">
                <input 
                    value={title} 
                    onChange={e => onTitleChange(e.target.value)} 
                    className="bg-transparent text-center text-gray-500 text-sm focus:text-white outline-none"
                />
            </div>

            {/* Video Stage */}
            <div className="flex-grow flex items-center justify-center relative overflow-hidden group">
                {currentRenderState ? (
                    <div className="relative aspect-[9/16] md:aspect-video h-full max-h-full bg-black shadow-lg">
                        {currentRenderState.clip.type === 'video' ? (
                            <video key={currentRenderState.clip.url} src={currentRenderState.clip.url} className="w-full h-full object-contain" autoPlay muted loop playsInline />
                        ) : (
                            <img src={currentRenderState.clip.url} className="w-full h-full object-contain" />
                        )}
                        <div className={`absolute inset-0 p-8 flex flex-col justify-end items-center pointer-events-none`}>
                            {renderKaraokeText()}
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-700 font-mono">NO SIGNAL</div>
                )}

                {/* Floating Controls */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/50 px-6 py-2 rounded-full backdrop-blur-sm">
                    <button onClick={() => onSeek(Math.max(0, currentTime - 5))} className="text-white hover:scale-110"><ChevronLeftIcon /></button>
                    <button onClick={onPlayPause} className="text-white hover:scale-110">
                        {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                    </button>
                    <button onClick={() => onSeek(Math.min(totalDuration, currentTime + 5))} className="text-white hover:scale-110"><ChevronRightIcon /></button>
                </div>
            </div>

            {/* Hidden Audio */}
            <audio ref={audioRef} className="hidden" />
        </div>
    );
};

export default PreviewWindow;
