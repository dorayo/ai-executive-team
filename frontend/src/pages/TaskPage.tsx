import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Task, Conversation } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Loader2, 
  Plus, 
  ArrowLeftCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import TextField from '@mui/material/TextField';

const TaskPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 从 URL 获取对话 ID
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('conversation_id');
    
    if (id) {
      // 如果 URL 中有对话 ID，加载该对话的任务
      const conversationId = parseInt(id, 10);
      fetchConversation(conversationId);
      fetchTasks(conversationId);
    } else {
      // 如果没有对话 ID，重定向到对话列表
      navigate('/conversations');
    }
  }, [user, navigate, location.search]);

  // 获取指定 ID 的对话
  const fetchConversation = async (id: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/conversations/${id}`);
      setConversation(response.data);
    } catch (error) {
      console.error('获取对话失败:', error);
      setError('无法加载对话信息');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取对话相关的任务
  const fetchTasks = async (conversationId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/conversations/${conversationId}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('获取任务列表失败:', error);
      setError('无法加载任务列表');
    } finally {
      setIsLoading(false);
    }
  };

  // 创建新任务
  const handleCreateTask = async () => {
    if (!conversation) return;
    
    try {
      setIsCreating(true);
      setError(null);
      
      const response = await api.post(`/conversations/${conversation.id}/task`, {
        title: newTaskTitle,
        description: newTaskDescription
      });
      
      setTasks(prev => [response.data, ...prev]);
      setOpenDialog(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
    } catch (error) {
      console.error('创建任务失败:', error);
      setError('创建任务失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  // 获取任务状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'PENDING':
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  // 获取任务状态文字
  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '已完成';
      case 'FAILED':
        return '失败';
      case 'IN_PROGRESS':
        return '进行中';
      case 'PENDING':
      default:
        return '待处理';
    }
  };

  const navigateToConversation = () => {
    if (conversation) {
      navigate(`/chat?id=${conversation.id}`);
    } else {
      navigate('/conversations');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={navigateToConversation}
            title="返回对话"
          >
            <ArrowLeftCircle className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {conversation ? `"${conversation.title}" 的任务` : '任务列表'}
          </h1>
        </div>
        
        <Button
          onClick={() => setOpenDialog(true)}
          disabled={isCreating || !conversation}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              创建中...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              新任务
            </>
          )}
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">暂无任务</p>
          <Button onClick={() => setOpenDialog(true)} disabled={!conversation}>
            <Plus className="mr-2 h-4 w-4" />
            创建第一个任务
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-semibold">{task.title}</h3>
                      <span className="text-sm px-2 py-1 rounded-full bg-muted">
                        {getStatusText(task.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{task.description}</p>
                    
                    {task.result && (
                      <div className="mt-4 p-3 bg-muted rounded">
                        <p className="text-sm font-semibold mb-1">执行结果:</p>
                        <p className="text-sm">{task.result}</p>
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-muted-foreground">
                      创建于: {new Date(task.created_at).toLocaleString()}
                      {task.updated_at !== task.created_at && (
                        <> | 更新于: {new Date(task.updated_at).toLocaleString()}</>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* 创建任务对话框 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>创建新任务</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="任务标题"
            fullWidth
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <TextField
            margin="dense"
            label="任务描述"
            fullWidth
            multiline
            rows={4}
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
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
            onClick={handleCreateTask}
            disabled={!newTaskTitle.trim() || !newTaskDescription.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                创建中...
              </>
            ) : (
              '创建'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default TaskPage; 