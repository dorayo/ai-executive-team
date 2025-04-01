from pinecone import Pinecone, ServerlessSpec
import os
import numpy as np
from typing import List, Dict, Any, Optional
from app.core.config import settings

# Initialize Pinecone connection
def init_pinecone():
    """Initialize connection to Pinecone vector database"""
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)
    
    # Check if index exists
    if settings.PINECONE_INDEX_NAME not in pc.list_indexes().names():
        # Create index if it doesn't exist
        pc.create_index(
            name=settings.PINECONE_INDEX_NAME,
            dimension=1536,  # Using OpenAI embeddings which are 1536 dimensions
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-west-2"  # Default region
            )
        )
    
    # Connect to the index
    index = pc.Index(settings.PINECONE_INDEX_NAME)
    return index

def get_pinecone_index():
    """Get the Pinecone index, initializing if necessary"""
    try:
        pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        return pc.Index(settings.PINECONE_INDEX_NAME)
    except:
        return init_pinecone()

def add_documents(texts: List[str], metadatas: List[Dict[str, Any]], document_id: int, namespace: str = "default") -> List[str]:
    """
    Add document chunks to the vector store with metadata
    
    Args:
        texts: List of text chunks
        metadatas: List of metadata for each chunk
        document_id: ID of the document these chunks belong to
        namespace: Pinecone namespace to use
        
    Returns:
        List of vector IDs created
    """
    from openai import OpenAI
    
    # Initialize OpenAI client
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Initialize Pinecone index
    index = get_pinecone_index()
    
    # Generate embeddings for all texts
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    
    embeddings = [embedding.embedding for embedding in response.data]
    
    # Prepare vectors for upserting to Pinecone
    vector_ids = []
    vectors = []
    
    for i, (text, metadata, embedding) in enumerate(zip(texts, metadatas, embeddings)):
        # Create a unique ID for this vector
        vector_id = f"doc_{document_id}_chunk_{i}"
        vector_ids.append(vector_id)
        
        # Add text to metadata for easier retrieval
        metadata["text"] = text
        metadata["document_id"] = document_id
        
        # Prepare vector tuple
        vector = (vector_id, embedding, metadata)
        vectors.append(vector)
    
    # Upsert vectors to Pinecone
    index.upsert(vectors=vectors, namespace=namespace)
    
    return vector_ids

def search_vectors(query: str, top_k: int = 5, namespace: str = "default") -> List[Dict[str, Any]]:
    """
    Search for similar vectors based on a query string
    
    Args:
        query: The query string
        top_k: Number of results to return
        namespace: Pinecone namespace to search in
        
    Returns:
        List of dictionaries containing search results
    """
    from openai import OpenAI
    
    # Initialize OpenAI client
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    # Initialize Pinecone index
    index = get_pinecone_index()
    
    # Generate embedding for query
    response = client.embeddings.create(
        input=[query],
        model="text-embedding-3-small"
    )
    
    query_embedding = response.data[0].embedding
    
    # Search in Pinecone
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=namespace
    )
    
    # Format results
    formatted_results = []
    for match in results.matches:
        formatted_results.append({
            "score": match.score,
            "text": match.metadata.get("text", ""),
            "document_id": match.metadata.get("document_id", ""),
            "document_title": match.metadata.get("document_title", ""),
            "page_number": match.metadata.get("page_number", ""),
        })
    
    return formatted_results

def delete_document_vectors(document_id: int, namespace: str = "default") -> bool:
    """
    Delete all vectors associated with a document
    
    Args:
        document_id: ID of the document to delete vectors for
        namespace: Pinecone namespace
        
    Returns:
        True if successful
    """
    # Initialize Pinecone index
    index = get_pinecone_index()
    
    # Delete vectors with document_id in metadata
    index.delete(
        filter={"document_id": document_id},
        namespace=namespace
    )
    
    return True 