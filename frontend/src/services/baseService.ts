// baseService.ts - 基础服务配置
import axios from 'axios';

// API 基础URL - 确保末尾没有斜杠，与后端路由匹配
export const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// 注意: 后端路由是 /api/v1/documents（没有末尾斜杠）
// 如果需要在不同环境使用不同的URL，可以使用环境变量
// export const baseURL = process.env.REACT_APP_API_BASE_URL || '/api'; 

// 创建一个带有默认配置的 axios 实例
export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // 允许凭证（cookies）跨域发送
  withCredentials: true,
  // 超时设置
  timeout: 10000
});

// 添加请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    
    // 如果存在 token，则添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`发送 ${config.method?.toUpperCase()} 请求到 ${config.url}`);
    return config;
  },
  error => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

// 添加响应拦截器
apiClient.interceptors.response.use(
  response => {
    console.log(`收到来自 ${response.config.url} 的响应:`, response.status);
    return response;
  },
  error => {
    console.error('响应拦截器错误:', error);
    
    // 如果是 401 错误（未授权），可能是 token 过期
    if (error.response && error.response.status === 401) {
      console.log('未授权访问，清除 token');
      localStorage.removeItem('token');
      
      // 可选：重定向到登录页
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
); 