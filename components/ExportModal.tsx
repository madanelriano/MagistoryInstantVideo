
import React, { useState, useRef, useEffect } from 'react';
import type { Segment } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { DownloadIcon } from './icons';
import { generateSubtitleChunks, audioBufferToWav } from '../utils/media';
import type { FFmpeg } from '@ffmpeg/ffmpeg'; 

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  segments: Segment[];
}

type ExportStatus = 'idle' | 'loading_engine' | 'rendering_audio' | 'rendering_video' | 'encoding' | 'complete' | 'error';

const RENDER_WIDTH = 1280;
const RENDER_HEIGHT = 720;
const FRAME_RATE = 30;

// Helper to fetch Blob with progress tracking
const fetchWithProgress = async (url: string, mimeType: string, onProgress: (percent: number) => void): Promise<string> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        
        if (!total) {
            const blob = await response.blob();
            onProgress(100);
            return URL.createObjectURL(new Blob([blob], { type: mimeType }));
        }

        const reader = response.body?.getReader();
        if (!reader) {
            const blob = await response.blob();
            onProgress(100);
            return URL.createObjectURL(new Blob([blob], { type: mimeType }));
        }

        let receivedLength = 0;
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;
            onProgress((receivedLength / total) * 100);
        }

        const blob = new Blob(chunks, { type: mimeType });
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, title, segments }) => {
    const [status, setStatus] = useState<ExportStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [isCompatible, setIsCompatible] = useState(true);
    
    const statusRef = useRef<ExportStatus>('idle');
    const ffmpegRef = useRef<FFmpeg | null>(null);
    const isCancelledRef = useRef(false);
    const loadingIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        // Strict check for SharedArrayBuffer
        // This is REQUIRED for the ffmpeg rendering engine to work properly.
        // Most mobile browsers and non-secure contexts (http://localhost on external device) lack this.
        const hasSAB = typeof window.SharedArrayBuffer !== 'undefined';
        setIsCompatible(hasSAB);

        if (isOpen) {
            setStatus('idle');
            setProgress(0);
            setVideoUrl(null);
            setError('');
            isCancelledRef.current = false;
        } else {
             isCancelledRef.current = true;
             if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        }
    }, [isOpen]);

    const startLoadingAnimation = () => {
        const messages = [
            "Initializing video engine...",
            "Compiling WebAssembly...",
            "Still working...",
            "Optimizing..."
        ];
        let i = 0;
        setStatusText(messages[0]);
        if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = window.setInterval(() => {
            i = (i + 1) % messages.length;
            setStatusText(messages[i]);
        }, 3000);
    };

    const stopLoadingAnimation = () => {
        if (loadingIntervalRef.current) {
            clearInterval(loadingIntervalRef.current);
            loadingIntervalRef.current = null;
        }
    };

    const loadFFmpeg = async () => {
        if (!isCompatible) {
            throw new Error("SharedArrayBuffer is missing. Export not supported on this browser.");
        }

        if (!ffmpegRef.current) {
            try {
                const { FFmpeg } = await import('@ffmpeg/ffmpeg');
                ffmpegRef.current = new FFmpeg();
            } catch (e) {
                throw new Error("Failed to load FFmpeg module.");
            }
        }

        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) return;

        if (!ffmpeg.loaded) {
            setStatus('loading_engine');
            
            try {
                ffmpeg.on('progress', ({ progress: p }) => {
                    if (statusRef.current === 'encoding') {
                         setProgress(90 + (p * 10));
                    }
                });

                const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
                
                setStatusText('Downloading engine scripts...');
                const coreURL = await fetchWithProgress(`${baseURL}/ffmpeg-core.js`, 'text/javascript', (p) => setProgress(p * 0.05));

                setStatusText('Downloading engine core (~25MB)...');
                const wasmURL = await fetchWithProgress(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm', (p) => setProgress(5 + (p * 0.20)));

                setProgress(25);
                startLoadingAnimation();
                await new Promise(r => setTimeout(r, 100));

                await ffmpeg.load({
                    coreURL: coreURL,
                    wasmURL: wasmURL,
                });
                
                stopLoadingAnimation();
                setStatusText('Engine ready.');
                
            } catch (e: any) {
                stopLoadingAnimation();
                console.error("FFmpeg load error:", e);
                // Clean up error message
                const msg = e.message?.includes("SharedArrayBuffer") 
                    ? "Browser missing security features required for export." 
                    : e.message || "Failed to initialize engine.";
                
                setError(msg);
                setStatus('error');
                throw e; 
            }
        }
    };

    const handleClose = () => {
        isCancelledRef.current = true;
        stopLoadingAnimation();
        onClose();
    }
    
    const drawKaraokeText = (ctx: CanvasRenderingContext2D, segment: Segment, currentTimeInSegment: number) => {
         const style = segment.textOverlayStyle;
         if (!style || !segment.narration_text) return;
         const timings = segment.wordTimings;
         if (!timings || timings.length === 0) return;

         ctx.font = `bold ${style.fontSize}px ${style.fontFamily}`;
         ctx.textBaseline = 'middle';
         const maxWidth = RENDER_WIDTH * 0.9;
         const chunks = generateSubtitleChunks(timings, style.fontSize, style.maxCaptionLines || 2, maxWidth);
         const activeChunk = chunks.find(c => currentTimeInSegment >= c.start && currentTimeInSegment <= c.end) || (currentTimeInSegment < 0.1 ? chunks[0] : null);
         
         if (!activeChunk) return;

         const lines: WordTiming[][] = [];
         let currentLine: WordTiming[] = [];
         let currentLineWidth = 0;
         activeChunk.timings.forEach(timing => {
            const w = ctx.measureText(timing.word + ' ').width;
            if (currentLineWidth + w > maxWidth && currentLine.length) { lines.push(currentLine); currentLine = [timing]; currentLineWidth = w; }
            else { currentLine.push(timing); currentLineWidth += w; }
         });
         if (currentLine.length) lines.push(currentLine);

         const totalH = lines.length * (style.fontSize * 1.2);
         let y = style.position === 'top' ? 60 + totalH/2 : style.position === 'center' ? RENDER_HEIGHT/2 : RENDER_HEIGHT - 60 - totalH/2;

         if (style.backgroundColor) {
             let maxW = 0; lines.forEach(l => maxW = Math.max(maxW, ctx.measureText(l.map(t=>t.word).join(' ')).width));
             ctx.fillStyle = style.backgroundColor;
             ctx.fillRect((RENDER_WIDTH - maxW - 40)/2, y - totalH/2 - style.fontSize*0.6, maxW + 40, totalH + 20);
         }

         lines.forEach((line, i) => {
             const lineStr = line.map(t => t.word).join(' ');
             const lw = ctx.measureText(lineStr).width;
             let cx = (RENDER_WIDTH - lw)/2;
             const ly = y - totalH/2 + i*(style.fontSize*1.2);
             line.forEach(t => {
                 const isActive = currentTimeInSegment >= t.start && currentTimeInSegment < t.end;
                 ctx.fillStyle = isActive ? (style.animation === 'highlight' ? '#000' : style.color) : '#FFF';
                 if (isActive && style.animation === 'highlight') {
                      ctx.save(); ctx.fillStyle = style.color; ctx.fillRect(cx-2, ly-style.fontSize/2, ctx.measureText(t.word).width+4, style.fontSize); ctx.restore();
                 }
                 ctx.fillText(t.word, cx, ly);
                 cx += ctx.measureText(t.word + ' ').width;
             });
         });
    }

    const handleStartExport = async () => {
        if (!isCompatible) {
            setError("Cannot export on this device. Please use a Desktop browser (Chrome/Edge) or use the Cloud Video Generator.");
            setStatus('error');
            return;
        }
        
        if (status !== 'idle' && status !== 'error') return;
        isCancelledRef.current = false;
        setError('');
        
        try {
            await loadFFmpeg();
            if (isCancelledRef.current) return;

            const ffmpeg = ffmpegRef.current;
            if (!ffmpeg || !ffmpeg.loaded) throw new Error("FFmpeg failed to load");

            setStatus('rendering_audio');
            setStatusText('Mixing audio tracks...');
            setProgress(30);

            const OfflineContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
            const totalDuration = segments.reduce((acc, s) => acc + s.duration, 0);
            const offlineCtx = new OfflineContextClass(1, Math.ceil(totalDuration * 44100), 44100);
            
            let currentAudioTime = 0;
            for (const s of segments) {
                if (s.audioUrl) {
                    try {
                        const res = await fetch(s.audioUrl);
                        const ab = await res.arrayBuffer();
                        const b = await offlineCtx.decodeAudioData(ab);
                        const src = offlineCtx.createBufferSource();
                        src.buffer = b;
                        const gain = offlineCtx.createGain();
                        gain.gain.value = s.audioVolume ?? 1.0;
                        src.connect(gain);
                        gain.connect(offlineCtx.destination);
                        src.start(currentAudioTime);
                    } catch(e) {}
                }
                currentAudioTime += s.duration;
            }
            const renderedBuffer = await offlineCtx.startRendering();
            await ffmpeg.writeFile('audio.wav', new Uint8Array(audioBufferToWav(renderedBuffer)));
            setProgress(35);

            setStatus('rendering_video');
            setStatusText('Loading visual assets...');
            const canvas = document.createElement('canvas');
            canvas.width = RENDER_WIDTH;
            canvas.height = RENDER_HEIGHT;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error("Canvas init failed");

            const loadedAssets = new Map<string, HTMLImageElement | HTMLVideoElement>();
            for (const s of segments) {
                for (const c of s.media) {
                     if (!loadedAssets.has(c.id)) {
                         const safeUrl = c.url.startsWith('data:') ? c.url : `${c.url}?t=${Date.now()}`;
                         try {
                             if (c.type === 'image') {
                                 const img = new Image(); img.crossOrigin="Anonymous"; img.src=safeUrl; await img.decode();
                                 loadedAssets.set(c.id, img);
                             } else {
                                 const v = document.createElement('video'); v.crossOrigin="Anonymous"; v.src=safeUrl;
                                 await new Promise((r,j)=>{v.onloadedmetadata=r;v.onerror=j});
                                 loadedAssets.set(c.id, v);
                             }
                         } catch(e) {}
                     }
                }
            }

            const totalFrames = Math.ceil(totalDuration * FRAME_RATE);
            let currentTime = 0;
            let currentSegmentIndex = 0;
            let segmentTimeStart = 0;

            for (let i = 0; i < totalFrames; i++) {
                if (isCancelledRef.current) return;
                
                currentTime = i / FRAME_RATE;
                while(currentSegmentIndex < segments.length - 1 && currentTime >= segmentTimeStart + segments[currentSegmentIndex].duration) {
                    segmentTimeStart += segments[currentSegmentIndex].duration;
                    currentSegmentIndex++;
                }
                const seg = segments[currentSegmentIndex];
                const timeInSeg = currentTime - segmentTimeStart;
                
                ctx.fillStyle = '#000'; ctx.fillRect(0,0,RENDER_WIDTH,RENDER_HEIGHT);
                
                const clipDuration = seg.duration / seg.media.length;
                const clipIdx = Math.min(seg.media.length-1, Math.floor(timeInSeg / clipDuration));
                const asset = loadedAssets.get(seg.media[clipIdx].id);
                if (asset) {
                    if (asset instanceof HTMLVideoElement) asset.currentTime = timeInSeg % clipDuration;
                    ctx.drawImage(asset, 0,0, RENDER_WIDTH, RENDER_HEIGHT);
                }

                drawKaraokeText(ctx, seg, timeInSeg);

                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.8));
                if (blob) await ffmpeg.writeFile(`frame_${String(i).padStart(3,'0')}.jpg`, new Uint8Array(await blob.arrayBuffer()));
                
                setProgress(35 + (i/totalFrames)*55);
                setStatusText(`Rendering frame ${i}/${totalFrames}`);
                if (i%5===0) await new Promise(r => setTimeout(r, 0));
            }

            setStatus('encoding');
            await ffmpeg.exec(['-framerate', String(FRAME_RATE), '-i', 'frame_%03d.jpg', '-i', 'audio.wav', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast', 'output.mp4']);
            const data = await ffmpeg.readFile('output.mp4');
            setVideoUrl(URL.createObjectURL(new Blob([data], {type:'video/mp4'})));
            setStatus('complete');
            setProgress(100);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setStatus('error');
        } finally {
            stopLoadingAnimation();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={handleClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-purple-300">Export Video (HD)</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>

                {status === 'idle' && (
                    <div className="text-center">
                        {!isCompatible ? (
                            <div className="bg-yellow-900/30 border border-yellow-600/50 p-4 rounded-md mb-6">
                                <p className="text-yellow-200 font-semibold mb-2">Device Compatibility Notice</p>
                                <p className="text-sm text-yellow-100/80 mb-2">
                                    Local video export requires a secure desktop environment (e.g., Chrome on PC). 
                                    Your current device (Mobile/Termux) does not support the required <code>SharedArrayBuffer</code> feature.
                                </p>
                                <p className="text-sm text-white font-bold">
                                    Recommended: Use "Generate Video" in the AI Tools menu for cloud rendering.
                                </p>
                            </div>
                        ) : (
                            <p className="text-gray-300 mb-4">Render high-quality MP4 video directly in your browser.</p>
                        )}
                        
                        <button 
                            onClick={handleStartExport} 
                            disabled={!isCompatible}
                            className={`w-full py-3 rounded-md text-white font-semibold transition-colors
                                ${!isCompatible ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-purple-600 hover:bg-purple-700'}
                            `}
                        >
                            {!isCompatible ? 'Export Unavailable on this Device' : 'Start Export'}
                        </button>
                    </div>
                )}

                {(status === 'loading_engine' || status === 'rendering_audio' || status === 'rendering_video' || status === 'encoding') && (
                    <div className="text-center py-4">
                        <div className="flex justify-center mb-6"><LoadingSpinner /></div>
                        <h3 className="text-lg font-semibold text-white mb-2">Processing Video</h3>
                        <p className="text-sm text-gray-400 mb-4">{statusText}</p>
                        <div className="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
                            <div className="bg-purple-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500">{Math.round(progress)}%</p>
                    </div>
                )}
                
                {status === 'complete' && videoUrl && (
                     <div className="text-center">
                        <p className="text-xl font-semibold text-green-400 mb-4">Render Complete!</p>
                        <video src={videoUrl} controls className="w-full rounded-md mb-4 max-h-64 bg-black"></video>
                        <a href={videoUrl} download={`${title.replace(/ /g, '_')}.mp4`} className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-md text-white font-semibold flex items-center justify-center gap-2">
                            <DownloadIcon /> Download MP4
                        </a>
                     </div>
                )}

                {status === 'error' && (
                    <div className="text-center">
                        <p className="text-xl font-semibold text-red-400 mb-4">Export Failed</p>
                        <div className="bg-gray-900/50 p-4 rounded-md mb-4 text-left border border-red-900/50">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                         <button onClick={() => setStatus('idle')} className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold">Back</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportModal;
