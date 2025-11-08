import React, { useState, useCallback } from 'react';
import type { VideoScript, Segment, TransitionEffect } from '../types';
import PreviewWindow from './PreviewWindow';
import Timeline from './Timeline';
import Toolbar from './Toolbar';
import MediaSearchModal from './MediaSearchModal';
import VideoPreviewModal from './VideoPreviewModal';
import AIToolsModal from './AIToolsModal';
import AudioModal from './AudioModal'; // Import the new modal

interface VideoEditorProps {
  initialScript: VideoScript;
}

const VideoEditor: React.FC<VideoEditorProps> = ({ initialScript }) => {
  const [title, setTitle] = useState(initialScript.title);
  const [segments, setSegments] = useState<Segment[]>(initialScript.segments);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(segments[0]?.id || null);
  const [isMediaSearchOpen, setIsMediaSearchOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAIToolsOpen, setIsAIToolsOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false); // State for the new audio modal

  const activeSegment = segments.find(s => s.id === activeSegmentId) || null;

  const handleUpdateSegmentText = useCallback((segmentId: string, newText: string) => {
    setSegments(prevSegments =>
      prevSegments.map(s =>
        s.id === segmentId ? { ...s, narration_text: newText } : s
      )
    );
  }, []);
  
  const handleUpdateSegmentMedia = useCallback((segmentId: string, newMediaUrl: string, newMediaType: 'image' | 'video') => {
    setSegments(prevSegments =>
      prevSegments.map(s =>
        s.id === segmentId ? { ...s, mediaUrl: newMediaUrl, mediaType: newMediaType } : s
      )
    );
  }, []);

  const handleUpdateSegmentAudio = useCallback((segmentId: string, newAudioUrl: string | undefined) => {
    setSegments(prevSegments =>
      prevSegments.map(s =>
        s.id === segmentId ? { ...s, audioUrl: newAudioUrl } : s
      )
    );
  }, []);

  const handleUpdateSegmentTransition = useCallback((segmentId: string, newTransition: TransitionEffect) => {
    setSegments(prevSegments =>
      prevSegments.map(s =>
        s.id === segmentId ? { ...s, transition: newTransition } : s
      )
    );
  }, []);

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)] animate-fade-in">
        <Toolbar 
          onOpenAITools={() => setIsAIToolsOpen(true)} 
          onOpenAudioModal={() => setIsAudioModalOpen(true)}
        />
        <div className="flex-grow flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 text-2xl font-bold bg-transparent border-b-2 border-gray-700 focus:outline-none focus:border-purple-500"
              />
            </div>
            {activeSegment && (
              <PreviewWindow 
                segment={activeSegment}
                onTextChange={handleUpdateSegmentText}
                onOpenMediaSearch={() => setIsMediaSearchOpen(true)}
                onOpenVideoPreview={() => setIsPreviewOpen(true)}
              />
            )}
            <Timeline 
                segments={segments}
                setSegments={setSegments}
                activeSegmentId={activeSegmentId}
                setActiveSegmentId={setActiveSegmentId}
                onUpdateTransition={handleUpdateSegmentTransition}
            />
        </div>
        {isMediaSearchOpen && activeSegment && (
            <MediaSearchModal
                isOpen={isMediaSearchOpen}
                onClose={() => setIsMediaSearchOpen(false)}
                onSelectMedia={(newUrl, newType) => handleUpdateSegmentMedia(activeSegment.id, newUrl, newType)}
                initialKeywords={activeSegment.search_keywords_for_media}
                narrationText={activeSegment.narration_text}
            />
        )}
        {isAIToolsOpen && activeSegment && (
            <AIToolsModal
                isOpen={isAIToolsOpen}
                onClose={() => setIsAIToolsOpen(false)}
                segment={activeSegment}
                onUpdateMedia={(newUrl) => handleUpdateSegmentMedia(activeSegment.id, newUrl, 'image')}
                onUpdateAudio={(newUrl) => handleUpdateSegmentAudio(activeSegment.id, newUrl)}
            />
        )}
         {isAudioModalOpen && activeSegment && (
            <AudioModal
                isOpen={isAudioModalOpen}
                onClose={() => setIsAudioModalOpen(false)}
                segment={activeSegment}
                onUpdateAudio={(newUrl) => handleUpdateSegmentAudio(activeSegment.id, newUrl)}
            />
        )}
        <VideoPreviewModal 
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            title={title}
            segments={segments}
        />
    </div>
  );
};

export default VideoEditor;