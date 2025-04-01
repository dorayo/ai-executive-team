import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout components
import MainLayout from './components/layouts/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import DocumentSearchPage from './pages/DocumentSearchPage';
import AIExecutivesPage from './pages/AIExecutivesPage';
import ConversationsPage from './pages/ConversationsPage';
import TaskPage from './pages/TaskPage';
import NotFoundPage from './pages/NotFoundPage';

// Auth context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode, fallback: React.ReactNode },
  { hasError: boolean, error: Error | null }
> {
  constructor(props: { children: React.ReactNode, fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('组件错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// 错误显示组件
const ErrorFallback = ({ error }: { error?: Error | null }) => (
  <div className="h-screen flex items-center justify-center bg-red-50">
    <div className="max-w-md p-8 bg-white rounded shadow-lg">
      <h2 className="text-2xl font-bold text-red-700 mb-4">应用发生错误</h2>
      <p className="text-gray-700 mb-4">
        很抱歉，应用加载时发生了错误。请尝试刷新页面或联系管理员。
      </p>
      {error && (
        <div className="bg-red-50 p-4 rounded text-sm text-red-700">
          <p className="font-semibold">错误详情：</p>
          <p>{error.message}</p>
        </div>
      )}
      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        刷新页面
      </button>
    </div>
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth();
  
  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ChatPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:conversationId" element={<ChatPage />} />
            <Route path="documents" element={
              <ErrorBoundary fallback={
                <div className="p-8 bg-red-50 rounded">
                  <h3 className="font-bold text-lg text-red-700">文档页面加载失败</h3>
                  <p className="mt-2">加载文档页面时发生错误，请稍后再试或联系管理员。</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    重新加载
                  </button>
                </div>
              }>
                <DocumentsPage />
              </ErrorBoundary>
            } />
            <Route path="documents/search" element={<DocumentSearchPage />} />
            <Route path="documents/:documentId" element={<DocumentDetailPage />} />
            <Route path="ai-executives" element={<AIExecutivesPage />} />
            <Route path="conversations" element={<ConversationsPage />} />
            <Route path="tasks/:conversationId?" element={<TaskPage />} />
          </Route>
          
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 