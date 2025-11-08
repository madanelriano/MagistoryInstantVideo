import React, { useState, useEffect } from 'react';
import type { Segment } from '../types';
import { PlayIcon } from './icons';

interface PreviewWindowProps {
  segment: Segment;
  onTextChange: (segmentId: string, newText: string) => void;
  onOpenMediaSearch: () => void;
  onOpenVideoPreview: () => void;
}

const PreviewWindow: React.FC<PreviewWindowProps> = ({ segment, onTextChange, onOpenMediaSearch, onOpenVideoPreview }) => {
    const [localText, setLocalText] = useState(segment.narration_text);

    useEffect(() => {
        setLocalText(segment.narration_text);
    }, [segment]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setLocalText(e.target.value);
    };

    const handleBlur = () => {
        onTextChange(segment.id, localText);
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex-grow flex flex-col md:flex-row gap-4 h-full min-h-[300px] md:min-h-0">
            <div className="w-full md:w-2/3 h-full aspect-video bg-black rounded-md overflow-hidden relative group">
                {segment.mediaType === 'video' ? (
                    <video 
                        key={segment.mediaUrl}
                        src={segment.mediaUrl} 
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                    />
                ) : (
                    <img 
                        src={segment.mediaUrl} 
                        alt={segment.search_keywords_for_media} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                )}
                {/* Hover controls overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 pointer-events-none">
                     <button 
                        onClick={onOpenMediaSearch}
                        className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-md hover:bg-white/30 pointer-events-auto"
                    >
                        Change Media
                    </button>
                    <button 
                        onClick={onOpenVideoPreview}
                        className="px-6 py-3 bg-purple-600/80 backdrop-blur-sm text-white font-semibold rounded-md hover:bg-purple-700/80 flex items-center gap-2 pointer-events-auto"
                        title="Preview Full Video"
                    >
                        <PlayIcon />
                        Preview All
                    </button>
                </div>
            </div>
            <div className="w-full md:w-1/3 flex flex-col">
                <h3 className="text-lg font-semibold mb-2 text-purple-300">Narration / On-screen Text</h3>
                <textarea
                    value={localText}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-md resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    rows={6}
                />
                <p className="text-xs text-gray-400 mt-2">Media keywords: <span className="font-mono text-gray-300">{segment.search_keywords_for_media}</span></p>
            </div>
        </div>
    );
};

export default PreviewWindow;