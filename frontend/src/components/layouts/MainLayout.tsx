import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import ThemeToast from '../ui/ThemeToast';

const MainLayout: React.FC = () => {
  const auth = useAuth();
  const { theme, toggleTheme, isDarkMode } = useTheme();
  const location = useLocation();
  const [showToast, setShowToast] = useState(false);
  
  // 菜单分组
  const navGroups = [
    {
      title: "聊天",
      items: [
        { name: '聊天助手', path: '/' },
        { name: '对话历史', path: '/conversations' },
      ]
    },
    {
      title: "知识库",
      items: [
        { name: '文档管理', path: '/documents' },
        { name: '文档搜索', path: '/documents/search' },
      ]
    },
    {
      title: "设置",
      items: [
        { name: 'AI 团队成员', path: '/ai-executives' },
      ]
    }
  ];
  
  // 获取当前页面标题
  const getCurrentPageTitle = () => {
    // 先检查具体路径
    for (const group of navGroups) {
      for (const item of group.items) {
        if (location.pathname === item.path || 
           (item.path === '/' && location.pathname === '/chat')) {
          return item.name;
        }
      }
    }
    
    // 检查文档详情页
    if (location.pathname.match(/^\/documents\/\d+$/)) {
      return '文档详情';
    }
    
    // 如果是任务页面
    if (location.pathname.startsWith('/tasks')) {
      return '任务详情';
    }
    
    return '页面';
  };
  
  // 处理主题切换
  const handleThemeToggle = () => {
    toggleTheme();
    setShowToast(true);
  };
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* 侧边栏 */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-md transition-colors duration-300">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">AI 助手</h1>
          
          {/* 主题切换按钮 - 更明显的设计 */}
          <button 
            onClick={handleThemeToggle}
            className={`p-2 rounded-full transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 hover:text-yellow-300 hover:shadow-glow-yellow' 
                : 'bg-blue-100 hover:bg-blue-200 text-gray-700 hover:text-gray-900 hover:shadow-md'
            }`}
            title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
            aria-label={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
            id="theme-toggle-button"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 transition-transform duration-300 transform hover:rotate-45" />
            ) : (
              <Moon className="h-5 w-5 transition-transform duration-300 transform hover:rotate-12" />
            )}
          </button>
        </div>
        
        <nav className="mt-4">
          {navGroups.map((group, index) => (
            <div key={index} className="mb-4">
              <h2 className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {group.title}
              </h2>
              <ul>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path || 
                    (item.path === '/' && location.pathname === '/chat');
                  
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`flex items-center px-4 py-2 text-sm transition-colors duration-200 ${
                          isActive
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-r-4 border-primary-500' 
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* 用户信息 */}
        <div className="absolute bottom-0 w-64 p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{auth?.user?.full_name || auth?.user?.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{auth?.user?.is_superuser ? '管理员' : '用户'}</p>
            </div>
            
            <button
              onClick={auth?.logout}
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
            >
              退出
            </button>
          </div>
        </div>
      </div>
      
      {/* 主内容 */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <header className="p-4 bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 transition-colors duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {getCurrentPageTitle()}
            </h2>
            
            {/* 在小屏幕上显示主题切换按钮 */}
            <div className="md:hidden">
              <button 
                onClick={handleThemeToggle}
                className={`p-2 rounded-full transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400 hover:text-yellow-300' 
                    : 'bg-blue-100 hover:bg-blue-200 text-gray-700 hover:text-gray-900'
                }`}
                title={isDarkMode ? '切换到亮色模式' : '切换到暗色模式'}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </header>
        
        <main className="p-4">
          <Outlet />
        </main>
      </div>
      
      {/* 主题切换通知 */}
      <ThemeToast show={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default MainLayout; 