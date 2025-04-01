import React from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';

export interface SearchResultItem {
  document_id: number | string;
  document_title?: string;
  text: string;
  score: number;
  page?: number;
  page_number?: number; // 后端可能使用 page_number 而不是 page
}

interface SearchResultProps {
  results: SearchResultItem[];
  isLoading: boolean;
  error: string | null;
  onViewDocument: (documentId: number) => void;
}

// 格式化分数为百分比
const formatScore = (score: number): string => {
  // 检查分数是否为有效数字
  if (score === null || score === undefined || isNaN(Number(score))) {
    return '匹配度: 未知';
  }
  
  // 确保score是数字
  const numScore = Number(score);
  
  // 根据分数范围进行处理
  let formattedScore: number;
  
  if (numScore >= 0 && numScore <= 1) {
    // 如果分数在0-1之间（通常是相似度），转换为百分比
    formattedScore = Math.round(numScore * 100);
  } else if (numScore > 1 && numScore <= 100) {
    // 已经是百分比范围，直接取整
    formattedScore = Math.round(numScore);
  } else if (numScore > 100) {
    // 如果超过100，限制为100
    formattedScore = 100;
  } else {
    // 如果是负数或其他情况，使用默认值
    formattedScore = Math.max(Math.round(numScore), 0);
  }
  
  // 确保分数至少为1（除非是真的0）
  if (formattedScore === 0 && numScore > 0) {
    formattedScore = 1;
  }
  
  return `匹配度: ${formattedScore}%`;
};

// 格式化文本摘要
const formatText = (text: string | null | undefined): string => {
  if (!text) return '无文本内容';
  
  // 如果文本过长，截断它
  const maxLength = 250;
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  
  return text;
};

export const SearchResult: React.FC<SearchResultProps> = ({
  results,
  isLoading,
  error,
  onViewDocument,
}) => {
  console.log('SearchResult组件收到的结果:', results);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">未找到结果，请尝试不同的搜索词或搜索方式。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => {
        // 确保result存在
        if (!result) {
          console.warn('搜索结果项为空', index);
          return null;
        }
        
        // 确保document_id是数字
        let docId: number;
        try {
          if (typeof result.document_id === 'string') {
            // 尝试转换字符串ID为数字
            docId = parseInt(result.document_id, 10);
          } else if (typeof result.document_id === 'number') {
            docId = result.document_id;
          } else {
            console.error("无效的文档ID类型:", typeof result.document_id);
            return null; // 跳过无效的结果
          }
          
          if (isNaN(docId) || docId <= 0) {
            console.error("无效的文档ID值:", result.document_id);
            return null; // 跳过无效的结果
          }
        } catch (err) {
          console.error("处理文档ID时出错:", err, result);
          return null; // 跳过出错的结果
        }
        
        // 使用 page_number 作为备选
        const pageNumber = result.page || result.page_number;
        
        // 获取文档标题，后备为"文档"加ID
        const docTitle = result.document_title || `文档 ${docId}`;
        
        // 格式化文本内容
        const formattedText = formatText(result.text);
          
        return (
          <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-lg text-gray-900 mb-1">
                    {docTitle}
                  </h3>
                  {pageNumber && (
                    <p className="text-sm text-gray-500 mb-2">页码: {pageNumber}</p>
                  )}
                  <p className="text-sm text-gray-700 mb-3 whitespace-pre-line">
                    {formattedText}
                  </p>
                  <p className="text-xs text-gray-500">{formatScore(result.score)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log("查看文档按钮点击，文档ID:", docId, "类型:", typeof docId);
                    try {
                      onViewDocument(docId);
                    } catch (err) {
                      console.error("查看文档时出错:", err);
                      alert("查看文档时发生错误，请检查控制台日志");
                    }
                  }}
                  className="ml-4"
                >
                  查看文档
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
