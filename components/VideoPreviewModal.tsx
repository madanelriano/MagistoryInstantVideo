import React, { useState, useEffect, useRef } from 'react';
import type { Segment } from '../types';

interface DisplaySegment extends Segment {
  animationState: 'enter' | 'exit' | 'stable';
}

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  segments: Segment[];
}

const SEGMENT_DURATION_MS = 3000;
const TRANSITION_DURATION_MS = 700;

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ isOpen, onClose, title, segments }) => {
  const [displaySegments, setDisplaySegments] = useState<DisplaySegment[]>([]);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);
  const currentIndexRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const getAnimationClass = (segment: DisplaySegment): string => {
    if (segment.animationState === 'stable') return 'opacity-100';
    const effect = (segments[currentIndexRef.current - 1]?.transition || 'fade');
    return `${effect}-${segment.animationState}`;
  };
  
  const playAudioForSegment = (segment: Segment | null) => {
    if (audioRef.current) {
        if (segment?.audioUrl) {
            audioRef.current.src = segment.audioUrl;
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        } else {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
    }
  };

  const scheduleNextSegment = () => {
    timerRef.current = window.setTimeout(() => {
        if (currentIndexRef.current >= segments.length - 1) {
            // End of video, stop last audio
            if (audioRef.current) audioRef.current.pause();
            return;
        }
        
        playAudioForSegment(null); // Stop current audio

        const outgoingSegment = segments[currentIndexRef.current];
        const incomingSegment = segments[currentIndexRef.current + 1];
        
        setDisplaySegments([
            { ...outgoingSegment, animationState: 'exit' },
            { ...incomingSegment, animationState: 'enter' },
        ]);

        currentIndexRef.current += 1;
        playAudioForSegment(incomingSegment); // Play next audio

        // After transition, clean up the exited segment
        setTimeout(() => {
            setDisplaySegments(prev => 
                prev.filter(s => s.id === incomingSegment.id)
                    .map(s => ({ ...s, animationState: 'stable' }))
            );
        }, TRANSITION_DURATION_MS);

        scheduleNextSegment();

    }, SEGMENT_DURATION_MS);
  }

  useEffect(() => {
    if (isOpen && segments.length > 0) {
      currentIndexRef.current = 0;
      const firstSegment = segments[0];
      setDisplaySegments([{ ...firstSegment, animationState: 'stable' }]);
      setProgress(0);
      playAudioForSegment(firstSegment);
      
      scheduleNextSegment();

      const totalDuration = segments.length * SEGMENT_DURATION_MS;
      const startTime = Date.now();
      progressRef.current = window.setInterval(() => {
          const elapsedTime = Date.now() - startTime;
          const newProgress = Math.min(100, (elapsedTime / totalDuration) * 100);
          setProgress(newProgress);
          if (newProgress >= 100) {
              if (progressRef.current) clearInterval(progressRef.current);
          }
      }, 50);

    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [isOpen, segments]);

  if (!isOpen) return null;

  const activeSegment = displaySegments.find(s => s.animationState !== 'exit') || displaySegments[0] || null;

  const renderMedia = (segment: DisplaySegment) => {
    const classNames = `transition-image ${getAnimationClass(segment)}`;
     if (segment.mediaType === 'video') {
        return (
            <video
                key={segment.id}
                src={segment.mediaUrl}
                className={classNames}
                autoPlay
                muted
                loop
                playsInline
            />
        )
     }
     return (
        <img 
            key={segment.id}
            src={segment.mediaUrl} 
            alt={segment.search_keywords_for_media} 
            className={classNames}
        />
     )
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-5xl aspect-video flex flex-col p-4 relative" 
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-4 left-4 z-20">
          <h2 className="text-xl font-bold text-white bg-black/50 p-2 rounded-md">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-2xl font-bold hover:bg-white/30"
        >
          &times;
        </button>

        <div className="w-full h-full bg-black rounded-md overflow-hidden relative flex items-center justify-center">
            {displaySegments.map(segment => renderMedia(segment))}
            {/* Narration text overlay removed for a cleaner preview per user request */}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
            <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div 
                    className="bg-purple-500 h-full rounded-full" 
                    style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
                ></div>
            </div>
        </div>
        <audio ref={audioRef} loop={false} />
      </div>
    </div>
  );
};

export default VideoPreviewModal;
