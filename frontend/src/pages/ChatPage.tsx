import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Message } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Send } from 'lucide-react';

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);

  // 初始化聊天，创建一个与 CEO 的对话
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    // 创建或获取与 CEO 的对话
    initializeChatWithCEO();
  }, [user, navigate]);

  const initializeChatWithCEO = async () => {
    try {
      setIsLoading(true);
      
      // 首先查找是否已经有与 CEO 的对话
      const response = await api.get('/conversations');
      const conversations = response.data;
      
      let ceoChatId = null;
      
      // 查找标题中包含 "CEO" 的对话
      const ceoChat = conversations.find((conv: any) => 
        conv.title.includes('CEO') || conv.title.includes('首席执行官')
      );
      
      if (ceoChat) {
        // 如果找到了 CEO 的对话，直接使用
        ceoChatId = ceoChat.id;
      } else {
        // 如果没有找到，则创建一个新的 CEO 对话
        const createResponse = await api.post('/conversations', {
          title: '与 CEO 的对话',
          user_id: user?.id
        });
        ceoChatId = createResponse.data.id;
      }
      
      // 设置当前的对话 ID
      setConversationId(ceoChatId);
      
      // 获取对话历史
      if (ceoChatId) {
        const messageResponse = await api.get(`/conversations/${ceoChatId}`);
        if (messageResponse.data.messages) {
          setMessages(messageResponse.data.messages);
        }
      }
    } catch (error) {
      console.error('初始化与 CEO 对话失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || isLoading) return;

    try {
      setIsLoading(true);
      setNewMessage('');

      // 发送用户消息
      const response = await api.post(`/conversations/${conversationId}/messages`, {
        content: newMessage
      });
      
      // 更新消息列表
      if (response.data.user_message && response.data.ai_message) {
        setMessages(prev => [
          ...prev, 
          response.data.user_message, 
          response.data.ai_message
        ]);
      }
      
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">与 CEO 的对话</h1>
      </div>
      
      {/* 聊天区域 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === 'USER' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  message.sender_type === 'USER'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.sender_type === 'AI' && message.sender_name && (
                  <div className="font-bold mb-1">
                    {message.sender_name}
                    {message.sender_role && ` (${message.sender_role})`}
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 消息输入区域 */}
      <form onSubmit={handleSubmitMessage} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="输入消息..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !newMessage.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                发送中...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                发送
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatPage; 