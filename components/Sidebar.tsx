
import React from 'react';
import { MediaIcon, MusicIcon, TextIcon, MagicWandIcon, EffectsIcon } from './icons';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'media', icon: <MediaIcon />, label: 'Media' },
    { id: 'audio', icon: <MusicIcon />, label: 'Audio' },
    { id: 'text', icon: <TextIcon />, label: 'Text' },
    { id: 'ai', icon: <MagicWandIcon />, label: 'AI Tools' },
  ];

  return (
    <div className="w-16 flex-shrink-0 bg-[#060606] border-r border-gray-800 flex flex-col items-center py-4 gap-2 z-20">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg transition-all duration-200 group ${
            activeTab === tab.id
              ? 'bg-gray-800 text-purple-400'
              : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
          }`}
        >
          <div className="w-6 h-6 mb-1">{tab.icon}</div>
          <span className="text-[9px] font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default Sidebar;
