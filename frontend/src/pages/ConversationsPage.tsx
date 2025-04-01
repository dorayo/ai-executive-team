import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Conversation } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Plus } from 'lucide-react';
import {
  Box,
  TextField,
  Typography,
  List,
  ListItem,
  Divider,
  Grid,
  Paper,
  IconButton,
  CircularProgress,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { format } from 'date-fns';

const ConversationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [message, setMessage] = useState('');
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

  const fetchConversation = async (id: number) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/conversations/${id}`);
      setSelectedConversation(response.data);
    } catch (error) {
      console.error('获取对话详情失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      setIsCreating(true);
      const response = await api.post('/conversations', {
        title: newTitle || '新对话',
        user_id: user?.id
      });
      setConversations(prev => [response.data, ...prev]);
      setOpenDialog(false);
      setNewTitle('');
    } catch (error) {
      console.error('创建对话失败:', error);
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
    try {
      await api.delete(`/conversations/${id}`);
      setConversations(prev => prev.filter(conv => conv.id !== id));
      if (selectedConversation && selectedConversation.id === id) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('删除对话失败:', error);
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

  // 发送消息
  const sendMessage = async () => {
    if (!message.trim() || !selectedConversation) return;

    try {
      setIsLoading(true);
      const response = await api.post(`/conversations/${selectedConversation.id}/messages`, {
        content: message,
      });
      
      // 更新对话消息
      const updatedMessages = [
        ...(selectedConversation.messages || []),
        response.data.user_message,
        response.data.ai_message,
      ];
      
      setSelectedConversation({
        ...selectedConversation,
        messages: updatedMessages,
      });
      
      setMessage('');
    } catch (error) {
      console.error('发送消息失败', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 消息发送快捷键
  // 删除对话
  const deleteConversation = async (id: number) => {
    try {
      await api.delete(`/conversations/${id}`);
      setConversations(conversations.filter(conv => conv.id !== id));
      if (selectedConversation && selectedConversation.id === id) {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('删除对话失败', error);
    }
  };

  // 初始加载所有对话
  useEffect(() => {
    fetchConversations();
  }, []);

  // 获取当前对话的消息
  useEffect(() => {
    if (selectedConversation && !selectedConversation.messages) {
      fetchConversation(selectedConversation.id);
    }
  }, [selectedConversation]);

  // 消息发送快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 格式化消息时间
  const formatMessageTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm:ss');
    } catch (error) {
      return dateString;
    }
  };

  // 获取头像标识
  const getAvatarLetter = (name?: string, role?: string) => {
    if (role) {
      return role.charAt(0);
    }
    if (name) {
      return name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // 获取头像颜色
  const getAvatarColor = (senderType: string, role?: string) => {
    if (senderType === 'USER') {
      return '#1976d2';
    }
    
    // 基于角色分配颜色
    if (role === 'CEO') return '#d32f2f';
    if (role === 'CFO') return '#388e3c';
    if (role === 'COO') return '#f57c00';
    if (role === 'CMO') return '#7b1fa2';
    if (role === 'LEGAL') return '#0288d1';
    
    return '#757575';
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h4" component="h1">
          对话列表
        </Typography>
        <Button
          onClick={() => handleOpenDialog()}
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
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conversations.map((conversation) => (
              <Card key={conversation.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">{conversation.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {conversation.messages?.[conversation.messages.length - 1]?.content || '暂无消息'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      创建于: {format(new Date(conversation.created_at), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(conversation)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteConversation(conversation.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
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
            disabled={!newTitle.trim() || isCreating}
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