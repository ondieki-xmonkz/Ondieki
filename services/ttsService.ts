import { GoogleGenAI, Modality } from "@google/genai";

// Helper functions for audio encoding/decoding as per documentation
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using a singleton AudioContext
const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
const outputNode = outputAudioContext.createGain();
outputNode.connect(outputAudioContext.destination);

let currentSource: AudioBufferSourceNode | null = null;
let playTimeoutId: ReturnType<typeof setTimeout> | null = null;
let stopTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Immediately stops any playing audio and cancels any scheduled play/stop actions.
 * @param onEnd - Optional callback to be executed after stopping.
 */
function immediateStop(onEnd?: () => void) {
    if (playTimeoutId) {
        clearTimeout(playTimeoutId);
        playTimeoutId = null;
    }
    if (stopTimeoutId) {
        clearTimeout(stopTimeoutId);
        stopTimeoutId = null;
    }
    if (currentSource) {
        currentSource.onended = null; // Prevent onEnd from firing on manual stop
        try {
            currentSource.stop();
        } catch (e) {
            // Source might have already been stopped
        }
        currentSource = null;
    }
    if (onEnd) {
        onEnd();
    }
}

/**
 * Requests to stop the currently playing audio after a 2-second delay.
 * @param onStopped - Callback to be executed after the audio has been stopped.
 */
export function stopSpeech(onStopped: () => void) {
    // If a play action is pending, cancel it immediately.
    if (playTimeoutId) {
        clearTimeout(playTimeoutId);
        playTimeoutId = null;
        onStopped();
        return;
    }
    
    // Clear any previously scheduled stop to avoid multiple timers.
    if (stopTimeoutId) {
        clearTimeout(stopTimeoutId);
    }

    // If nothing is playing, we can consider it stopped immediately.
    if (!currentSource) {
        onStopped();
        return;
    }

    // Schedule the stop action.
    stopTimeoutId = setTimeout(() => {
        immediateStop();
        onStopped();
        stopTimeoutId = null;
    }, 2000);
}

/**
 * Fetches and plays audio for the given text after a 2-second delay.
 * Stops any currently playing audio immediately before scheduling the new one.
 * @param text - The text to be converted to speech.
 * @param onEnd - Callback to be executed when the speech finishes naturally or is stopped by an error.
 */
export async function playSpeech(text: string, onEnd: () => void): Promise<void> {
    immediateStop(); // Stop any currently playing/scheduled audio immediately.

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (base64Audio) {
            const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContext,
                24000,
                1,
            );

            if (outputAudioContext.state === 'suspended') {
                await outputAudioContext.resume();
            }
            
            // Schedule playback to start in 2 seconds.
            playTimeoutId = setTimeout(() => {
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                currentSource = source;
                playTimeoutId = null;

                source.onended = () => {
                    // Ensure this onended callback is for the currently active source
                    if (currentSource === source) {
                        currentSource = null;
                        onEnd();
                    }
                };
                
                source.start();
            }, 2000);

        } else {
             onEnd(); // If no audio, still call onEnd to clean up state
        }
    } catch (error) {
        console.error("Error in playSpeech:", error);
        immediateStop(onEnd); // Clean up on error and call onEnd
    }
}