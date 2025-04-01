import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  
  // Navigation items
  const navItems = [
    { name: 'Chat', path: '/' },
    { name: 'Documents', path: '/documents' },
    { name: 'AI Executives', path: '/executives' },
  ];
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold text-gray-800">AI Executive Team</h1>
        </div>
        
        <nav className="mt-4">
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-gray-700 ${
                    (location.pathname === item.path || 
                    (item.path === '/' && location.pathname === '/')) 
                    ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500' 
                    : 'hover:bg-gray-50'
                  }`}
                >
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* User info */}
        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">{user?.full_name || user?.email}</p>
              <p className="text-xs text-gray-500">{user?.is_superuser ? 'Administrator' : 'User'}</p>
            </div>
            
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <header className="p-4 bg-white shadow-sm border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {navItems.find(item => 
              item.path === location.pathname || 
              (item.path === '/' && location.pathname === '/')
            )?.name || 'Page'}
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