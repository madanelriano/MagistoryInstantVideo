import React from 'react';
import { MediaIcon, TextIcon, MusicIcon, EffectsIcon, ExportIcon, MagicWandIcon } from './icons';

interface ToolbarProps {
    onOpenAITools: () => void;
    onOpenAudioModal: () => void;
}

const ToolButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <button 
    onClick={onClick || (() => alert(`${label} feature coming soon!`))}
    className="flex flex-col items-center gap-2 text-gray-300 hover:text-purple-400 transition-colors w-full p-2 rounded-md hover:bg-gray-700"
    >
    {icon}
    <span className="text-xs">{label}</span>
  </button>
);

const Toolbar: React.FC<ToolbarProps> = ({ onOpenAITools, onOpenAudioModal }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-2 flex lg:flex-col items-center justify-around lg:justify-start lg:gap-4 w-full lg:w-24 flex-shrink-0">
        <ToolButton icon={<MediaIcon />} label="Media" />
        <ToolButton icon={<TextIcon />} label="Text" />
        <ToolButton icon={<MusicIcon />} label="Audio" onClick={onOpenAudioModal} />
        <ToolButton icon={<EffectsIcon />} label="Effects" />
        <ToolButton icon={<MagicWandIcon />} label="AI Tools" onClick={onOpenAITools} />
        <div className="flex-grow"></div>
         <button 
            onClick={() => alert(`Exporting video feature coming soon!`)}
            className="flex items-center justify-center gap-2 text-white bg-purple-600 hover:bg-purple-700 transition-colors w-full p-3 rounded-md mt-auto"
        >
            <ExportIcon />
            <span className="text-sm font-semibold hidden lg:inline">Export</span>
        </button>
    </div>
  );
};

export default Toolbar;