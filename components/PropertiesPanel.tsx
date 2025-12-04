

import React from 'react';
import type { Segment, TextOverlayStyle, TransitionEffect, AudioClip } from '../types';
import { VolumeXIcon, TextIcon, TransitionIcon, TrashIcon, MusicIcon, MagicWandIcon } from './icons';

interface PropertiesPanelProps {
  segment: Segment | null;
  audioTrack?: AudioClip | null;
  onUpdateVolume: (id: string, vol: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateStyle: (id: string, style: Partial<TextOverlayStyle>) => void;
  onUpdateTransition: (id: string, transition: TransitionEffect) => void;
  onDelete: () => void;
  onOpenAITools: () => void;
  onUpdateAudioTrack?: (id: string, updates: Partial<AudioClip>) => void;
  onDeleteAudioTrack?: (id: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  segment, audioTrack, onUpdateVolume, onUpdateText, onUpdateStyle, onUpdateTransition, onDelete, onOpenAITools, onUpdateAudioTrack, onDeleteAudioTrack
}) => {
  
  // Render Audio Track Properties if selected
  if (audioTrack && onUpdateAudioTrack && onDeleteAudioTrack) {
    return (
        <div className="h-auto bg-[#1e1e1e] flex flex-row items-stretch px-2 md:px-6 py-2 md:py-4 gap-4 md:gap-8 overflow-x-auto custom-scrollbar">
            {/* Info */}
            <div className="flex flex-col gap-2 border-r border-white/10 pr-4 w-48 flex-shrink-0">
                 <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                    <MusicIcon className="w-3 h-3 md:w-4 md:h-4" /> Selected Track
                 </label>
                 <div className="text-sm font-medium text-white truncate" title={audioTrack.name}>
                     {audioTrack.name}
                 </div>
                 <div className="text-[10px] text-gray-500 uppercase font-mono">{audioTrack.type}</div>
            </div>
            
            {/* Timing */}
            <div className="flex flex-col gap-2 border-r border-white/10 pr-4 w-56 flex-shrink-0">
                <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase">Timing (Seconds)</label>
                <div className="flex gap-2">
                     <div className="flex-1">
                         <span className="text-[9px] text-gray-500 block mb-1">START</span>
                         <input 
                            type="number" step="0.1" min="0"
                            value={audioTrack.startTime}
                            onChange={(e) => onUpdateAudioTrack(audioTrack.id, { startTime: Math.max(0, parseFloat(e.target.value)) })}
                            className="w-full bg-[#121212] border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-purple-500 outline-none"
                         />
                     </div>
                     <div className="flex-1">
                         <span className="text-[9px] text-gray-500 block mb-1">DURATION</span>
                         <input 
                            type="number" step="0.1" min="0.1"
                            value={audioTrack.duration}
                            onChange={(e) => onUpdateAudioTrack(audioTrack.id, { duration: Math.max(0.1, parseFloat(e.target.value)) })}
                            className="w-full bg-[#121212] border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-purple-500 outline-none"
                         />
                     </div>
                </div>
            </div>

            {/* Volume */}
            <div className="flex flex-col gap-2 border-r border-white/10 pr-4 w-48 flex-shrink-0">
                 <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase">Volume</label>
                 <div className="bg-[#121212] p-3 rounded-lg border border-gray-700 flex flex-col gap-2">
                    <div className="flex justify-between">
                         <span className="text-[10px] font-bold text-gray-500">LEVEL</span>
                         <span className="text-xs text-purple-400 font-bold">{Math.round(audioTrack.volume * 100)}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.05"
                        value={audioTrack.volume}
                        onChange={(e) => onUpdateAudioTrack(audioTrack.id, { volume: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
                    />
                 </div>
            </div>

            {/* Actions */}
             <div className="ml-auto pl-2 self-center flex-shrink-0">
                <button 
                        onClick={() => onDeleteAudioTrack(audioTrack.id)}
                        className="group flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-red-500/5 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all shadow-sm hover:shadow-red-900/30"
                        title="Delete Audio Track"
                    >
                    <TrashIcon className="w-5 h-5 md:w-6 md:h-6 mb-1 transition-transform group-hover:scale-110" />
                    <span className="text-[8px] md:text-[9px] font-bold tracking-wider opacity-70 group-hover:opacity-100">DEL</span>
                </button>
            </div>
        </div>
    );
  }

  // Render Segment Properties
  if (segment) {
    return (
        <div className="h-auto bg-[#1e1e1e] flex flex-row items-stretch px-2 md:px-6 py-2 md:py-4 gap-4 md:gap-8 overflow-x-auto custom-scrollbar">
           {/* Text Section */}
           <div className="flex items-start gap-3 md:gap-4 border-r border-white/10 pr-4 md:pr-8 min-w-[280px] md:min-w-max flex-shrink-0">
              <div className="flex flex-col gap-2 w-[180px] md:w-[400px]">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                        <TextIcon className="w-3 h-3 md:w-4 md:h-4" /> Script & Captions
                    </label>
                    <button 
                        onClick={onOpenAITools}
                        className="text-[10px] bg-purple-900/40 hover:bg-purple-600 text-purple-300 hover:text-white px-2 py-0.5 rounded flex items-center gap-1 transition-colors border border-purple-500/30"
                        title="Generate Voiceover or Images with AI"
                    >
                        <MagicWandIcon className="w-3 h-3" /> AI Tools
                    </button>
                  </div>
                  <textarea 
                      value={segment.narration_text || ''}
                      onChange={(e) => onUpdateText(segment.id, e.target.value)}
                      className="bg-[#121212] border border-gray-700 rounded-lg px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-gray-200 focus:border-purple-500 focus:bg-[#0a0a0a] outline-none w-full h-24 md:h-32 resize-none custom-scrollbar leading-relaxed shadow-inner transition-colors"
                      placeholder="Enter narration text here..."
                  />
              </div>
              {/* Style Controls */}
              <div className="flex flex-col gap-2 md:gap-3 pt-1 w-32 md:w-48">
                 <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase">Caption Style</label>
                 <div className="flex flex-col gap-2 md:gap-3">
                     <div className="flex gap-2 md:gap-3">
                        {/* Font Size */}
                        <div className="flex items-center bg-[#121212] rounded border border-gray-700 h-8 md:h-9 px-2 flex-1 group focus-within:border-purple-500 transition-colors">
                            <span className="text-[8px] md:text-[10px] text-gray-500 font-bold mr-1 md:mr-2">SIZE</span>
                            <input 
                                type="number" 
                                value={segment.textOverlayStyle?.fontSize || 30}
                                onChange={(e) => onUpdateStyle(segment.id, { fontSize: parseInt(e.target.value) })}
                                className="w-full bg-transparent text-xs md:text-sm font-mono outline-none text-white text-right"
                            />
                        </div>
                        {/* Color */}
                        <div className="h-8 w-8 md:h-9 md:w-12 bg-[#121212] rounded border border-gray-700 p-1 cursor-pointer hover:border-purple-500 transition-colors relative overflow-hidden group">
                            <input 
                                type="color" 
                                value={segment.textOverlayStyle?.color || '#ffffff'}
                                onChange={(e) => onUpdateStyle(segment.id, { color: e.target.value })}
                                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer border-none p-0 opacity-0"
                                title="Text Color"
                            />
                            <div className="w-full h-full rounded-sm shadow-sm border border-white/10" style={{ backgroundColor: segment.textOverlayStyle?.color || '#ffffff' }}></div>
                        </div>
                     </div>
                     
                     {/* Position */}
                     <div className="flex flex-col gap-1">
                         <span className="text-[8px] md:text-[9px] text-gray-500 font-bold">POSITION</span>
                         <div className="flex bg-[#121212] rounded border border-gray-700 h-8 md:h-9 p-0.5">
                            {['top', 'center', 'bottom'].map(pos => (
                                <button 
                                    key={pos}
                                    onClick={() => onUpdateStyle(segment.id, { position: pos as any })}
                                    className={`flex-1 h-full text-[8px] md:text-[9px] uppercase rounded-sm transition-all font-bold ${segment.textOverlayStyle?.position === pos ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                                >
                                    {pos[0].toUpperCase()}
                                </button>
                            ))}
                         </div>
                     </div>
                 </div>
              </div>
           </div>
    
           {/* Audio Section */}
           <div className="flex flex-col gap-2 md:gap-3 border-r border-white/10 pr-4 md:pr-8 min-w-[120px] md:min-w-max pt-1 w-32 md:w-48 flex-shrink-0">
               <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                    <MusicIcon className="w-3 h-3 md:w-4 md:h-4" /> Clip Audio
               </label>
               <div className="bg-[#121212] p-3 md:p-4 rounded-lg border border-gray-700 flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500">VOLUME</span>
                        <span className="text-[10px] md:text-xs text-purple-400 font-mono font-bold">{Math.round((segment.audioVolume ?? 1) * 100)}%</span>
                   </div>
                   <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={segment.audioVolume ?? 1}
                        onChange={(e) => onUpdateVolume(segment.id, parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400"
                    />
               </div>
           </div>
    
           {/* Transition Section */}
           <div className="flex flex-col gap-2 md:gap-3 border-r border-white/10 pr-4 md:pr-8 min-w-[120px] md:min-w-max pt-1 w-32 md:w-48 flex-shrink-0">
               <label className="text-[10px] md:text-xs text-gray-400 font-bold uppercase flex items-center gap-2">
                   <TransitionIcon className="w-3 h-3 md:w-4 md:h-4" /> Animation
               </label>
               <div className="flex flex-col gap-1 md:gap-2 bg-[#121212] p-2 rounded-lg border border-gray-700">
                   {['fade', 'slide', 'zoom'].map(t => (
                       <button 
                            key={t}
                            onClick={() => onUpdateTransition(segment.id, t as any)}
                            className={`w-full py-1.5 md:py-2 text-[10px] md:text-xs uppercase rounded transition-all font-medium flex items-center justify-between px-2 md:px-3 ${segment.transition === t ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                       >
                           <span>{t}</span>
                           {segment.transition === t && <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-white"></div>}
                       </button>
                   ))}
               </div>
           </div>
    
           {/* Actions */}
           <div className="ml-auto pl-2 self-center flex-shrink-0">
               <button 
                    onClick={onDelete}
                    className="group flex flex-col items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-red-500/5 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all shadow-sm hover:shadow-red-900/30"
                    title="Delete Segment"
                >
                   <TrashIcon className="w-5 h-5 md:w-6 md:h-6 mb-1 transition-transform group-hover:scale-110" />
                   <span className="text-[8px] md:text-[9px] font-bold tracking-wider opacity-70 group-hover:opacity-100">DEL</span>
               </button>
           </div>
        </div>
      );
  }

  // Fallback if nothing selected
  return (
    <div className="h-20 md:h-40 bg-[#1e1e1e] flex items-center justify-center text-gray-500 text-xs md:text-sm font-medium">
        Select a clip or audio track on the timeline to edit properties
    </div>
  );
};

export default PropertiesPanel;
