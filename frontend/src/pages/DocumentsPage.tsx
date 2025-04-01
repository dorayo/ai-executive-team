import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface Document {
  id: number;
  title: string;
  description: string | null;
  content_type: string;
  created_at: string;
  processing_status: string;
  processing_error: string | null;
}

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  
  // 上传状态
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // 表单数据
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const auth = useAuth();
  
  // 获取文档列表
  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/documents/');
      setDocuments(response.data);
      setError('');
    } catch (err: any) {
      setError('获取文档列表失败');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 初始加载文档
  useEffect(() => {
    if (auth?.isAuthenticated) {
      fetchDocuments();
    }
  }, [auth?.isAuthenticated]);
  
  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('请选择文件');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      setError('');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      if (description) {
        formData.append('description', description);
      }
      
      await api.post('/documents/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      });
      
      // 重置表单
      setTitle('');
      setDescription('');
      setFile(null);
      setSuccess('文档上传成功！正在处理中...');
      
      // 刷新文档列表
      fetchDocuments();
      
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('文档上传失败');
      }
      console.error(err);
    } finally {
      setUploading(false);
    }
  };
  
  // 删除文档
  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除此文档吗？此操作不可恢复。')) {
      return;
    }
    
    try {
      await api.delete(`/documents/${id}`);
      setSuccess('文档删除成功');
      
      // 从列表中移除已删除的文档
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('删除文档失败');
      }
      console.error(err);
    }
  };
  
  // 处理状态标签颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'text_only':
        return 'bg-purple-100 text-purple-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'processing':
        return '处理中';
      case 'completed':
        return '处理完成';
      case 'text_only':
        return '仅文本';
      case 'partial':
        return '部分完成';
      case 'error':
        return '处理失败';
      default:
        return status;
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">知识库文档管理</h1>
      
      {/* 错误和成功提示 */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {success}
        </div>
      )}
      
      {/* 上传表单 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">上传新文档</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">文档标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">文档描述（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">选择文件</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              支持的文件类型: PDF, TXT, HTML, DOCX
            </p>
          </div>
          
          {uploading && (
            <div className="mt-2">
              <div className="bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-primary-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">上传进度: {uploadProgress}%</p>
            </div>
          )}
          
          <button
            type="submit"
            disabled={uploading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              uploading
                ? 'bg-primary-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
            }`}
          >
            {uploading ? '上传中...' : '上传文档'}
          </button>
        </form>
      </div>
      
      {/* 文档列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">已上传文档</h2>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">加载中...</div>
        ) : documents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            暂无文档，请上传新文档。
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {doc.title}
                    </h3>
                    
                    <div className="mt-1 flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.processing_status)}`}>
                        {getStatusText(doc.processing_status)}
                      </span>
                      
                      <span className="ml-2 text-xs text-gray-500">
                        {new Date(doc.created_at).toLocaleString()}
                      </span>
                      
                      <span className="ml-2 text-xs text-gray-500">
                        {doc.content_type}
                      </span>
                    </div>
                    
                    {doc.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                    
                    {doc.processing_error && (
                      <p className="mt-1 text-sm text-red-500">
                        错误: {doc.processing_error}
                      </p>
                    )}
                  </div>
                  
                  <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage; 