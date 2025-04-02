import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Conversation } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Plus, Pencil, Trash2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import TextField from '@mui/material/TextField';

const ConversationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchConversations();
  }, [user, navigate]);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('获取对话列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      setIsCreating(true);
      const response = await api.post('/conversations', {
        title: newTitle.trim() || '新对话',
        user_id: user?.id
      });
      setConversations(prev => [response.data, ...prev]);
      setOpenDialog(false);
      setNewTitle('');
      
      // 创建后立即导航到聊天页面
      navigate(`/chat?id=${response.data.id}`);
    } catch (error) {
      console.error('创建对话失败:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateConversationDirect = async () => {
    try {
      setIsCreating(true);
      const response = await api.post('/conversations', {
        title: '新对话',
        user_id: user?.id
      });
      setConversations(prev => [response.data, ...prev]);
      
      // 创建后立即导航到聊天页面
      navigate(`/chat?id=${response.data.id}`);
    } catch (error) {
      console.error('创建对话失败:', error);
      alert('创建对话失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditConversation = async () => {
    if (!editingConversation) return;

    try {
      await api.put(`/conversations/${editingConversation.id}`, {
        title: newTitle
      });
      setConversations(prev =>
        prev.map(conv =>
          conv.id === editingConversation.id
            ? { ...conv, title: newTitle }
            : conv
        )
      );
      setOpenDialog(false);
      setEditingConversation(null);
      setNewTitle('');
    } catch (error) {
      console.error('更新对话失败:', error);
    }
  };

  const handleDeleteConversation = async (id: number) => {
    if (window.confirm('警告：删除对话将永久移除所有相关消息记录，且无法恢复。\n\n您确定要删除这个对话吗？')) {
      try {
        await api.delete(`/conversations/${id}`);
        setConversations(prev => prev.filter(conv => conv.id !== id));
      } catch (error) {
        console.error('删除对话失败:', error);
        alert('删除对话失败，请重试');
      }
    }
  };

  const handleOpenDialog = (conversation?: Conversation) => {
    if (conversation) {
      setEditingConversation(conversation);
      setNewTitle(conversation.title);
    } else {
      setEditingConversation(null);
      setNewTitle('');
    }
    setOpenDialog(true);
  };

  const navigateToChat = (conversationId: number) => {
    navigate(`/chat?id=${conversationId}`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">对话历史</h1>
        <Button
          onClick={handleCreateConversationDirect}
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              创建中...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              新对话
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">暂无对话记录</p>
          <Button onClick={handleCreateConversationDirect}>
            <Plus className="mr-2 h-4 w-4" />
            创建第一个对话
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.map((conversation) => (
              <Card key={conversation.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold truncate" title={conversation.title}>
                      {conversation.title}
                    </h3>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenDialog(conversation)}
                        title="编辑对话"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteConversation(conversation.id)}
                        title="删除对话"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 flex-grow line-clamp-2">
                    {conversation.messages?.[conversation.messages.length - 1]?.content || '暂无消息'}
                  </p>
                  
                  <div className="flex justify-between items-center mt-auto pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(conversation.created_at), 'yyyy-MM-dd HH:mm')}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigateToChat(conversation.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      继续对话
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editingConversation ? '编辑对话' : '创建新对话'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="标题"
            fullWidth
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="outline"
            onClick={() => setOpenDialog(false)}
          >
            取消
          </Button>
          <Button
            onClick={editingConversation ? handleEditConversation : handleCreateConversation}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              editingConversation ? '保存' : '创建'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ConversationsPage; 