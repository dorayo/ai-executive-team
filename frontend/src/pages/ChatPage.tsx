import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: number;
  content: string;
  sender_type: 'user' | 'ai_ceo' | 'system';
  created_at: string;
}

interface Conversation {
  id: number;
  title: string;
  messages: Message[];
}

const ChatPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Fetch user conversations on component mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await axios.get(`${API_URL}/conversations?user_id=${user?.id}`);
        setConversations(response.data);
        
        // If there are conversations, set the most recent one as current
        if (response.data.length > 0) {
          setCurrentConversation(response.data[0]);
        }
      } catch (error) {
        console.error('Error fetching conversations', error);
      }
    };
    
    if (user) {
      fetchConversations();
    }
  }, [user]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentConversation?.messages]);
  
  // Create a new conversation
  const createNewConversation = async () => {
    try {
      const response = await axios.post(`${API_URL}/conversations`, {
        user_id: user?.id,
        title: 'New Conversation'
      });
      
      const newConversation = response.data;
      setConversations([newConversation, ...conversations]);
      setCurrentConversation(newConversation);
    } catch (error) {
      console.error('Error creating conversation', error);
    }
  };
  
  // Send a message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !currentConversation || isLoading) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Send user message
      const response = await axios.post(`${API_URL}/conversations/${currentConversation.id}/messages`, {
        content: inputMessage,
        sender_type: 'user',
        conversation_id: currentConversation.id
      });
      
      // Update current conversation with the new message
      const updatedConversation = {
        ...currentConversation,
        messages: [...currentConversation.messages, response.data]
      };
      
      setCurrentConversation(updatedConversation);
      setInputMessage('');
      
      // Trigger AI CEO response
      const taskResponse = await axios.post(`${API_URL}/conversations/${currentConversation.id}/task`, {
        task_description: inputMessage,
        conversation_id: currentConversation.id
      });
      
      // Update the conversation again with AI response
      const conversationResponse = await axios.get(`${API_URL}/conversations/${currentConversation.id}`);
      setCurrentConversation(conversationResponse.data);
      
      // Update conversations list
      const conversationsResponse = await axios.get(`${API_URL}/conversations?user_id=${user?.id}`);
      setConversations(conversationsResponse.data);
    } catch (error) {
      console.error('Error sending message', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Conversation header with new chat button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          {currentConversation ? currentConversation.title : 'New Conversation'}
        </h3>
        <button
          onClick={createNewConversation}
          className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
        >
          New Chat
        </button>
      </div>
      
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4 mb-4">
        {currentConversation ? (
          currentConversation.messages.length > 0 ? (
            <div className="space-y-4">
              {currentConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.sender_type === 'user'
                      ? 'bg-primary-100 ml-auto max-w-3xl'
                      : message.sender_type === 'system'
                      ? 'bg-gray-100 max-w-3xl'
                      : 'bg-secondary-100 max-w-3xl'
                  }`}
                >
                  <p className="text-sm font-medium mb-1">
                    {message.sender_type === 'user'
                      ? 'You'
                      : message.sender_type === 'system'
                      ? 'System'
                      : 'AI CEO'}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">
                Start a conversation with your AI CEO
              </p>
            </div>
          )
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">
              Create a new conversation to get started
            </p>
          </div>
        )}
      </div>
      
      {/* Message input area */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={sendMessage} className="flex">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message here..."
            disabled={!currentConversation || isLoading}
            className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={!currentConversation || isLoading}
            className={`px-4 py-2 rounded-r-lg ${
              !currentConversation || isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            }`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage; 