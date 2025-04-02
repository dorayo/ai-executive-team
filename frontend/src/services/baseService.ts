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
  timeout: 15000 // 增加超时时间到15秒
});

// 记录上次重定向的时间，防止重复重定向
let lastRedirectTime = 0;
const REDIRECT_COOLDOWN = 3000; // 3秒冷却时间

// 添加退避重试逻辑
const retryableEndpoints = ['/users/me']; // 需要重试的端点
const retryCount = new Map(); // 记录每个URL的重试次数

// 添加请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    
    // 如果存在 token，则添加到请求头
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 记录请求信息到控制台，但不记录用户敏感信息
    if (config.url && !config.url.includes('/auth/login')) {
      console.log(`发送 ${config.method?.toUpperCase()} 请求到 ${config.url}`);
    }
    
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
    // 成功响应，重置该URL的重试计数
    if (response.config.url) {
      retryCount.delete(response.config.url);
    }
    
    return response;
  },
  async error => {
    // 仅针对特定错误状态记录错误
    if (error.response) {
      console.error(`响应错误 ${error.response.status} 来自 ${error.config?.url}`);
    }
    
    // 处理可重试的请求（网络错误或特定端点的401错误）
    if (
      error.config && 
      (error.code === 'ECONNABORTED' || 
       (error.response?.status === 401 && 
        retryableEndpoints.some(endpoint => error.config.url?.includes(endpoint))))
    ) {
      const currentUrl = error.config.url || '';
      const currentRetryCount = retryCount.get(currentUrl) || 0;
      
      // 最多重试2次
      if (currentRetryCount < 2) {
        // 指数退避延迟
        const delay = Math.pow(2, currentRetryCount) * 1000;
        console.log(`重试请求 ${currentUrl}，第 ${currentRetryCount + 1} 次，延迟 ${delay}ms`);
        
        retryCount.set(currentUrl, currentRetryCount + 1);
        
        // 等待指定时间后重试
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 刷新token
        const token = localStorage.getItem('token');
        if (token) {
          error.config.headers.Authorization = `Bearer ${token}`;
        }
        
        return apiClient(error.config);
      }
    }
    
    // 如果是 401 错误（未授权），可能是 token 过期
    if (error.response && error.response.status === 401) {
      // 检查是否是登录请求，登录请求的401应该由登录页面处理
      if (error.config.url && error.config.url.includes('/auth/login')) {
        return Promise.reject(error);
      }
      
      // 对于其他401请求，清除token并可能重定向
      console.log('未授权访问，清除 token');
      localStorage.removeItem('token');
      
      // 获取当前页面的URL路径
      const currentPath = window.location.pathname + window.location.search;
      
      // 防止频繁重定向
      const now = Date.now();
      if (now - lastRedirectTime > REDIRECT_COOLDOWN) {
        lastRedirectTime = now;
        
        // 只有在这些情况下才需要重定向到登录页面：
        // 1. 用户当前不在登录页
        // 2. API请求是由用户主动操作触发的（如点击按钮），而不是后台自动刷新
        // 3. 页面当前是可见的
        if (currentPath !== '/login' && currentPath.indexOf('/login') !== 0) {
          // 存储当前路径，以便登录后返回
          sessionStorage.setItem('redirectAfterLogin', currentPath);
          
          // 只在页面可见且是主动请求时重定向
          if (document.visibilityState === 'visible' && error.config.method !== 'get') {
            console.log('重定向到登录页面');
            // 添加重定向参数到URL
            const encodedRedirect = encodeURIComponent(currentPath);
            window.location.href = `/login?redirect=${encodedRedirect}`;
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// 添加检查令牌是否有效的辅助函数
export const isTokenValid = async () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // 增加超时，防止在慢网络下阻塞用户体验
    await apiClient.get('/users/me', { timeout: 5000 });
    return true;
  } catch (error) {
    // 只有当明确收到401错误时才认为token无效
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return false;
    }
    // 对于其他错误（如网络问题），倾向于保持用户的登录状态
    return true;
  }
}; 