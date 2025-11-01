import React from 'react';
import type { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  isPlaying: boolean;
  onPlayAudio: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isPlaying, onPlayAudio }) => {
  const isUser = message.sender === 'user';
  
  const bubbleClasses = isUser 
    ? 'bg-blue-800 self-end'
    : 'bg-gray-700 self-start';
  
  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  return (
    <div className={`flex ${containerClasses}`}>
      <div className={`relative max-w-sm md:max-w-md lg:max-w-lg rounded-lg px-3 py-2 shadow ${bubbleClasses}`}>
        {!isUser && (
          <button
            onClick={onPlayAudio}
            className="absolute top-1 right-1 p-1 rounded-full bg-black bg-opacity-20 hover:bg-opacity-40 text-white transition-all focus:outline-none"
            aria-label={isPlaying ? 'Pause speech' : 'Play speech'}
          >
            {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1zm6 0a1 1 0 00-1 1v2a1 1 0 102 0V9a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
            )}
          </button>
        )}
        <p className={`text-sm text-gray-100 whitespace-pre-wrap ${!isUser ? 'pr-6' : ''}`}>{message.text}</p>
        <span className="text-[10px] text-gray-400 float-right ml-2 mt-1">{message.timestamp}</span>
      </div>
    </div>
  );
};