import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput } from '../components/ui/search-input';
import { SearchResult, SearchResultItem } from '../components/ui/search-result';
import { useAuth } from '../contexts/AuthContext';
import { 
  getDocuments, 
  uploadDocument, 
  deleteDocument, 
  searchDocuments, 
  vectorSearchDocuments, 
  getVectorStoreStatus,
  retryProcessDocument,
  Document,
  VectorStoreStatus
} from '../services/documentService';

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  // 文档列表状态
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

  // 搜索相关状态
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'keyword' | 'vector'>('keyword');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // 向量存储状态
  const [vectorStoreStatus, setVectorStoreStatus] = useState<VectorStoreStatus | null>(null);
  
  // 获取文档列表
  const fetchDocuments = async (query?: string) => {
    try {
      setIsLoading(true);
      setError(null); // 清除之前的错误信息
      console.log('获取文档列表开始，查询参数:', query);
      
      const docs = await getDocuments(query);
      console.log('文档列表获取成功，共获取:', docs.length, '项');
      setDocuments(docs || []);
      
    } catch (err: any) {
      console.error('获取文档列表失败:', err);
      
      // 提供更详细的错误信息
      let errorMessage = '获取文档列表失败';
      
      if (err.response) {
        // 请求已发出，服务器返回了错误状态码
        errorMessage += ` (${err.response.status})`;
        
        if (err.response.data && err.response.data.detail) {
          errorMessage += `: ${err.response.data.detail}`;
        }
        
        // 如果是认证问题
        if (err.response.status === 401) {
          errorMessage = '认证失败，请重新登录';
        }
      } else if (err.request) {
        // 请求已发出，但没有收到响应
        errorMessage = '服务器未响应，请检查网络连接';
      } else {
        // 发送请求时出错
        errorMessage = `请求错误: ${err.message}`;
      }
      
      setError(errorMessage);
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 初始加载
  useEffect(() => {
    if (auth?.isAuthenticated) {
      fetchDocuments();
      loadVectorStoreStatus();
    }
  }, [auth?.isAuthenticated]);
  
  // 加载向量存储状态
  const loadVectorStoreStatus = async () => {
    try {
      const status = await getVectorStoreStatus();
      setVectorStoreStatus(status);
    } catch (err) {
      console.error('获取向量存储状态失败：', err);
      setVectorStoreStatus({
        status: 'error',
        error: '无法连接到向量存储'
      });
    }
  };
  
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
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      if (description) {
        formData.append('description', description);
      }
      
      await uploadDocument(formData);
      
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
      await deleteDocument(id);
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

  // 重试文档处理
  const handleRetry = async (id: number) => {
    try {
      setIsLoading(true);
      await retryProcessDocument(id);
      setSuccess('已重新提交文档处理请求');
      
      // 刷新文档列表
      fetchDocuments();
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('重试处理文档失败');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理搜索
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('请输入搜索内容');
      return;
    }
    
    // 如果是简单关键词过滤，直接过滤文档列表
    if (!searchMode) {
      fetchDocuments(searchQuery);
      return;
    }
    
    // 高级搜索（向量或关键词）
    try {
      setIsSearching(true);
      setSearchError(null);
      
      let results: SearchResultItem[];
      
      if (searchType === 'keyword') {
        results = await searchDocuments({ query: searchQuery, top_k: 10 });
      } else {
        // 检查向量存储状态
        if (!vectorStoreStatus || vectorStoreStatus.status !== 'ok') {
          setSearchError('向量搜索功能不可用，请选择关键词搜索或联系管理员');
          setIsSearching(false);
          setSearchResults([]);
          return;
        }
        results = await vectorSearchDocuments({ query: searchQuery, top_k: 10 });
      }
      
      setSearchResults(results || []);
    } catch (err: any) {
      console.error('搜索失败：', err);
      setSearchError(err.response?.data?.detail || '搜索失败，请稍后再试');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  // 查看文档详情
  const handleViewDocument = (documentId: number) => {
    navigate(`/documents/${documentId}`);
  };
  
  // 切换搜索模式
  const toggleSearchMode = () => {
    setSearchMode(!searchMode);
    if (!searchMode) {
      setSearchResults([]);
    } else {
      fetchDocuments();
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
      case 'failed':
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
      case 'failed':
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
      
      {/* 搜索框 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">文档搜索</h2>
          <button 
            onClick={toggleSearchMode}
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            {searchMode ? '切换到简单搜索' : '切换到高级搜索'}
          </button>
        </div>
        
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder={searchMode ? "搜索文档内容..." : "过滤文档标题和描述..."}
          isLoading={isSearching || isLoading}
          searchType={searchType}
          onSearchTypeChange={searchMode ? setSearchType : undefined}
        />
        
        {searchMode && vectorStoreStatus && vectorStoreStatus.status === 'ok' && vectorStoreStatus.index_stats && (
          <p className="mt-2 text-xs text-gray-500">
            向量库中有 {vectorStoreStatus.index_stats.vector_count} 条记录可供搜索
          </p>
        )}
      </div>
      
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
      
      {/* 搜索结果或文档列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {searchMode && searchResults && searchResults.length > 0 ? '搜索结果' : '已上传文档'}
          </h2>
        </div>
        
        {isLoading && !searchMode ? (
          <div className="p-6 text-center text-gray-500">加载中...</div>
        ) : searchMode && searchResults && searchResults.length > 0 ? (
          <div className="p-6">
            <SearchResult
              results={searchResults}
              isLoading={isSearching}
              error={searchError}
              onViewDocument={handleViewDocument}
            />
          </div>
        ) : documents && documents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            暂无文档，请上传新文档。
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {documents && documents.map((doc) => (
              <li key={doc.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {doc.title}
                    </h3>
                    
                    <div className="mt-1 flex items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {getStatusText(doc.status)}
                      </span>
                      
                      <span className="ml-2 text-xs text-gray-500">
                        {new Date(doc.created_at).toLocaleString()}
                      </span>
                      
                      <span className="ml-2 text-xs text-gray-500">
                        {doc.file_type}
                      </span>
                    </div>
                    
                    {doc.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                    
                    {doc.error_message && (
                      <p className="mt-1 text-sm text-red-500">
                        错误: {doc.error_message}
                      </p>
                    )}
                  </div>
                  
                  <div className="ml-4 flex-shrink-0 flex items-center space-x-3">
                    <button
                      onClick={() => handleViewDocument(doc.id)}
                      className="text-primary-600 hover:text-primary-900 text-sm font-medium"
                    >
                      查看
                    </button>
                    
                    {doc.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(doc.id)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        重试
                      </button>
                    )}
                    
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