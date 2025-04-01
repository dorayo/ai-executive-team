import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple

from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.knowledge.vector_store import add_documents, check_api_key

# 设置日志记录器
logger = logging.getLogger(__name__)

# 支持的文件类型和对应的MIME类型
SUPPORTED_EXTENSIONS = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.md': 'text/markdown',
    '.xml': 'application/xml',
    '.json': 'application/json',
    '.csv': 'text/csv'
}

def split_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """
    将文本分割成更小的块进行处理
    
    Args:
        text: 要分割的文本
        chunk_size: 每个块的目标大小
        chunk_overlap: 块之间的重叠部分
        
    Returns:
        文本块列表
    """
    if not text or not text.strip():
        logger.warning("收到空文本进行分割")
        return []
    
    # 使用 LangChain 的文本分割器
    try:
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        chunks = text_splitter.split_text(text)
        logger.info(f"文本已分割为 {len(chunks)} 个块")
        return chunks
    except Exception as e:
        logger.error(f"文本分割失败: {str(e)}")
        # 在分割失败的情况下，尝试简单分割
        return fallback_text_split(text, chunk_size, chunk_overlap)

def fallback_text_split(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """
    简单的文本分割方法，作为备用
    
    Args:
        text: 要分割的文本
        chunk_size: 每个块的目标大小
        chunk_overlap: 块之间的重叠部分
        
    Returns:
        文本块列表
    """
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        end = min(start + chunk_size, text_length)
        
        # 尝试在句子或段落边界截断
        if end < text_length:
            # 寻找段落结束
            paragraph_end = text.rfind('\n\n', start, end)
            if paragraph_end > start + chunk_size // 2:
                end = paragraph_end + 2  # 包含换行符
            else:
                # 寻找句子结束
                sentence_end = max(
                    text.rfind('. ', start, end),
                    text.rfind('! ', start, end),
                    text.rfind('? ', start, end)
                )
                if sentence_end > start + chunk_size // 2:
                    end = sentence_end + 2  # 包含标点和空格
        
        chunks.append(text[start:end])
        start = max(start, end - chunk_overlap)  # 保证重叠
    
    logger.info(f"使用备用方法将文本分割为 {len(chunks)} 个块")
    return chunks

def process_document(
    document_id: int,
    document_title: str,
    text_content: str,
    namespace: str = "default"
) -> Tuple[List[str], List[str], str]:
    """
    通过分割和添加到向量存储来处理文档
    
    Args:
        document_id: 文档ID
        document_title: 文档标题
        text_content: 文档文本内容
        namespace: 向量存储中使用的命名空间
        
    Returns:
        Tuple 包含：(成功的向量ID列表, 失败的文本块列表, 处理状态)
    """
    process_status = "completed"  # 默认状态
    
    # 检查 Pinecone API 密钥
    if not check_api_key():
        logger.warning(f"处理文档 {document_id} 失败：未配置向量存储API密钥")
        return ([], [], "api_key_missing")
    
    # 分割文本为块
    chunks = split_text(text_content)
    
    if not chunks:
        logger.warning(f"文档 {document_id} 未生成任何文本块")
        return ([], [], "no_chunks")
    
    # 为每个块准备元数据
    metadatas = [
        {
            "document_title": document_title,
            "chunk_index": i,
        }
        for i in range(len(chunks))
    ]
    
    # 添加块到向量存储
    try:
        logger.info(f"将文档 {document_id} 的 {len(chunks)} 个块添加到向量存储")
        vector_ids, failed_texts = add_documents(
            texts=chunks,
            metadatas=metadatas,
            document_id=document_id,
            namespace=namespace
        )
        
        # 如果有部分失败，更新状态
        if failed_texts:
            process_status = "partial"
            logger.warning(f"文档 {document_id} 的 {len(failed_texts)} 个块添加失败")
        
        return (vector_ids, failed_texts, process_status)
    
    except Exception as e:
        logger.error(f"向量化文档 {document_id} 失败: {str(e)}")
        return ([], chunks, "failed")

def extract_text_from_file(file_path: str, content_type: Optional[str] = None) -> str:
    """
    根据文件扩展名从文件中提取文本
    
    Args:
        file_path: 文件路径
        content_type: 可选的内容类型（MIME类型）
        
    Returns:
        提取的文本内容
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"文件不存在: {file_path}")
    
    # 获取文件扩展名
    _, extension = os.path.splitext(file_path)
    extension = extension.lower()
    
    # 如果未提供内容类型，尝试从扩展名推断
    if not content_type and extension in SUPPORTED_EXTENSIONS:
        content_type = SUPPORTED_EXTENSIONS[extension]
    
    logger.info(f"从文件 {file_path} 提取文本，类型: {content_type or extension}")
    
    # 基于扩展名或内容类型选择提取方法
    if extension == '.txt' or content_type == 'text/plain':
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # 尝试使用其他编码
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()
    
    elif extension == '.pdf' or content_type == 'application/pdf':
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text = ""
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                # 添加页码信息
                text += f"--- 页 {i+1} ---\n{page_text}\n\n"
            return text
        except ImportError:
            raise ImportError("请安装 pypdf 以处理 PDF 文件: pip install pypdf")
        except Exception as e:
            logger.error(f"PDF 处理失败: {str(e)}")
            raise ValueError(f"无法处理 PDF 文件: {str(e)}")
    
    elif extension in ['.docx'] or content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        try:
            import docx
            doc = docx.Document(file_path)
            text = ""
            for para in doc.paragraphs:
                text += para.text + "\n"
            return text
        except ImportError:
            raise ImportError("请安装 python-docx 以处理 Word 文件: pip install python-docx")
        except Exception as e:
            logger.error(f"Word 文件处理失败: {str(e)}")
            raise ValueError(f"无法处理 Word 文件: {str(e)}")
    
    elif extension in ['.doc'] or content_type == 'application/msword':
        try:
            # 尝试使用 textract，需要额外安装 antiword
            import textract
            return textract.process(file_path).decode('utf-8')
        except ImportError:
            raise ImportError("请安装 textract 以处理 DOC 文件: pip install textract")
        except Exception as e:
            logger.error(f"DOC 文件处理失败: {str(e)}")
            raise ValueError(f"无法处理 DOC 文件: {str(e)}")
    
    elif extension in ['.html', '.htm'] or content_type in ['text/html']:
        try:
            from bs4 import BeautifulSoup
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                # 移除脚本和样式标签
                for script in soup(["script", "style"]):
                    script.extract()
                text = soup.get_text(separator='\n')
                # 清理文本
                lines = (line.strip() for line in text.splitlines())
                chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
                text = '\n'.join(chunk for chunk in chunks if chunk)
                return text
        except ImportError:
            raise ImportError("请安装 beautifulsoup4 以处理 HTML 文件: pip install beautifulsoup4")
        except Exception as e:
            logger.error(f"HTML 处理失败: {str(e)}")
            # 尝试使用简单的方法
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except:
                raise ValueError(f"无法处理 HTML 文件: {str(e)}")
    
    elif extension == '.md' or content_type == 'text/markdown':
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Markdown 处理失败: {str(e)}")
            raise ValueError(f"无法处理 Markdown 文件: {str(e)}")
    
    elif extension == '.csv' or content_type == 'text/csv':
        try:
            import csv
            text = ""
            with open(file_path, 'r', encoding='utf-8') as f:
                csv_reader = csv.reader(f)
                headers = next(csv_reader, None)
                if headers:
                    text += " | ".join(headers) + "\n"
                    text += "-" * 30 + "\n"
                for row in csv_reader:
                    text += " | ".join(row) + "\n"
            return text
        except Exception as e:
            logger.error(f"CSV 处理失败: {str(e)}")
            # 尝试作为纯文本读取
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
    
    else:
        logger.error(f"不支持的文件扩展名或内容类型: {extension}, {content_type}")
        supported_formats = ", ".join(SUPPORTED_EXTENSIONS.keys())
        raise ValueError(f"不支持的文件扩展名: {extension}。支持的格式: {supported_formats}")

def get_document_summary(text_content: str, max_length: int = 200) -> str:
    """
    生成文档内容的摘要
    
    Args:
        text_content: 文档文本内容
        max_length: 摘要的最大长度
        
    Returns:
        文档摘要
    """
    if not text_content:
        return ""
    
    # 简单方法：取前 max_length 个字符并在句子边界截断
    summary = text_content[:max_length * 2]  # 获取较长的部分，以便找到好的截断点
    
    # 尝试在句子结束处截断
    sentence_end = max(
        summary.rfind('. ', 0, max_length),
        summary.rfind('! ', 0, max_length),
        summary.rfind('? ', 0, max_length)
    )
    
    if sentence_end > 0:
        summary = summary[:sentence_end + 1]
    else:
        # 如果找不到句子边界，直接截断并添加省略号
        summary = summary[:max_length].rstrip() + "..."
    
    return summary 