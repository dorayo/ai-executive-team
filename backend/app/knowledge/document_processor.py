import os
import re
from typing import List, Dict, Any, Optional, Tuple

from langchain.text_splitter import RecursiveCharacterTextSplitter
from app.knowledge.vector_store import add_documents

def split_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> List[str]:
    """
    Split text into smaller chunks for processing
    
    Args:
        text: The text to split
        chunk_size: The target size of each chunk
        chunk_overlap: The overlap between chunks
        
    Returns:
        List of text chunks
    """
    # Use LangChain's text splitter
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )
    
    chunks = text_splitter.split_text(text)
    return chunks

def process_document(
    document_id: int,
    document_title: str,
    text_content: str,
    namespace: str = "default"
) -> List[str]:
    """
    Process a document by splitting it and adding to vector store
    
    Args:
        document_id: ID of the document
        document_title: Title of the document
        text_content: Text content of the document
        namespace: Namespace to use in vector store
        
    Returns:
        List of vector IDs created
    """
    # Split text into chunks
    chunks = split_text(text_content)
    
    # Prepare metadata for each chunk
    metadatas = [
        {
            "document_title": document_title,
            "chunk_index": i,
        }
        for i in range(len(chunks))
    ]
    
    # Add chunks to vector store
    vector_ids = add_documents(
        texts=chunks,
        metadatas=metadatas,
        document_id=document_id,
        namespace=namespace
    )
    
    return vector_ids

def extract_text_from_file(file_path: str) -> str:
    """
    Extract text from a file based on its extension
    
    Args:
        file_path: Path to the file
        
    Returns:
        Extracted text content
    """
    _, extension = os.path.splitext(file_path)
    extension = extension.lower()
    
    if extension == '.txt':
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    elif extension == '.pdf':
        # If we need PDF processing, we'll need to install pypdf
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n\n"
            return text
        except ImportError:
            raise ImportError("Please install pypdf to process PDF files: pip install pypdf")
    
    elif extension in ['.docx', '.doc']:
        # If we need Word processing, we'll need to install python-docx
        try:
            import docx
            doc = docx.Document(file_path)
            text = ""
            for para in doc.paragraphs:
                text += para.text + "\n"
            return text
        except ImportError:
            raise ImportError("Please install python-docx to process Word files: pip install python-docx")
    
    else:
        raise ValueError(f"Unsupported file extension: {extension}") 