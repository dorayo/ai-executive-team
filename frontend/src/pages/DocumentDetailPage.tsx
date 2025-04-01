import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDocument, getDocumentContent, retryProcessDocument } from '../services/documentService';
import { Button } from '../components/ui/button';
import { Loader2 } from 'lucide-react';

const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  
  const [document, setDocument] = useState<any>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isContentLoading, setIsContentLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) {
        setError('未提供文档ID');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const docId = parseInt(documentId, 10);
        
        if (isNaN(docId)) {
          setError('无效的文档ID');
          setIsLoading(false);
          return;
        }
        
        console.log('获取文档详情:', docId);
        const documentData = await getDocument(docId);
        setDocument(documentData);
        
        // 如果文档已处理完成，获取内容
        if (documentData.status === 'completed') {
          await fetchDocumentContent(docId);
        }
      } catch (err: any) {
        console.error('获取文档失败:', err);
        setError(err.response?.data?.detail || '获取文档详情失败');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId]);
  
  const fetchDocumentContent = async (docId: number) => {
    try {
      setIsContentLoading(true);
      console.log('获取文档内容:', docId);
      const contentData = await getDocumentContent(docId);
      setContent(contentData);
    } catch (err: any) {
      console.error('获取文档内容失败:', err);
      setError(err.response?.data?.detail || '获取文档内容失败');
    } finally {
      setIsContentLoading(false);
    }
  };
  
  const handleRetryProcessing = async () => {
    if (!document || !documentId) return;
    
    try {
      setIsRetrying(true);
      const docId = parseInt(documentId, 10);
      await retryProcessDocument(docId);
      
      // 重新获取文档信息
      const updatedDoc = await getDocument(docId);
      setDocument(updatedDoc);
      
      if (updatedDoc.status === 'completed') {
        await fetchDocumentContent(docId);
      }
    } catch (err: any) {
      console.error('重试处理文档失败:', err);
      setError(err.response?.data?.detail || '重试处理文档失败');
    } finally {
      setIsRetrying(false);
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'processing':
        return '处理中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '处理失败';
      default:
        return status;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
        <Button onClick={() => navigate('/documents')}>返回文档列表</Button>
      </div>
    );
  }
  
  if (!document) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <p className="text-yellow-700">未找到文档</p>
        </div>
        <Button onClick={() => navigate('/documents')}>返回文档列表</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate('/documents')}>
          返回文档列表
        </Button>
        
        {document.status === 'failed' && (
          <Button 
            onClick={handleRetryProcessing}
            disabled={isRetrying}
          >
            {isRetrying ? 
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 重新处理中...</> : 
              '重新处理文档'}
          </Button>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-2">{document.title}</h1>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(document.status)}`}>
              {getStatusText(document.status)}
            </span>
            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
              {document.file_type}
            </span>
          </div>
          
          {document.description && (
            <p className="text-gray-600 mb-4">{document.description}</p>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-gray-500">上传者</p>
              <p>{document.uploaded_by}</p>
            </div>
            <div>
              <p className="text-gray-500">上传时间</p>
              <p>{new Date(document.created_at).toLocaleString()}</p>
            </div>
          </div>
          
          {document.error_message && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <h3 className="text-red-800 font-medium mb-2">处理错误</h3>
              <p className="text-red-700 text-sm">{document.error_message}</p>
            </div>
          )}
        </div>
      </div>
      
      {document.status === 'completed' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="border-b border-gray-200 p-4">
            <h2 className="text-lg font-medium">文档内容</h2>
          </div>
          <div className="p-6">
            {isContentLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : content ? (
              <div className="prose max-w-none whitespace-pre-wrap">
                {content}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-10">无法加载文档内容</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDetailPage; 