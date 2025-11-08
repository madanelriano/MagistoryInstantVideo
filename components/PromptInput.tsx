
import React, { useState } from 'react';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ onGenerate }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
    }
  };

  const samplePrompts = [
    "The history of the Industrial Revolution",
    "5-minute chocolate cake recipe",
    "Top 5 travel destinations in Southeast Asia",
    "A brief explanation of black holes",
  ];

  return (
    <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
      <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        Create Videos with AI Instantly
      </h2>
      <p className="text-lg text-gray-300 mb-8">
        Just type a topic, and our AI will generate a complete video draft for you—script, stock media, and text overlays included.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., 'How to make a perfect omelette'"
          className="flex-grow p-4 bg-gray-800 border-2 border-gray-700 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!prompt.trim()}
          className="px-8 py-4 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
        >
          Generate Video
        </button>
      </form>
      <div className="mt-8">
        <p className="text-gray-400 mb-2">Or try one of these ideas:</p>
        <div className="flex flex-wrap justify-center gap-2">
            {samplePrompts.map(p => (
                <button 
                    key={p} 
                    onClick={() => setPrompt(p)}
                    className="px-3 py-1 bg-gray-700 text-gray-200 rounded-full text-sm hover:bg-gray-600 transition-colors"
                >
                    {p}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PromptInput;
