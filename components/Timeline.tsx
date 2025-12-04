
import React, { useMemo, useRef, useEffect } from 'react';
import type { Segment, AudioClip } from '../types';
import SegmentCard from './SegmentCard';
import { MusicIcon } from './icons';

interface TimelineProps {
    segments: Segment[];
    audioTracks?: AudioClip[];
    activeSegmentId: string | null;
    setActiveSegmentId: (id: string) => void;
    timelineZoom: number;
    currentTime: number;
    isPlaying: boolean;
    onSeek: (time: number) => void;
    onReorder: (segments: Segment[]) => void;
    [key: string]: any;
}

const BASE_PIXELS_PER_SECOND = 60; 

const Timeline: React.FC<TimelineProps> = ({ 
    segments, audioTracks = [], activeSegmentId, setActiveSegmentId, timelineZoom, currentTime, isPlaying, onSeek
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pixelsPerSecond = BASE_PIXELS_PER_SECOND * timelineZoom;

    const totalDuration = useMemo(() => segments.reduce((acc, curr) => acc + curr.duration, 0), [segments]);

    useEffect(() => {
        if (scrollContainerRef.current) {
            const containerWidth = scrollContainerRef.current.clientWidth;
            // Keep playhead at 1/3 of screen roughly for pro feel, or center
            const playheadX = currentTime * pixelsPerSecond;
            // If playhead moves past center, scroll
            if (isPlaying) {
                 scrollContainerRef.current.scrollTo({ left: playheadX - (containerWidth / 3), behavior: 'auto' });
            }
        }
    }, [currentTime, isPlaying, pixelsPerSecond]);

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollContainerRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft - 20; // -20 for left margin padding
        onSeek(Math.max(0, clickX / pixelsPerSecond));
    }

    return (
        <div className="h-full w-full bg-[#121212] relative flex flex-col">
            
            {/* Playhead Line - Fixed Overlay */}
            <div 
                className="absolute top-0 bottom-0 z-50 pointer-events-none border-l-2 border-cyan-500"
                style={{ 
                    left: `${(currentTime * pixelsPerSecond) + 20 - (scrollContainerRef.current?.scrollLeft || 0)}px`,
                    display: scrollContainerRef.current ? 'block' : 'none' 
                }} // This is tricky in React without forced update on scroll. 
                // A better approach for React is putting the playhead INSIDE the scroll container but sticking up.
            >
                <div className="w-3 h-3 bg-cyan-500 -ml-[7px] transform rotate-45 -mt-1.5"></div>
            </div>

            {/* Scroll Area */}
            <div 
                ref={scrollContainerRef}
                className="overflow-x-auto overflow-y-auto custom-scrollbar flex-grow relative"
                onMouseDown={handleTimelineClick}
            >
                <div 
                    className="relative min-h-full"
                    style={{ width: `${Math.max(window.innerWidth, totalDuration * pixelsPerSecond + 800)}px`, paddingLeft: '20px' }}
                >
                    {/* Time Ruler */}
                    <div className="h-6 border-b border-gray-700 bg-[#161616] sticky top-0 z-40 flex items-end select-none">
                        {Array.from({ length: Math.ceil(totalDuration) + 5 }).map((_, i) => (
                            <div key={i} className="relative h-2 border-l border-gray-600" style={{ width: `${pixelsPerSecond}px` }}>
                                <span className="absolute -top-4 -left-1 text-[9px] text-gray-500">{i}s</span>
                                {/* Subticks */}
                                <div className="absolute bottom-0 left-1/4 h-1 border-l border-gray-700"></div>
                                <div className="absolute bottom-0 left-2/4 h-1 border-l border-gray-700"></div>
                                <div className="absolute bottom-0 left-3/4 h-1 border-l border-gray-700"></div>
                            </div>
                        ))}
                    </div>

                    {/* Main Video Track */}
                    <div className="mt-4 flex h-24 bg-[#1a1a1a] rounded relative group">
                        <div className="absolute -left-5 top-8 -rotate-90 text-[10px] text-gray-500 tracking-widest">VIDEO</div>
                        {segments.map((segment) => {
                            const width = segment.duration * pixelsPerSecond;
                            const isActive = segment.id === activeSegmentId;
                            return (
                                <div
                                    key={segment.id}
                                    style={{ width }}
                                    className={`relative flex-shrink-0 h-full cursor-pointer transition-all duration-75 overflow-hidden border-r border-black
                                        ${isActive ? 'ring-2 ring-white z-10' : 'brightness-90 hover:brightness-100'}
                                    `}
                                    onClick={(e) => { e.stopPropagation(); setActiveSegmentId(segment.id); }}
                                >
                                    {/* Thumbnail Strip */}
                                    <div className="absolute inset-0 flex bg-gray-800">
                                        {Array.from({ length: Math.ceil(width / 80) }).map((_, i) => (
                                            <img 
                                                key={i} 
                                                src={segment.media[0].url} 
                                                className="h-full w-[80px] object-cover pointer-events-none opacity-60" 
                                            />
                                        ))}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-5 bg-black/60 text-[9px] text-white px-1 truncate flex items-center">
                                        <span className="w-1 h-4 bg-purple-500 mr-1 rounded-sm"></span>
                                        {segment.narration_text || 'Clip'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Audio Tracks */}
                    {audioTracks.map((track, idx) => (
                         <div key={track.id} className="mt-1 h-8 bg-[#1a1a1a] relative rounded overflow-hidden">
                            <div 
                                className="absolute top-0 bottom-0 bg-teal-900/50 border border-teal-700/50 rounded flex items-center px-2"
                                style={{ 
                                    left: `${track.startTime * pixelsPerSecond}px`,
                                    width: `${track.duration * pixelsPerSecond}px`
                                }}
                            >
                                <MusicIcon className="w-3 h-3 text-teal-400 mr-2" />
                                <span className="text-[9px] text-teal-100 truncate">{track.name}</span>
                            </div>
                         </div>
                    ))}
                    
                    {/* Empty Audio Track placeholder */}
                    <div className="mt-1 h-8 bg-[#1a1a1a]/50 border-t border-dashed border-gray-800 flex items-center justify-center">
                         <span className="text-[9px] text-gray-700">Drag audio here</span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Timeline;
