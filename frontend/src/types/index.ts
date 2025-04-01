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

export interface Task {
  id: number;
  conversation_id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  result?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
} 