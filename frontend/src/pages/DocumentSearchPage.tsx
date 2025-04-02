import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchResult, SearchResultItem } from '../components/ui/search-result';
import { 
  searchDocuments, 
  vectorSearchDocuments, 
  getVectorStoreStatus,
  VectorStoreStatus 
} from '../services/documentService';

const DocumentSearchPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'keyword' | 'vector'>('keyword');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // 向量存储状态
  const [vectorStoreStatus, setVectorStoreStatus] = useState<VectorStoreStatus | null>(null);
  
  // 加载向量存储状态
  useEffect(() => {
    const loadVectorStoreStatus = async () => {
      try {
        console.log('正在获取向量存储状态...');
        const status = await getVectorStoreStatus();
        console.log('获取向量存储状态成功:', status);
        setVectorStoreStatus(status);
      } catch (err) {
        console.error('获取向量存储状态失败：', err);
        setVectorStoreStatus({
          status: 'error',
          error: '无法连接到向量存储'
        });
      }
    };
    
    loadVectorStoreStatus();
  }, []);
  
  // 处理搜索 - 使用 useCallback 包装
  const handleSearch = useCallback(async () => {
    console.log('开始搜索, 搜索词:', searchQuery, '搜索类型:', searchType);
    
    if (!searchQuery.trim()) {
      console.log('搜索词为空，显示错误');
      setSearchError('请输入搜索内容');
      return;
    }
    
    try {
      setIsSearching(true);
      setSearchError(null);
      setHasSearched(true);
      
      let results: SearchResultItem[];
      
      if (searchType === 'keyword') {
        console.log('执行关键词搜索');
        results = await searchDocuments({ query: searchQuery, top_k: 10 });
      } else {
        console.log('执行向量搜索');
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
      
      if (!results || results.length === 0) {
        console.log('未找到结果');
      }
    } catch (err: any) {
      console.error('搜索失败：', err);
      setSearchError(err.response?.data?.detail || '搜索失败，请稍后再试');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchType, vectorStoreStatus]);
  
  // 处理查看文档
  const handleViewDocument = useCallback((documentId: number) => {
    console.log('查看文档:', documentId);
    navigate(`/documents/${documentId}`);
  }, [navigate]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">知识库搜索</h1>
      
      {/* 向量存储状态提示 */}
      {searchType === 'vector' && vectorStoreStatus && vectorStoreStatus.status !== 'ok' && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
          <p className="text-sm">
            <span className="font-medium">注意：</span>
            {' '}向量搜索功能暂不可用。{vectorStoreStatus.error && `原因：${vectorStoreStatus.error}`}
          </p>
        </div>
      )}
      
      {/* 搜索框 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            placeholder="搜索知识库文档..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            disabled={isSearching}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSearchType('keyword')}
                className={`px-3 py-1 rounded-md ${
                  searchType === 'keyword'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                关键词搜索
              </button>
              <button
                onClick={() => setSearchType('vector')}
                className={`px-3 py-1 rounded-md ${
                  searchType === 'vector'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                语义搜索
              </button>
            </div>
          </div>
          
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className={`px-4 py-2 rounded-md text-white ${
              isSearching || !searchQuery.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isSearching ? '搜索中...' : '搜索'}
          </button>
        </div>
        
        {vectorStoreStatus && vectorStoreStatus.status === 'ok' && vectorStoreStatus.index_stats && (
          <p className="mt-2 text-xs text-gray-500">
            向量库中有 {vectorStoreStatus.index_stats.vector_count} 条记录可供搜索
          </p>
        )}
      </div>
      
      {/* 搜索结果 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {hasSearched && searchResults && searchResults.length > 0 ? '搜索结果' : '使用上方搜索框搜索文档'}
          </h2>
        </div>
        
        <div className="p-6">
          {searchError && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{searchError}</p>
                </div>
              </div>
            </div>
          )}
          
          {isSearching ? (
            <div className="py-10 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em]"></div>
              <p className="mt-2 text-sm text-gray-500">搜索中...</p>
            </div>
          ) : (
            <>
              <SearchResult
                results={searchResults}
                isLoading={false}
                error={null}
                onViewDocument={handleViewDocument}
              />
              
              {hasSearched && searchResults && searchResults.length > 0 && (
                <p className="mt-4 text-xs text-gray-500">
                  {searchType === 'keyword' ? '使用关键词搜索' : '使用语义搜索'} 找到 {searchResults.length} 个结果
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentSearchPage; 