import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Message, Conversation } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Send, ArrowLeftCircle, Briefcase, Plus, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../contexts/ThemeContext';
import { Textarea } from '../components/ui/textarea';
import '../markdown-styles.css'; // 修复路径

// 消息输入区域
const ChatInput = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  isDisabled,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 在组件挂载后聚焦输入框
  useEffect(() => {
    if (inputRef.current && !isDisabled) {
      inputRef.current.focus();
    }
  }, [isDisabled]);

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        ref={inputRef}
        value={value}
        onChange={onChange}
        placeholder="输入消息..."
        disabled={isDisabled}
        className="flex-1 min-h-[42px] max-h-[200px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors duration-200 resize-none"
        autoHeight
        maxHeight={200}
        onEnterPress={value.trim() ? onSubmit : undefined}
      />
      <Button 
        type="submit" 
        disabled={isDisabled || !value.trim()}
        className="flex-shrink-0 bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white transition-colors duration-200 h-10"
        onClick={onSubmit}
      >
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
  );
};

const ChatPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme(); // 获取当前主题
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 添加流式显示相关状态
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const [displayedContent, setDisplayedContent] = useState('');

  // 添加复制功能相关状态
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);

  // 根据当前主题选择代码高亮样式
  const codeStyle = theme === 'dark' ? vscDarkPlus : vs;

  // 创建initializeChatWithCEO函数的引用以避免依赖循环
  const initializeChatWithCEO = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
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
        setConversation(ceoChat);
      } else {
        // 如果没有找到，则创建一个新的 CEO 对话
        const createResponse = await api.post('/conversations', {
          title: '与 CEO 的对话',
          user_id: user?.id
        });
        ceoChatId = createResponse.data.id;
        setConversation(createResponse.data);
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
      setError('无法加载或创建与 CEO 的对话');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 从 URL 获取对话 ID
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    
    if (id) {
      // 如果 URL 中有 ID，直接加载该对话
      const conversationId = parseInt(id, 10);
      setConversationId(conversationId);
      fetchConversation(conversationId);
    } else {
      // 如果没有 ID，加载最近的对话而不是默认创建新的对话
      loadMostRecentConversation();
    }
  }, [user, navigate, location.search]);

  // 新增：加载最近的对话函数
  const loadMostRecentConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 获取所有对话
      const response = await api.get('/conversations');
      const conversations = response.data;
      
      if (conversations && conversations.length > 0) {
        // 已有对话，加载最近的一个（列表已按更新时间排序）
        const mostRecent = conversations[0];
        setConversationId(mostRecent.id);
        fetchConversation(mostRecent.id);
        
        // 更新URL以反映当前对话ID
        navigate(`/chat?id=${mostRecent.id}`, { replace: true });
      } else {
        // 没有现有对话，创建新对话
        initializeChatWithCEO();
      }
    } catch (error) {
      console.error('加载最近对话失败:', error);
      setError('无法加载最近的对话');
      // 失败时尝试创建新对话
      initializeChatWithCEO();
    } finally {
      setIsLoading(false);
    }
  };

  // 获取指定 ID 的对话
  const fetchConversation = async (id: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/conversations/${id}`);
      setConversation(response.data);
      
      if (response.data.messages) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('获取对话失败:', error);
      setError('无法加载对话，可能已被删除或您没有访问权限');
    } finally {
      setIsLoading(false);
    }
  };

  // 模拟流式生成效果的函数
  const simulateStreaming = (message: Message) => {
    setIsStreaming(true);
    setStreamingMessage(message);
    setDisplayedContent('');
    
    let index = 0;
    const fullContent = message.content;
    let lastScrollTime = Date.now();
    
    // 创建一个更自然的打字函数
    const typeNextChar = () => {
      if (index < fullContent.length) {
        // 获取下一个字符
        const currentChar = fullContent.charAt(index);
        
        // 根据不同情况选择添加的字符数量
        let charsToAdd = 1;
        
        // 如果当前是空格且不是句子开始，加快速度，可能多添加几个字符
        if (currentChar === ' ' && index > 0) {
          charsToAdd = Math.min(5, Math.max(1, Math.floor(Math.random() * 3)));
        } 
        // 对于普通文本，随机决定添加的字符数
        else {
          charsToAdd = Math.random() < 0.7 ? 1 : 2; // 70%概率添加1个字符，30%概率添加2个
        }
        
        // 特殊处理标点符号
        if (",.!?;:".includes(currentChar)) {
          // 标点符号后添加更长的停顿
          charsToAdd = 1;
        }
        
        const nextChars = fullContent.substring(index, index + charsToAdd);
        setDisplayedContent(prev => prev + nextChars);
        index += charsToAdd;
        
        // 定期滚动，避免频繁滚动导致的性能问题
        const now = Date.now();
        if (now - lastScrollTime > 100) { // 每100ms滚动一次
          scrollToBottom();
          lastScrollTime = now;
        }
        
        // 计算下一个字符的延迟
        let delay = 30; // 基础延迟
        
        // 标点符号后添加更长的停顿
        if (",.!?;:".includes(currentChar)) {
          delay = currentChar === '.' || currentChar === '!' || currentChar === '?' ? 
            Math.random() * 200 + 100 : // 句号、感叹号、问号后停顿较长
            Math.random() * 100 + 50;   // 其他标点停顿适中
        } else {
          // 普通字符的随机延迟
          delay = Math.floor(Math.random() * 20) + 10; // 10-30ms之间的随机延迟
        }
        
        setTimeout(typeNextChar, delay);
      } else {
        // 显示完毕，更新状态
        setTimeout(() => {
          // 完成后更新消息列表，将完整消息添加到列表中
          setMessages(prev => {
            // 找出不包括streamingMessage的消息
            const filteredMessages = prev.filter(m => m.id !== message.id);
            return [...filteredMessages, message];
          });
          
          setIsStreaming(false);
          setStreamingMessage(null);
          setDisplayedContent('');
          
          // 最终滚动到底部
          setTimeout(scrollToBottom, 50);
        }, 100);
      }
    };
    
    // 开始打字效果，添加短暂延迟使效果更真实
    setTimeout(typeNextChar, 300);
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
      
      // 获取响应
      if (response.data.user_message && response.data.ai_message) {
        // 先添加用户消息
        setMessages(prev => [...prev, response.data.user_message]);
        
        // 使用流式效果显示AI回复
        setTimeout(() => {
          simulateStreaming(response.data.ai_message);
        }, 500); // 延迟500ms后开始显示AI回复，更真实
        
        // 发送消息后确保立即滚动到底部
        setTimeout(scrollToBottom, 100);
      }
      
    } catch (error) {
      console.error('发送消息失败:', error);
      setError('发送消息失败，请重试');
    } finally {
      setIsLoading(false);
      // 消息发送完成后重新聚焦到输入框
      inputRef.current?.focus();
    }
  };

  const navigateToConversations = () => {
    navigate('/conversations');
  };

  const navigateToTasks = () => {
    if (conversationId) {
      navigate(`/tasks?conversation_id=${conversationId}`);
    }
  };

  const handleCreateNewConversation = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 创建新对话
      const response = await api.post('/conversations', {
        title: '新对话',
        user_id: user?.id
      });
      
      // 导航到新创建的对话页面
      navigate(`/chat?id=${response.data.id}`);
    } catch (error) {
      console.error('创建对话失败:', error);
      setError('无法创建新对话，请重试');
      setIsLoading(false);
    }
  };

  // 自动滚动到最新消息
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  // 添加输入框引用
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 页面首次加载和消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 当对话加载完成时自动聚焦到输入框
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, conversationId]);

  // 复制消息内容到剪贴板
  const copyToClipboard = (text: string, messageId: number) => {
    navigator.clipboard.writeText(text).then(
      () => {
        // 复制成功，显示成功图标
        setCopiedMessageId(messageId);
        
        // 1.5秒后恢复为复制图标
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 1500);
      },
      (err) => {
        console.error('无法复制内容: ', err);
      }
    );
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-shrink-0 bg-white dark:bg-gray-800 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={navigateToConversations}
            title="返回对话列表"
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeftCircle className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {conversation?.title || '加载中...'}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleCreateNewConversation}
            className="flex items-center gap-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title="新建对话"
          >
            <Plus className="h-4 w-4" />
            <span>新对话</span>
          </Button>
          
          {conversationId && (
            <Button
              variant="outline"
              onClick={navigateToTasks}
              className="flex items-center gap-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
              title="查看任务"
            >
              <Briefcase className="h-4 w-4" />
              <span>任务</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 flex-shrink-0 transition-colors duration-300">
          {error}
        </div>
      )}
      
      {/* 聊天区域 */}
      <ScrollArea className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="space-y-4 pb-6">
          {messages.length === 0 && !isStreaming && !isLoading && (
            <div className="text-center p-6 text-gray-500 dark:text-gray-400">
              开始你的对话吧
            </div>
          )}
          
          {/* 显示已完成的消息 */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === 'USER' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 shadow-sm ${
                  message.sender_type === 'USER'
                    ? 'bg-blue-500 text-white dark:bg-blue-600' // 用户消息使用蓝色背景
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700' // AI消息使用白色/深灰背景
                } transition-colors duration-200`}
              >
                {message.sender_type === 'AI' && message.sender_name && (
                  <div className="font-bold mb-1 text-blue-600 dark:text-blue-400">
                    {message.sender_name}
                    {message.sender_role && ` (${message.sender_role})`}
                  </div>
                )}
                {message.sender_type === 'USER' ? (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="markdown-content text-sm">
                    <ReactMarkdown
                      components={{
                        // 使用 SyntaxHighlighter 进行代码高亮
                        code: ({node, inline, className, children, ...props}) => {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              // @ts-ignore - 使用类型断言解决类型错误问题
                              style={codeStyle}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs opacity-70">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                  <button 
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="text-xs opacity-70 hover:opacity-100 transition-opacity"
                    title="复制内容"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* 显示正在流式生成的消息 */}
          {isStreaming && streamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[70%] rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
                {streamingMessage.sender_name && (
                  <div className="font-bold mb-1 text-blue-600 dark:text-blue-400">
                    {streamingMessage.sender_name}
                    {streamingMessage.sender_role && ` (${streamingMessage.sender_role})`}
                  </div>
                )}
                <div className="markdown-content text-sm">
                  <ReactMarkdown
                    components={{
                      // 使用 SyntaxHighlighter 进行代码高亮
                      code: ({node, inline, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            // @ts-ignore - 使用类型断言解决类型错误问题
                            style={codeStyle}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {displayedContent}
                  </ReactMarkdown>
                  <span className="inline-block h-4 w-[1px] ml-[1px] bg-gray-500 animate-pulse"></span>
                </div>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(streamingMessage.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )}
          
          {isLoading && !isStreaming && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500 dark:text-gray-400" />
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* 消息输入区域 */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSubmitMessage(e); }} 
        className="p-4 border-t dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm transition-colors duration-300"
      >
        <ChatInput 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onSubmit={() => handleSubmitMessage({ preventDefault: () => {} } as React.FormEvent)}
          isLoading={isLoading}
          isDisabled={isLoading || error !== null}
        />
      </form>
    </div>
  );
};

export default ChatPage; 