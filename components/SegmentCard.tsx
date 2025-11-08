import React from 'react';
import type { Segment } from '../types';
import { MusicIcon, PlayIcon } from './icons';

interface SegmentCardProps {
    segment: Segment;
    isActive: boolean;
    onClick: () => void;
}

const SegmentCard: React.FC<SegmentCardProps> = ({ segment, isActive, onClick }) => {
    const activeClasses = isActive ? 'ring-2 ring-purple-500 shadow-lg' : 'ring-1 ring-gray-700';

    return (
        <div 
            onClick={onClick}
            className={`w-40 h-full flex-shrink-0 bg-gray-700 rounded-md overflow-hidden cursor-pointer relative group transition-all duration-200 ${activeClasses}`}
        >
             {segment.mediaType === 'video' ? (
                <video 
                    src={segment.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                />
            ) : (
                <img src={segment.mediaUrl} alt={segment.search_keywords_for_media} className="w-full h-full object-cover"/>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-50 group-hover:bg-opacity-30 transition-all"></div>
            
            {segment.audioUrl && (
                <div className="absolute top-1.5 right-1.5 bg-black/50 p-1 rounded-full">
                    <MusicIcon />
                </div>
            )}
             {segment.mediaType === 'video' && (
                <div className="absolute top-1.5 left-1.5 bg-black/50 p-1 rounded-full">
                    <PlayIcon className="w-4 h-4 text-white"/>
                </div>
            )}


            <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-xs truncate">
                    {segment.narration_text}
                </p>
            </div>
        </div>
    );
};

export default SegmentCard;