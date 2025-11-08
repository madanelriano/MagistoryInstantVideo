import React from 'react';
import type { Segment, TransitionEffect } from '../types';
import SegmentCard from './SegmentCard';
import TransitionPicker from './TransitionPicker';

interface TimelineProps {
    segments: Segment[];
    setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
    activeSegmentId: string | null;
    setActiveSegmentId: (id: string) => void;
    onUpdateTransition: (segmentId: string, newTransition: TransitionEffect) => void;
}

const Timeline: React.FC<TimelineProps> = ({ segments, setSegments, activeSegmentId, setActiveSegmentId, onUpdateTransition }) => {
    // A full drag-and-drop implementation is complex.
    // This is a placeholder for the logic.
    // For a real app, libraries like react-beautiful-dnd would be used.
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.setData("draggedSegmentIndex", index.toString());
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        const draggedIndex = parseInt(e.dataTransfer.getData("draggedSegmentIndex"));
        const newSegments = [...segments];
        const [draggedSegment] = newSegments.splice(draggedIndex, 1);
        newSegments.splice(dropIndex, 0, draggedSegment);
        setSegments(newSegments);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 h-48 flex-shrink-0">
            <h3 className="text-lg font-semibold mb-2 text-purple-300">Timeline</h3>
            <div className="flex items-center gap-2 overflow-x-auto h-full pb-2">
                {segments.map((segment, index) => (
                   <React.Fragment key={segment.id}>
                        <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragOver={handleDragOver}
                        >
                            <SegmentCard 
                                segment={segment}
                                isActive={segment.id === activeSegmentId}
                                onClick={() => setActiveSegmentId(segment.id)}
                            />
                        </div>
                        {index < segments.length - 1 && (
                            <TransitionPicker 
                                currentTransition={segment.transition || 'fade'}
                                onSelect={(newTransition) => onUpdateTransition(segment.id, newTransition)}
                            />
                        )}
                   </React.Fragment>
                ))}
                <div className="flex-shrink-0 w-24 h-full flex items-center justify-center bg-gray-700 rounded-md border-2 border-dashed border-gray-600 hover:border-purple-500 cursor-pointer transition-colors">
                    <span className="text-3xl text-gray-500">+</span>
                </div>
            </div>
        </div>
    );
};

export default Timeline;