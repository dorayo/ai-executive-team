import React from 'react';
import { Input } from './input';
import { Button } from './button';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  isLoading?: boolean;
  searchType?: 'keyword' | 'vector';
  onSearchTypeChange?: (type: 'keyword' | 'vector') => void;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = '搜索知识库...',
  isLoading = false,
  searchType = 'keyword',
  onSearchTypeChange,
}: SearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="relative flex w-full items-center">
      <div className="relative flex-grow">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          className="pr-10"
          disabled={isLoading}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="h-4 w-4 animate-spin text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </div>

      {onSearchTypeChange && (
        <div className="ml-2 flex rounded-md shadow-sm">
          <Button
            variant={searchType === 'keyword' ? 'default' : 'outline'}
            onClick={() => onSearchTypeChange('keyword')}
            className="rounded-r-none px-3"
            disabled={isLoading}
          >
            关键词
          </Button>
          <Button
            variant={searchType === 'vector' ? 'default' : 'outline'}
            onClick={() => onSearchTypeChange('vector')}
            className="rounded-l-none px-3"
            disabled={isLoading}
          >
            语义
          </Button>
        </div>
      )}

      <Button 
        onClick={onSearch} 
        className="ml-2" 
        disabled={isLoading}
      >
        搜索
      </Button>
    </div>
  );
} 