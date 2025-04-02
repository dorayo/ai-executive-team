import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToastProps {
  show: boolean;
  onClose: () => void;
}

const ThemeToast: React.FC<ThemeToastProps> = ({ show, onClose }) => {
  const { isDarkMode } = useTheme();
  
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);
  
  if (!show) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div 
        className={`
          rounded-lg shadow-lg py-3 px-4 flex items-center gap-2
          ${isDarkMode 
            ? 'bg-gray-800 text-gray-100 border border-gray-700' 
            : 'bg-white text-gray-800 border border-gray-200'
          }
          transition-colors duration-300
        `}
      >
        {isDarkMode ? (
          <>
            <Moon className="h-5 w-5 text-blue-400" />
            <span>已切换到暗色模式</span>
          </>
        ) : (
          <>
            <Sun className="h-5 w-5 text-yellow-500" />
            <span>已切换到亮色模式</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ThemeToast;

// 添加淡入动画
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
`;
document.head.appendChild(style); 