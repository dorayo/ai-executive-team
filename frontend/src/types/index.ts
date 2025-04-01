export interface Message {
  id: number;
  content: string;
  sender_type: 'USER' | 'AI' | 'SYSTEM';
  sender_id?: number;
  sender_name?: string;
  sender_role?: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  title: string;
  messages?: Message[];
  created_at: string;
  updated_at: string;
} 