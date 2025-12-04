
import React, { useMemo, useRef, useEffect } from 'react';
import type { Segment, AudioClip } from '../types';
import SegmentCard from './SegmentCard';

interface TimelineProps {
    segments: Segment[];
    activeSegmentId: string | null;
    setActiveSegmentId: (id: string) => void;
    timelineZoom: number;
    currentTime: number;
    isPlaying: boolean;
    onSeek: (time: number) => void;
    // ... other props ignored for brevity in this visual update
    [key: string]: any;
}

const BASE_PIXELS_PER_SECOND = 40; // Smaller scale for mobile look

const Timeline: React.FC<TimelineProps> = ({ 
    segments, activeSegmentId, setActiveSegmentId, timelineZoom, currentTime, isPlaying, onSeek
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const pixelsPerSecond = BASE_PIXELS_PER_SECOND * timelineZoom;

    const totalDuration = useMemo(() => segments.reduce((acc, curr) => acc + curr.duration, 0), [segments]);

    // Center Playhead Logic: We scroll the container so the playhead stays middle
    useEffect(() => {
        if (scrollContainerRef.current) {
            const containerWidth = scrollContainerRef.current.clientWidth;
            const playheadX = currentTime * pixelsPerSecond;
            // Center position: playheadX - half_screen
            scrollContainerRef.current.scrollTo({ left: playheadX - containerWidth / 2, behavior: isPlaying ? 'auto' : 'smooth' });
        }
    }, [currentTime, isPlaying, pixelsPerSecond]);

    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollContainerRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        onSeek(Math.max(0, clickX / pixelsPerSecond));
    }

    return (
        <div className="h-full w-full bg-[#0f0f0f] relative flex flex-col justify-center">
            
            {/* Time Indicator (Center Line) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white z-50 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white bg-black/50 px-1 rounded z-50">
                {new Date(currentTime * 1000).toISOString().substr(14, 5)}
            </div>

            {/* Scroll Area */}
            <div 
                ref={scrollContainerRef}
                className="overflow-x-auto overflow-y-hidden custom-scrollbar h-24 relative"
                onMouseDown={handleTimelineClick}
            >
                <div 
                    className="flex items-center h-full relative"
                    style={{ width: `${totalDuration * pixelsPerSecond + 1000}px`, paddingLeft: '50vw', paddingRight: '50vw' }}
                >
                    {/* Ruler */}
                    <div className="absolute top-0 left-0 right-0 h-4 border-b border-white/10 pointer-events-none">
                        {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
                            <div key={i} className="absolute bottom-0 h-2 border-l border-gray-600" style={{ left: `${i * pixelsPerSecond + (window.innerWidth/2)}px` }}></div>
                        ))}
                    </div>

                    {/* Clip Strip */}
                    <div className="flex h-16 mt-2 relative">
                        {segments.map((segment) => {
                            const width = segment.duration * pixelsPerSecond;
                            const isActive = segment.id === activeSegmentId;
                            return (
                                <div
                                    key={segment.id}
                                    style={{ width }}
                                    className={`relative flex-shrink-0 h-full cursor-pointer transition-all duration-75 overflow-hidden mx-[1px] rounded-sm
                                        ${isActive ? 'ring-2 ring-white z-10 brightness-110' : 'brightness-75 hover:brightness-100'}
                                    `}
                                    onClick={(e) => { e.stopPropagation(); setActiveSegmentId(segment.id); }}
                                >
                                    {/* Thumbnail Strip */}
                                    <div className="absolute inset-0 flex">
                                        {Array.from({ length: Math.ceil(width / 60) }).map((_, i) => (
                                            <img 
                                                key={i} 
                                                src={segment.media[0].url} 
                                                className="h-full w-[60px] object-cover pointer-events-none" 
                                            />
                                        ))}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/60 text-[8px] text-white px-1 truncate">
                                        {segment.narration_text || 'Clip'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
