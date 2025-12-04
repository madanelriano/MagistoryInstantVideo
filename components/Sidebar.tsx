
import React from 'react';
import { MediaIcon, MusicIcon, TextIcon, MagicWandIcon } from './icons';

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
    <div className="w-[60px] flex-shrink-0 bg-[#161616] border-r border-black/50 flex flex-col items-center py-4 gap-4 z-20">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center justify-center w-10 h-10 rounded-md transition-all duration-200 group relative ${
            activeTab === tab.id
              ? 'text-purple-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {activeTab === tab.id && <div className="absolute -left-3 w-1 h-6 bg-purple-500 rounded-r-full"></div>}
          <div className="w-6 h-6">{tab.icon}</div>
          <span className="text-[8px] font-medium mt-1 opacity-0 group-hover:opacity-100 absolute left-12 bg-gray-800 px-2 py-1 rounded text-white whitespace-nowrap z-50 pointer-events-none transition-opacity">
              {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Sidebar;
