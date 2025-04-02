import React, { useEffect, useRef, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoHeight?: boolean;
  maxHeight?: number;
  onEnterPress?: () => void;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoHeight = false, maxHeight = 200, onEnterPress, onChange, ...props }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    
    // 处理文本区域高度自动调整
    const adjustHeight = (textarea: HTMLTextAreaElement) => {
      if (!autoHeight) return;
      
      // 重置高度以获取实际高度
      textarea.style.height = 'auto';
      
      // 计算新高度，考虑最大高度限制
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
      
      // 如果内容高度超过最大高度，启用滚动条
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };
    
    // 处理文本变化
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }
      
      if (autoHeight && textareaRef.current) {
        adjustHeight(textareaRef.current);
      }
    };
    
    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
      
      // 处理回车键发送消息
      if (e.key === 'Enter' && !e.shiftKey && onEnterPress) {
        e.preventDefault();
        onEnterPress();
      }
    };
    
    // 初始化和内容变化时调整高度
    useEffect(() => {
      if (autoHeight && textareaRef.current) {
        adjustHeight(textareaRef.current);
      }
    }, [autoHeight, props.value]);
    
    return (
      <textarea
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={(element) => {
          // 同时更新内部引用和转发的引用
          textareaRef.current = element;
          if (typeof ref === 'function') {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1} // 初始只有一行
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea }; 