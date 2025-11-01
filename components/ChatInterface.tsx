import React, { useState, useEffect, useRef } from 'react';
import type { Message } from '../types';
import { Chat } from '@google/genai';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { INITIAL_GREETING } from '../constants';
import { createChatSession } from '../services/geminiService';
import { playSpeech, stopSpeech } from '../services/ttsService';

export const ChatInterface: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentlyPlayingId, setCurrentlyPlayingId] = useState<number | null>(null);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Initialize chat session
        chatRef.current = createChatSession();

        // Add initial greeting message
        const initialMessage: Message = {
            id: Date.now(),
            text: INITIAL_GREETING,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages([initialMessage]);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (text: string) => {
        setIsLoading(true);
        const userMessage: Message = {
            id: Date.now(),
            text,
            sender: 'user',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, userMessage]);

        if (chatRef.current) {
            try {
                const stream = await chatRef.current.sendMessageStream({ message: text });

                let botResponse = '';
                const botMessageId = Date.now() + 1;
                
                // Initialize bot message
                const initialBotMessage: Message = {
                    id: botMessageId,
                    text: '...',
                    sender: 'bot',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages(prev => [...prev, initialBotMessage]);

                for await (const chunk of stream) {
                    botResponse += chunk.text;
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === botMessageId ? { ...msg, text: botResponse + '...' } : msg
                        )
                    );
                }
                
                // Finalize bot message
                const finalBotResponse = botResponse.trim();
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === botMessageId ? { ...msg, text: finalBotResponse } : msg
                    )
                );

            } catch (error) {
                console.error("Error sending message:", error);
                const errorMessage: Message = {
                    id: Date.now() + 1,
                    text: 'Sorry, something went wrong. Please try again.',
                    sender: 'bot',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages(prev => [...prev, errorMessage]);
            } finally {
                setIsLoading(false);
            }
        }
    };
    
    const handlePlayAudio = async (messageToPlay: Message) => {
        if (currentlyPlayingId === messageToPlay.id) {
            // User clicked pause on the currently playing message
            stopSpeech(() => {
                setCurrentlyPlayingId(null);
            });
        } else {
            // User clicked play on a new/different message
            // `playSpeech` will handle stopping the previous one immediately
            setCurrentlyPlayingId(messageToPlay.id);
            await playSpeech(messageToPlay.text, () => {
                // This callback is for when speech ends naturally or is force-stopped
                setCurrentlyPlayingId(null);
            });
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <ChatMessage 
                        key={msg.id} 
                        message={msg}
                        isPlaying={currentlyPlayingId === msg.id}
                        onPlayAudio={() => handlePlayAudio(msg)}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-gray-800 border-t border-gray-700">
                 <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
            </div>
        </div>
    );
};