"""
Pinecone向量存储修复脚本 - 检查配置并初始化索引
"""
import os
import sys
import requests
import json

sys.path.append(os.path.abspath('.'))
from app.core.config import settings

def main():
    """检查Pinecone配置并初始化索引"""
    print("开始检查Pinecone配置...")
    
    # 检查API密钥是否配置
    if not settings.PINECONE_API_KEY:
        print("错误: 未配置Pinecone API密钥")
        return
    
    print(f"使用API密钥: {settings.PINECONE_API_KEY[:5]}...{settings.PINECONE_API_KEY[-5:]}")
    print(f"索引名称: {settings.PINECONE_INDEX_NAME}")
    
    # 使用REST API直接创建索引
    try:
        # 列出现有索引
        headers = {
            "Api-Key": settings.PINECONE_API_KEY,
            "Accept": "application/json"
        }
        
        response = requests.get(
            "https://api.pinecone.io/indexes",
            headers=headers
        )
        
        if response.status_code != 200:
            print(f"无法获取索引列表: {response.status_code} {response.text}")
            return
            
        response_data = response.json()
        index_list = response_data.get("indexes", [])
        print(f"当前索引列表: {index_list}")
        
        # 检查索引是否存在
        index_exists = any(index.get("name") == settings.PINECONE_INDEX_NAME for index in index_list)
        if index_exists:
            print(f"索引 {settings.PINECONE_INDEX_NAME} 已存在")
            
            # 询问是否重新创建
            answer = input("是否要删除并重新创建索引？(y/n): ")
            if answer.lower() == 'y':
                print(f"正在删除索引 {settings.PINECONE_INDEX_NAME}...")
                
                response = requests.delete(
                    f"https://api.pinecone.io/indexes/{settings.PINECONE_INDEX_NAME}",
                    headers=headers
                )
                
                if response.status_code >= 200 and response.status_code < 300:
                    print("索引已删除")
                else:
                    print(f"删除索引失败: {response.status_code} {response.text}")
                    return
            else:
                print("保留现有索引")
                return
        
        # 创建新索引 - 使用starter环境（免费计划）
        print(f"正在创建索引 {settings.PINECONE_INDEX_NAME}...")
        
        # 创建索引请求
        create_request = {
            "name": settings.PINECONE_INDEX_NAME,
            "dimension": 1536,  # OpenAI embeddings 维度
            "metric": "cosine",
            "spec": {
                "serverless": {
                    "cloud": "aws",
                    "region": "us-east-1"
                }
            }
        }
        
        response = requests.post(
            "https://api.pinecone.io/indexes",
            headers={**headers, "Content-Type": "application/json"},
            data=json.dumps(create_request)
        )
        
        if response.status_code >= 200 and response.status_code < 300:
            print("索引创建成功!")
        else:
            print(f"创建索引失败: {response.status_code} {response.text}")
            return
            
        # 验证索引是否可用 - 等待索引就绪
        print("等待索引就绪...")
        import time
        # 最多等待2分钟
        for i in range(12):
            response = requests.get(
                f"https://api.pinecone.io/indexes/{settings.PINECONE_INDEX_NAME}",
                headers=headers
            )
            
            if response.status_code == 200:
                status = response.json().get("status", {})
                if status.get("ready"):
                    print(f"索引已就绪: {response.json()}")
                    print("Pinecone索引已成功配置并可用")
                    return
                else:
                    print(f"索引状态: {status}, 继续等待...")
                    
            time.sleep(10)  # 等待10秒再检查
        
        print("索引创建后未能在预期时间内就绪")
    except Exception as e:
        print(f"Pinecone配置过程中发生错误: {str(e)}")

if __name__ == "__main__":
    main() 