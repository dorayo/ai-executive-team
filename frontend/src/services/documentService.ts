import axios from 'axios';
import { baseURL, apiClient } from './baseService';
import { SearchResultItem } from '../components/ui/search-result';

// 文档类型定义
export interface Document {
  id: number;
  title: string;
  description?: string;
  file_path: string;
  file_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
}

// 后端文档类型定义
interface BackendDocument {
  id: number;
  title: string;
  description?: string;
  file_path: string;
  content_type: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  processing_status: string;
  processing_error?: string;
}

// 适配函数 - 将后端文档数据转换为前端所需格式
const adaptDocument = (doc: BackendDocument): Document => {
  if (!doc) {
    console.error('尝试转换空文档对象');
    return {
      id: 0,
      title: '未知文档',
      file_path: '',
      file_type: '未知',
      uploaded_by: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'failed',
      error_message: '数据格式错误'
    };
  }

  // 状态映射
  const statusMap: Record<string, 'pending' | 'processing' | 'completed' | 'failed'> = {
    'pending': 'pending',
    'processing': 'processing',
    'completed': 'completed', 
    'error': 'failed',
    'text_only': 'completed',
    'partial': 'completed'
  };

  // 确保所有必需的字段都存在
  return {
    id: doc.id || 0,
    title: doc.title || '未知标题',
    description: doc.description,
    file_path: doc.file_path || '',
    file_type: doc.content_type || '未知类型',
    uploaded_by: doc.uploaded_by || '',
    created_at: doc.created_at || new Date().toISOString(),
    updated_at: doc.updated_at || new Date().toISOString(),
    status: statusMap[doc.processing_status] || 'pending',
    error_message: doc.processing_error
  };
};

// 搜索相关接口
export interface SearchQuery {
  query: string;
  top_k?: number;
}

export interface VectorSearchQuery extends SearchQuery {
  document_id?: number;
  filter_metadata?: Record<string, any>;
}

export interface VectorStoreStatus {
  status: 'ok' | 'initializing' | 'error';
  error?: string;
  index_stats?: {
    vector_count: number;
    dimension: number;
  };
}

// 获取文档列表
export const getDocuments = async (searchKeyword?: string): Promise<Document[]> => {
  try {
    let url = `/documents`;
    if (searchKeyword) {
      url += `?search=${encodeURIComponent(searchKeyword)}`;
    }
    console.log('获取文档列表, URL:', url);
    
    // 使用 apiClient 而不是直接使用 axios
    const response = await apiClient.get(url);
    
    console.log('获取文档列表响应状态:', response.status);
    console.log('获取文档列表响应头:', response.headers);
    console.log('获取文档列表响应数据:', response.data);
    
    if (!response.data) {
      console.warn('响应数据为空');
      return [];
    }
    
    // 转换数据格式
    if (Array.isArray(response.data)) {
      console.log(`成功获取 ${response.data.length} 个文档`);
      return response.data.map((doc, index) => {
        console.log(`处理文档 ${index + 1}/${response.data.length}:`, doc);
        return adaptDocument(doc);
      });
    } else {
      console.warn('响应不是数组格式:', typeof response.data);
      return [];
    }
  } catch (error: any) {
    console.error('获取文档列表失败:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('请求错误详情:');
      console.error('- 请求URL:', error.config?.url);
      console.error('- 请求方法:', error.config?.method);
      console.error('- 响应状态:', error.response?.status);
      console.error('- 响应数据:', error.response?.data);
      
      // 检查特定错误码
      if (error.response?.status === 307) {
        console.error('收到重定向(307)，重定向URL:', error.response.headers.location);
      } else if (error.response?.status === 401) {
        console.error('未授权访问(401)，可能需要重新登录');
      }
    }
    
    throw error;
  }
};

// 获取单个文档详情
export const getDocument = async (id: number): Promise<Document> => {
  try {
    const response = await apiClient.get(`/documents/${id}`);
    return adaptDocument(response.data);
  } catch (error) {
    console.error(`获取文档 #${id} 详情失败:`, error);
    throw error;
  }
};

// 上传文档
export const uploadDocument = async (formData: FormData): Promise<Document> => {
  try {
    const response = await apiClient.post(`/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return adaptDocument(response.data);
  } catch (error) {
    console.error('上传文档失败:', error);
    throw error;
  }
};

// 删除文档
export const deleteDocument = async (id: number): Promise<void> => {
  try {
    await apiClient.delete(`/documents/${id}`);
  } catch (error) {
    console.error(`删除文档 #${id} 失败:`, error);
    throw error;
  }
};

// 获取文档内容
export const getDocumentContent = async (id: number): Promise<string> => {
  try {
    const response = await apiClient.get(`/documents/${id}/content`);
    return response.data.content;
  } catch (error) {
    console.error(`获取文档 #${id} 内容失败:`, error);
    throw error;
  }
};

// 重试文档处理
export const retryProcessDocument = async (id: number): Promise<Document> => {
  try {
    const response = await apiClient.post(`/documents/${id}/retry`);
    console.log('重试处理文档响应:', response.data);
    
    // 后端返回的可能只是一个确认消息，需要重新获取文档信息
    try {
      return await getDocument(id);
    } catch (error) {
      // 如果无法获取更新后的文档，则构造一个临时对象
      console.warn(`无法获取更新后的文档 #${id}，返回占位对象`);
      return {
        id: id,
        title: '文档处理中',
        file_path: '',
        file_type: '',
        uploaded_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'processing',
        error_message: ''
      };
    }
  } catch (error) {
    console.error(`重试处理文档 #${id} 失败:`, error);
    throw error;
  }
};

// 关键词搜索文档
export const searchDocuments = async (query: SearchQuery): Promise<SearchResultItem[]> => {
  try {
    console.log('发送关键词搜索请求:', query);
    const response = await apiClient.post(`/documents/search`, query);
    console.log('关键词搜索响应原始数据:', response.data);
    
    // 确保返回的是数组
    let results = Array.isArray(response.data) ? response.data : [];
    
    if (results.length === 0) {
      console.warn('关键词搜索返回空结果');
      return [];
    }
    
    // 检查关键词搜索结果的格式，转换为SearchResultItem格式
    // 关键词搜索返回的是DocumentSearchResponse，需要将其转换为SearchResultItem
    return results.map(item => {
      // 根据后端响应的格式来确定合适的映射
      // 后端响应可能使用的是id而不是document_id，title而不是document_title
      return {
        document_id: item.document_id || item.id,
        document_title: item.document_title || item.title,
        text: item.text || item.description || '',
        score: item.score || 0.8, // 关键词搜索可能没有分数，给一个默认值
        page: item.page || item.page_number
      };
    });
  } catch (error) {
    console.error('关键词搜索文档失败:', error);
    throw error;
  }
};

// 向量搜索文档
export const vectorSearchDocuments = async (query: VectorSearchQuery): Promise<SearchResultItem[]> => {
  try {
    console.log('发送向量搜索请求:', query);
    const response = await apiClient.post(`/documents/vector-search`, query);
    console.log('向量搜索响应原始数据:', response.data);
    
    // 确保返回的是数组
    let results = Array.isArray(response.data) ? response.data : [];
    
    if (results.length === 0) {
      console.warn('向量搜索返回空结果');
      return [];
    }
    
    // 转换为SearchResultItem格式
    return results.map(item => {
      // 确保document_id是数字
      const docId = typeof item.document_id === 'string' 
        ? parseInt(item.document_id, 10) 
        : (item.document_id !== undefined ? item.document_id : 0);
        
      // 确保score是数字
      let score = 0;
      if (typeof item.score === 'number') {
        score = item.score;
      } else if (typeof item.score === 'string') {
        score = parseFloat(item.score);
        if (isNaN(score)) score = 0;
      }
      
      return {
        document_id: docId,
        document_title: item.document_title || '未知文档',
        text: item.text || '',
        score: score,
        page: item.page_number || item.page
      };
    });
  } catch (error) {
    console.error('向量搜索失败:', error);
    throw error;
  }
};

// 获取向量存储状态
export const getVectorStoreStatus = async (): Promise<VectorStoreStatus> => {
  try {
    const response = await apiClient.get(`/documents/vector-store/status`);
    return response.data;
  } catch (error) {
    console.error('获取向量存储状态失败:', error);
    throw error;
  }
}; 