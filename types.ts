
export type Sender = 'user' | 'bot';

export interface Message {
  id: number;
  text: string;
  sender: Sender;
  timestamp: string;
}
