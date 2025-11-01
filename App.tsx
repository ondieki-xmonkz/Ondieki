import React from 'react';
import { ChatInterface } from './components/ChatInterface';
import { BOT_NAME } from './constants';

function App() {
  return (
    <div className="bg-gray-900 text-white h-screen flex flex-col font-sans">
      <header className="bg-gray-800 shadow-md p-4 flex items-center">
        <div className="w-12 h-12 rounded-full bg-blue-700 flex items-center justify-center mr-4">
          <span className="text-2xl">🤖</span>
        </div>
        <div>
          <h1 className="text-xl font-bold">{BOT_NAME}</h1>
          <p className="text-sm text-green-400">● Online</p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4">
        <ChatInterface />
      </main>
    </div>
  );
}

export default App;
