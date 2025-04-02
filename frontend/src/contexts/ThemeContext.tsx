import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 安全地获取存储的主题，处理可能的异常
const getSavedTheme = (): Theme | null => {
  try {
    return localStorage.getItem('theme') as Theme;
  } catch (e) {
    console.error('无法访问localStorage:', e);
    return null;
  }
};

// 安全地保存主题到本地存储
const saveTheme = (theme: Theme): void => {
  try {
    localStorage.setItem('theme', theme);
  } catch (e) {
    console.error('无法保存主题到localStorage:', e);
  }
};

// 检测系统偏好
const getSystemPreference = (): Theme => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 初始化主题从本地存储或系统偏好获取
  const [theme, setThemeState] = useState<Theme>(() => {
    // 检查是否在浏览器环境中
    if (typeof window !== 'undefined') {
      const savedTheme = getSavedTheme();
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        return savedTheme;
      }
      
      // 如果没有保存的主题，则使用系统偏好
      return getSystemPreference();
    }
    
    return 'light'; // 服务器端渲染默认使用亮色模式
  });
  
  const isDarkMode = theme === 'dark';
  
  // 更新主题的包装函数，处理存储和DOM更新
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    
    // 立即更新DOM，不等待React重新渲染
    updateDOMTheme(newTheme);
  };
  
  // 切换主题函数
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    console.log('主题已切换为:', newTheme);
  };
  
  // 直接更新DOM主题，不依赖于React的更新循环
  const updateDOMTheme = (themeValue: Theme) => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      
      if (themeValue === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    }
  };
  
  // 当主题变化时，更新文档类和本地存储
  useEffect(() => {
    updateDOMTheme(theme);
    
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // 只有在用户没有明确设置主题的情况下，才跟随系统变化
      if (!getSavedTheme()) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // 旧版浏览器的兼容处理
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // 旧版浏览器的兼容处理
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 自定义钩子，便于在组件中使用主题上下文
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 