import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, isTokenValid } from '../services/baseService';

// Types
interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshUserData: () => Promise<void>;
}

// 持久化存储key
const USER_STORAGE_KEY = 'auth_user';

// 创建认证上下文
export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 计算 isAuthenticated
  const isAuthenticated = !!user;

  // 加载持久化的用户数据
  useEffect(() => {
    const loadPersistedUser = () => {
      try {
        const userData = localStorage.getItem(USER_STORAGE_KEY);
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('读取持久化的用户数据失败:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    };
    
    // 初始加载持久化的用户数据
    loadPersistedUser();
  }, []);
  
  // 当用户数据变化时更新持久化存储
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);
  
  useEffect(() => {
    console.log('AuthProvider 初始化...');
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('找到存储的 token，尝试获取用户信息...');
        try {
          // 尝试验证令牌并获取用户信息
          if (await isTokenValid()) {
            console.log('令牌有效，尝试获取用户数据');
            try {
              await fetchUser();
            } catch (e) {
              console.error('获取用户数据失败，但令牌有效，使用缓存数据');
              // 如果令牌有效但获取用户数据失败，我们继续使用缓存的用户数据
              // 这样在网络不稳定的情况下也能保持用户登录状态
            }
          } else {
            console.log('令牌无效，清除认证状态');
            // 令牌验证失败，清除缓存
            localStorage.removeItem('token');
            localStorage.removeItem(USER_STORAGE_KEY);
            setUser(null);
          }
        } catch (error) {
          console.error('验证令牌时出错:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('未找到 token，未登录状态');
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // 添加页面可见性变化监听，当用户切换回标签页时重新检查认证状态
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('页面变为可见，重新检查认证状态');
        checkAuth();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 监听存储变化事件，确保在不同标签页间同步登录状态
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          // token 被移除，登出
          console.log('检测到 token 被移除，进行登出操作');
          setUser(null);
        } else if (e.newValue !== e.oldValue) {
          // token 被更新，重新获取用户信息
          console.log('检测到 token 被更新，重新获取用户信息');
          fetchUser();
        }
      } else if (e.key === USER_STORAGE_KEY) {
        if (!e.newValue) {
          setUser(null);
        } else if (e.newValue !== e.oldValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch (error) {
            console.error('解析用户数据失败:', error);
          }
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const fetchUser = async () => {
    try {
      console.log('正在获取用户信息...');
      const response = await apiClient.get('/users/me', { timeout: 5000 });
      console.log('获取用户信息成功:', response.data);
      setUser(response.data);
      return response.data;
    } catch (error: any) {
      console.error('获取用户信息失败:', error);
      
      // 如果是401错误，清除认证状态
      if (error.response && error.response.status === 401) {
        console.log('清除 token，重置认证状态');
        localStorage.removeItem('token');
        localStorage.removeItem(USER_STORAGE_KEY);
        setUser(null);
      }
      
      throw error; // 抛出错误以便调用者知道操作失败
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (localStorage.getItem('token')) {
      return fetchUser();
    }
    return null;
  };

  const login = async (username: string, password: string) => {
    try {
      console.log(`尝试登录用户: ${username}`);
      
      // 创建URL编码的表单数据
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      // 发送表单格式的请求
      const response = await apiClient.post('/auth/login/access-token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('登录成功，获取到响应');
      const { access_token, user_id, email, is_superuser } = response.data;
      
      // 从响应中构造用户对象
      const userData: User = {
        id: user_id,
        username: username,
        email: email,
        is_active: true,
        is_superuser: is_superuser
      };
      
      console.log('设置认证状态和 token');
      localStorage.setItem('token', access_token);
      setUser(userData);
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('执行登出...');
      // 不再调用后端API
      // 直接清除本地认证状态
      localStorage.removeItem('token');
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      
      // 导航到登录页面
      window.location.href = '/login';
    } catch (error) {
      console.error('登出失败:', error);
      // 清除本地认证状态
      localStorage.removeItem('token');
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      
      // 导航到登录页面
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, isLoading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}; 