import React from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { SearchResultItem } from './search-result';

interface DebugSearchResultProps {
  results: SearchResultItem[];
  onViewDocument: (documentId: number) => void;
}

export const DebugSearchResult: React.FC<DebugSearchResultProps> = ({
  results,
  onViewDocument,
}) => {
  if (!results || results.length === 0) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md">
        <p className="text-yellow-700">搜索结果为空数组</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <p className="text-blue-700">找到 {results.length} 个结果 (调试显示)</p>
      </div>
      
      {results.map((result, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex flex-col">
              <h3 className="font-medium text-lg text-gray-900 mb-1">
                结果 #{index + 1} (ID: {JSON.stringify(result.document_id)})
              </h3>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">文档ID</p>
                  <p className="text-sm text-gray-700">{JSON.stringify(result.document_id)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">类型</p>
                  <p className="text-sm text-gray-700">{typeof result.document_id}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">标题</p>
                  <p className="text-sm text-gray-700">{result.document_title || '无标题'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">分数</p>
                  <p className="text-sm text-gray-700">{result.score}</p>
                </div>
              </div>
              
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500">文本内容</p>
                <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-2">
                  {result.text || '无文本内容'}
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const docId = typeof result.document_id === 'string' 
                    ? parseInt(result.document_id, 10) 
                    : result.document_id;
                    
                  console.log('尝试查看文档 (调试):', docId);
                  onViewDocument(Number(docId));
                }}
              >
                查看文档 (调试)
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}; 