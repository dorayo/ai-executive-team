import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_URL } from '../config';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const auth = useAuth();
  
  // 如果已经认证，重定向到首页
  if (auth?.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await auth?.login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || '登录失败');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      // 注册用户
      await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        full_name: fullName
      });
      
      // 不自动登录，而是显示成功消息
      setSuccess('注册成功！请使用您的凭据登录。');
      setIsLogin(true);
      // 清空表单
      setPassword('');
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('注册过程中发生错误');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            AI 执行团队
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? '登录以访问您的 AI 执行团队' : '注册新账户'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={isLogin ? handleSubmit : handleRegisterSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700">{success}</div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">
                  姓名
                </label>
                <input
                  id="full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required={!isLogin}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="请输入您的姓名"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
                电子邮箱
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="请输入您的电子邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading 
                  ? 'bg-primary-400 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              }`}
            >
              {isLoading 
                ? (isLogin ? '登录中...' : '注册中...') 
                : (isLogin ? '登录' : '注册')}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={toggleAuthMode}
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage; 