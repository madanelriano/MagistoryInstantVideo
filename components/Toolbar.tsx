
import React from 'react';
import type { Segment, TextOverlayStyle, TransitionEffect } from '../types';
import { MediaIcon, TextIcon, MusicIcon, EffectsIcon, MagicWandIcon, TrashIcon, ScissorsIcon, VolumeXIcon, LayersIcon, StyleIcon, BackArrowIcon, TransitionIcon, UndoIcon, RedoIcon } from './icons';

interface ToolbarProps {
    activeMenu: string | null;
    setActiveMenu: (menu: string | null) => void;
    onOpenMediaSearch: () => void;
    onOpenAudioModal: (type: 'music' | 'sfx') => void;
    onOpenAITools: () => void;
    onSplit: () => void;
    onDelete: () => void;
    activeSegment: Segment | null;
    onUpdateVolume: (id: string, vol: number) => void;
    onUpdateText: (id: string, text: string) => void;
    onAutoCaptions: () => void;
    onUpdateStyle: (id: string, style: Partial<TextOverlayStyle>) => void;
    onApplyTransitionToAll: (transition: TransitionEffect | 'random') => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

const ToolButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void; isActive?: boolean; disabled?: boolean }> = ({ icon, label, onClick, isActive, disabled }) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-1 min-w-[64px] h-full transition-colors ${isActive ? 'text-white' : 'text-gray-400'} ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:text-gray-200'}`}
  >
    <div className={`p-1 rounded-full ${isActive ? 'bg-gray-800' : ''}`}>{icon}</div>
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ 
    activeMenu, setActiveMenu, onOpenMediaSearch, onOpenAudioModal, onOpenAITools, 
    onSplit, onDelete, activeSegment, onUpdateVolume, onUpdateText, onAutoCaptions, onUpdateStyle,
    onApplyTransitionToAll, onUndo, onRedo, canUndo, canRedo
}) => {

  // --- SUB-MENUS ---

  // EDIT MENU
  if (activeMenu === 'edit') {
      return (
          <div className="flex items-center h-full px-4 gap-6 overflow-x-auto bg-[#111]">
              <button onClick={() => setActiveMenu(null)} className="mr-2 text-gray-400 hover:text-white"><BackArrowIcon /></button>
              <ToolButton icon={<ScissorsIcon />} label="Split" onClick={onSplit} />
              <ToolButton icon={<TrashIcon />} label="Delete" onClick={onDelete} />
              <div className="w-px h-8 bg-gray-800 mx-2"></div>
              <ToolButton icon={<LayersIcon />} label="Replace" onClick={onOpenMediaSearch} />
              <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Vol</span>
                  <input 
                    type="range" min="0" max="1" step="0.1" 
                    value={activeSegment?.audioVolume ?? 1} 
                    onChange={(e) => activeSegment && onUpdateVolume(activeSegment.id, parseFloat(e.target.value))}
                    className="w-24 h-1 bg-gray-600 rounded-lg accent-white"
                  />
              </div>
          </div>
      )
  }

  // AUDIO MENU
  if (activeMenu === 'audio') {
      return (
          <div className="flex items-center h-full px-4 gap-6 overflow-x-auto bg-[#111]">
              <button onClick={() => setActiveMenu(null)} className="mr-2 text-gray-400 hover:text-white"><BackArrowIcon /></button>
              <ToolButton icon={<MusicIcon />} label="Add Music" onClick={() => onOpenAudioModal('music')} />
              <ToolButton icon={<VolumeXIcon />} label="Sound FX" onClick={() => onOpenAudioModal('sfx')} />
              <ToolButton icon={<MagicWandIcon />} label="AI Voice" onClick={onOpenAITools} />
          </div>
      )
  }

  // TEXT MENU (Still accessed if user explicitly calls it, but removed from Main Menu)
  if (activeMenu === 'text') {
      return (
          <div className="flex items-center h-full px-4 gap-6 overflow-x-auto bg-[#111]">
              <button onClick={() => setActiveMenu(null)} className="mr-2 text-gray-400 hover:text-white"><BackArrowIcon /></button>
              <ToolButton icon={<TextIcon />} label="Add Text" onClick={() => {
                  const text = prompt("Enter Caption:", activeSegment?.narration_text);
                  if (text !== null && activeSegment) onUpdateText(activeSegment.id, text);
              }} />
              <ToolButton icon={<StyleIcon />} label="Auto Captions" onClick={onAutoCaptions} />
              <div className="w-px h-8 bg-gray-800 mx-2"></div>
              {/* Simple Style Toggles */}
              <button onClick={() => activeSegment && onUpdateStyle(activeSegment.id, { color: '#EAB308' })} className="w-6 h-6 rounded-full bg-yellow-500 border border-white/20"></button>
              <button onClick={() => activeSegment && onUpdateStyle(activeSegment.id, { color: '#FFFFFF' })} className="w-6 h-6 rounded-full bg-white border border-white/20"></button>
              <button onClick={() => activeSegment && onUpdateStyle(activeSegment.id, { fontSize: 40 })} className="text-xs text-gray-300 font-bold border border-gray-600 px-2 rounded">Aa</button>
          </div>
      )
  }

  // TRANSITIONS MENU
  if (activeMenu === 'transitions') {
      return (
          <div className="flex items-center h-full px-4 gap-6 overflow-x-auto bg-[#111]">
              <button onClick={() => setActiveMenu(null)} className="mr-2 text-gray-400 hover:text-white"><BackArrowIcon /></button>
              <ToolButton icon={<MagicWandIcon className="text-purple-400" />} label="Randomize" onClick={() => onApplyTransitionToAll('random')} />
              <div className="w-px h-8 bg-gray-800 mx-2"></div>
              <ToolButton icon={<TransitionIcon />} label="Fade All" onClick={() => onApplyTransitionToAll('fade')} />
              <ToolButton icon={<TransitionIcon />} label="Slide All" onClick={() => onApplyTransitionToAll('slide')} />
              <ToolButton icon={<TransitionIcon />} label="Zoom All" onClick={() => onApplyTransitionToAll('zoom')} />
          </div>
      )
  }

  // MAIN MENU (Default)
  return (
    <div className="flex items-center justify-between md:justify-center h-full px-4 gap-2 md:gap-8 overflow-x-auto">
        <div className="flex items-center gap-2 mr-4 border-r border-gray-700 pr-4">
            <ToolButton icon={<UndoIcon />} label="Undo" onClick={onUndo} disabled={!canUndo} />
            <ToolButton icon={<RedoIcon />} label="Redo" onClick={onRedo} disabled={!canRedo} />
        </div>
        
        <ToolButton icon={<ScissorsIcon />} label="Edit" onClick={() => setActiveMenu('edit')} />
        <ToolButton icon={<MusicIcon />} label="Audio" onClick={() => setActiveMenu('audio')} />
        <ToolButton icon={<TransitionIcon />} label="Transitions" onClick={() => setActiveMenu('transitions')} />
        <ToolButton icon={<LayersIcon />} label="Overlay" onClick={onOpenMediaSearch} />
        <ToolButton icon={<MagicWandIcon className="text-purple-400" />} label="AI Tools" onClick={onOpenAITools} />
    </div>
  );
};

export default Toolbar;
