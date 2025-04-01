import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout: React.FC = () => {
  const auth = useAuth();
  const location = useLocation();
  
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
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* 侧边栏 */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-gray-800">AI 助手</h1>
        </div>
        
        <nav className="mt-4">
          {navGroups.map((group, index) => (
            <div key={index} className="mb-4">
              <h2 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                        className={`flex items-center px-4 py-2 text-sm ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500' 
                            : 'text-gray-700 hover:bg-gray-50'
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
        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{auth?.user?.full_name || auth?.user?.email}</p>
              <p className="text-xs text-gray-500">{auth?.user?.is_superuser ? '管理员' : '用户'}</p>
            </div>
            
            <button
              onClick={auth?.logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              退出
            </button>
          </div>
        </div>
      </div>
      
      {/* 主内容 */}
      <div className="flex-1 overflow-auto">
        <header className="p-4 bg-white shadow-sm border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {getCurrentPageTitle()}
          </h2>
        </header>
        
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout; 