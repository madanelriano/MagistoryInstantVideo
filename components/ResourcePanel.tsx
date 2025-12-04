
import React, { useState, useEffect } from 'react';
import { searchPixabayImages, searchPixabayVideos, searchPixabayAudio } from '../services/pixabayService';
import { MagicWandIcon, PlayIcon, MusicIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

interface ResourcePanelProps {
  activeTab: string;
  onSelectMedia: (url: string, type: 'image' | 'video') => void;
  onSelectAudio: (url: string, name: string) => void;
  onAddText: (text: string) => void;
  onOpenAITools: () => void;
}

const ResourcePanel: React.FC<ResourcePanelProps> = ({ 
  activeTab, onSelectMedia, onSelectAudio, onAddText, onOpenAITools 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaType, setMediaType] = useState<'all' | 'photo' | 'video'>('all');

  // Auto-search on tab change for defaults
  useEffect(() => {
    setResults([]);
    setQuery('');
    if (activeTab === 'media') handleSearch('business'); // Default content
    if (activeTab === 'audio') handleSearch('cinematic'); // Default content
  }, [activeTab]);

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query;
    if (!q) return;
    setIsLoading(true);
    setResults([]);

    try {
      if (activeTab === 'media') {
        const [photos, videos] = await Promise.all([
           searchPixabayImages(q),
           searchPixabayVideos(q)
        ]);
        // Interleave
        const combined = [];
        const max = Math.max(photos.length, videos.length);
        for(let i=0; i<max; i++) {
           if(photos[i]) combined.push({...photos[i], type: 'image'});
           if(videos[i]) combined.push({...videos[i], type: 'video'});
        }
        setResults(combined);
      } else if (activeTab === 'audio') {
        const audio = await searchPixabayAudio(q);
        setResults(audio);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  if (activeTab === 'text') {
    return (
      <div className="w-80 bg-[#121212] border-r border-gray-800 flex flex-col h-full animate-fade-in">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-bold text-white mb-1">Text presets</h3>
          <p className="text-xs text-gray-400">Click to add to selected clip</p>
        </div>
        <div className="p-4 grid gap-3 overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => onAddText("Add your text")}
              className="h-16 bg-gray-800 border border-gray-700 hover:border-purple-500 rounded flex items-center justify-center text-white font-sans font-bold text-lg"
            >
              Default Text
            </button>
            <button 
              onClick={() => onAddText("TITLE")}
              className="h-24 bg-gray-800 border border-gray-700 hover:border-purple-500 rounded flex items-center justify-center text-white font-serif font-black text-3xl"
            >
              TITLE
            </button>
            <button 
              onClick={() => onAddText("Subtitle")}
              className="h-12 bg-gray-800 border border-gray-700 hover:border-purple-500 rounded flex items-center justify-center text-yellow-400 font-mono font-medium"
            >
              Subtitle
            </button>
        </div>
      </div>
    );
  }

  if (activeTab === 'ai') {
      return (
        <div className="w-80 bg-[#121212] border-r border-gray-800 flex flex-col h-full animate-fade-in">
            <div className="p-4 border-b border-gray-800">
                <h3 className="font-bold text-white">AI Tools</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
                <button 
                    onClick={onOpenAITools}
                    className="p-4 bg-gradient-to-br from-purple-900 to-gray-800 border border-purple-500/30 rounded-xl hover:shadow-lg hover:shadow-purple-900/20 transition-all text-left group"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <MagicWandIcon className="text-purple-400" />
                        <span className="font-bold text-white">AI Generator</span>
                    </div>
                    <p className="text-xs text-gray-400 group-hover:text-gray-300">Generate images, videos, and speech using Gemini & Veo.</p>
                </button>
                
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-800">
                    <p className="text-xs text-gray-500 text-center">More tools coming soon</p>
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="w-80 bg-[#121212] border-r border-gray-800 flex flex-col h-full animate-fade-in">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-800 flex flex-col gap-3">
        <h3 className="font-bold text-white capitalize">{activeTab} Library</h3>
        <div className="relative">
          <input
            type="text"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500"
            placeholder={`Search ${activeTab}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            onClick={() => handleSearch()}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isLoading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : (
          <>
            {activeTab === 'media' && (
              <div className="grid grid-cols-2 gap-2">
                {results.map((item, i) => (
                  <div 
                    key={i} 
                    className="aspect-square bg-gray-800 rounded overflow-hidden relative group cursor-pointer border border-transparent hover:border-purple-500"
                    onClick={() => onSelectMedia(item.type === 'video' ? item.video_files[0].link : item.src.medium, item.type)}
                  >
                    {item.type === 'video' ? (
                       <>
                         <img src={item.image} className="w-full h-full object-cover" />
                         <div className="absolute top-1 right-1 bg-black/60 rounded px-1 text-[8px] font-bold">VIDEO</div>
                       </>
                    ) : (
                       <img src={item.src.medium} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-2xl font-bold text-white">+</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="flex flex-col gap-2">
                {results.map((item, i) => (
                  <div 
                    key={i} 
                    className="bg-gray-800 p-3 rounded flex items-center justify-between group hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-purple-500">
                            <MusicIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm text-white truncate font-medium">{item.name}</p>
                            <p className="text-[10px] text-gray-400">{Math.floor(item.duration/60)}:{(item.duration%60).toString().padStart(2,'0')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-white/10 rounded-full" onClick={() => new Audio(item.url).play()}>
                           <PlayIcon className="w-3 h-3" />
                        </button>
                        <button 
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-2 py-1 rounded"
                            onClick={() => onSelectAudio(item.url, item.name)}
                        >
                            Add
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResourcePanel;
