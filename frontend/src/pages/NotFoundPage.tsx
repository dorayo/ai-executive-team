import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-12">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">404</h2>
        <p className="mt-2 text-sm text-gray-600">页面未找到</p>
        <div className="mt-5">
          <Link
            to="/"
            className="text-primary-600 hover:text-primary-500"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 