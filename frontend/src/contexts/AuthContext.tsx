import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/baseService';

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
}

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

  useEffect(() => {
    console.log('AuthProvider 初始化...');
    const token = localStorage.getItem('token');
    if (token) {
      console.log('找到存储的 token，尝试获取用户信息...');
      fetchUser();
    } else {
      console.log('未找到 token，未登录状态');
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      console.log('正在获取用户信息...');
      const response = await apiClient.get('/users/me');
      console.log('获取用户信息成功:', response.data);
      setUser(response.data);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      console.log('清除 token，重置认证状态');
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
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
      
      console.log('登录成功，获取到响应:', response.data);
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
      console.log('尝试登出...');
      await apiClient.post('/auth/logout');
      console.log('登出成功，清除认证状态');
      localStorage.removeItem('token');
      setUser(null);
    } catch (error) {
      console.error('登出失败:', error);
      // 即使登出API调用失败，也清除本地认证状态
      localStorage.removeItem('token');
      setUser(null);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}; 