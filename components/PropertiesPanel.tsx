
import React from 'react';
import type { Segment, TextOverlayStyle, TransitionEffect } from '../types';
import { VolumeXIcon, TextIcon, TransitionIcon, TrashIcon } from './icons';

interface PropertiesPanelProps {
  segment: Segment | null;
  onUpdateVolume: (id: string, vol: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateStyle: (id: string, style: Partial<TextOverlayStyle>) => void;
  onUpdateTransition: (id: string, transition: TransitionEffect) => void;
  onDelete: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  segment, onUpdateVolume, onUpdateText, onUpdateStyle, onUpdateTransition, onDelete
}) => {
  
  if (!segment) {
    return (
      <div className="w-72 bg-[#121212] border-l border-gray-800 flex flex-col items-center justify-center h-full text-center p-6">
        <p className="text-gray-500 text-sm">Select a clip to edit properties</p>
      </div>
    );
  }

  const activeTabClass = "text-purple-400 border-b-2 border-purple-400 pb-2 font-medium";
  const inactiveTabClass = "text-gray-400 pb-2 hover:text-white transition-colors cursor-pointer";

  return (
    <div className="w-80 bg-[#121212] border-l border-gray-800 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="p-4 border-b border-gray-800">
        <h3 className="font-bold text-white text-sm uppercase tracking-wide">Properties</h3>
      </div>

      {/* Video / Audio Section */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-4">
            <VolumeXIcon className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-200">Volume</h4>
        </div>
        <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={segment.audioVolume ?? 1}
            onChange={(e) => onUpdateVolume(segment.id, parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
        <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0%</span>
            <span>{Math.round((segment.audioVolume ?? 1) * 100)}%</span>
            <span>100%</span>
        </div>
      </div>

      {/* Animation / Transition */}
      <div className="p-4 border-b border-gray-800">
         <div className="flex items-center gap-2 mb-4">
            <TransitionIcon className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-200">Animation</h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
            {['fade', 'slide', 'zoom'].map((t) => (
                <button
                    key={t}
                    onClick={() => onUpdateTransition(segment.id, t as TransitionEffect)}
                    className={`py-2 text-xs rounded border capitalize transition-all ${segment.transition === t ? 'bg-purple-900/30 border-purple-500 text-white' : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700'}`}
                >
                    {t}
                </button>
            ))}
        </div>
      </div>

      {/* Text Section */}
      <div className="p-4 border-b border-gray-800">
         <div className="flex items-center gap-2 mb-4">
            <TextIcon className="w-4 h-4 text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-200">Text & Caption</h4>
        </div>
        
        <label className="text-xs text-gray-500 mb-1 block">Content</label>
        <textarea
            value={segment.narration_text || ''}
            onChange={(e) => onUpdateText(segment.id, e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white focus:border-purple-500 outline-none mb-4 resize-none h-24"
            placeholder="Enter narration text..."
        />

        <label className="text-xs text-gray-500 mb-1 block">Position</label>
        <div className="flex gap-2 mb-4 bg-gray-800 p-1 rounded">
             {['top', 'center', 'bottom'].map(pos => (
                 <button 
                    key={pos}
                    onClick={() => onUpdateStyle(segment.id, { position: pos as any })}
                    className={`flex-1 text-xs py-1 rounded capitalize ${segment.textOverlayStyle?.position === pos ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                 >
                     {pos}
                 </button>
             ))}
        </div>

        <label className="text-xs text-gray-500 mb-1 block">Style</label>
        <div className="flex gap-2 items-center">
            <input 
                type="color" 
                value={segment.textOverlayStyle?.color || '#ffffff'}
                onChange={(e) => onUpdateStyle(segment.id, { color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
            />
            <input 
                type="number" 
                value={segment.textOverlayStyle?.fontSize || 30}
                onChange={(e) => onUpdateStyle(segment.id, { fontSize: parseInt(e.target.value) })}
                className="w-16 bg-gray-800 border border-gray-700 rounded p-1 text-white text-sm"
                title="Font Size"
            />
            <span className="text-xs text-gray-500">px</span>
        </div>
      </div>

      <div className="p-4 mt-auto">
        <button 
            onClick={onDelete}
            className="w-full py-2 bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-400 rounded text-sm flex items-center justify-center gap-2 transition-colors"
        >
            <TrashIcon className="w-4 h-4" /> Delete Segment
        </button>
      </div>

    </div>
  );
};

export default PropertiesPanel;
