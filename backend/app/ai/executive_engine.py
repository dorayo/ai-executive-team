from typing import List, Dict, Any, Optional
from crewai import Agent, Task, Crew, Process
from crewai.tools import tool
from langchain_core.tools import Tool
from langchain_community.utilities import GoogleSearchAPIWrapper
from langchain_core.tools import tool as langchain_tool
from langchain_openai import ChatOpenAI

import logging
import json
import os
from datetime import datetime

from app.core.config import settings
from app.models.ai_executive import AIExecutive
from app.models.document import Document
from app.knowledge.vector_store import search_vectors

logger = logging.getLogger(__name__)

class ExecutiveEngine:
    """AI执行团队引擎"""
    
    def __init__(
        self,
        executives: List[AIExecutive],
        user_id: Optional[int] = None,
        conversation_id: Optional[int] = None
    ):
        """
        初始化AI执行团队引擎
        
        Args:
            executives: AI高管列表
            user_id: 用户ID
            conversation_id: 对话ID
        """
        self.executives = executives
        self.user_id = user_id
        self.conversation_id = conversation_id
        self.agents = {}
        self.tools = self._setup_tools()
        
        # 初始化高管代理
        for exec in executives:
            self.agents[exec.role] = self._create_agent(exec)
    
    def _setup_tools(self) -> List[Tool]:
        """设置工具列表"""
        tools = []
        
        # 搜索知识库工具
        @tool
        def search_knowledge_base(query: str) -> str:
            """在知识库中搜索相关信息"""
            try:
                if not settings.PINECONE_API_KEY:
                    return "未配置向量检索API，无法搜索知识库。"
                
                results = search_vectors(query, top_k=3)
                if not results:
                    return "未找到相关信息。"
                
                formatted_results = []
                for i, result in enumerate(results):
                    formatted_results.append(
                        f"{i+1}. 文档: {result['document_title']}\n"
                        f"   相关度: {result['score']:.2f}\n"
                        f"   内容: {result['text']}\n"
                    )
                
                return "\n".join(formatted_results)
            except Exception as e:
                logger.error(f"知识库搜索失败: {str(e)}")
                return f"知识库搜索错误: {str(e)}"
        
        # 日期工具
        @tool
        def get_current_date() -> str:
            """获取当前日期和时间"""
            return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 将工具添加到列表
        tools = [search_knowledge_base, get_current_date]
        
        return tools
    
    def _create_agent(self, executive: AIExecutive) -> Agent:
        """创建AI高管代理"""
        # 设置默认LLM
        llm = ChatOpenAI(
            model_name=settings.OPENAI_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            temperature=0.7
        )
        
        return Agent(
            role=executive.name,
            goal=f"作为{executive.role}，提供最佳的专业建议和决策",
            backstory=executive.description,
            verbose=True,
            allow_delegation=True,
            tools=self.tools,
            llm=llm,
            system_prompt=executive.prompt_template,
        )
    
    def _create_crew(self) -> Crew:
        """创建AI执行团队"""
        # 确保CEO代理存在
        if "CEO" not in self.agents:
            raise ValueError("缺少CEO高管配置")
        
        # 设置管理LLM
        manager_llm = ChatOpenAI(
            model_name=settings.OPENAI_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            temperature=0.7
        )
        
        crew = Crew(
            agents=list(self.agents.values()),
            verbose=True,
            process=Process.sequential,
            manager_llm=manager_llm,
        )
        
        return crew
    
    def _create_task(self, query: str, agent_role: str) -> Task:
        """创建任务"""
        agent = self.agents.get(agent_role)
        if not agent:
            raise ValueError(f"未找到{agent_role}角色的代理")
        
        return Task(
            description=query,
            agent=agent,
            expected_output="详细的分析和回答",
        )
    
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """分析用户查询，确定应由哪个高管处理"""
        try:
            # 检查是否配置了OpenAI API密钥
            if not settings.OPENAI_API_KEY:
                return {
                    "primary_role": "CEO",
                    "secondary_roles": [],
                    "reasoning": "未配置API密钥，默认由CEO处理"
                }
            
            from openai import OpenAI
            
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": """
                    你是一个查询分析器，负责确定用户的问题应该由哪个AI高管来回答。
                    
                    可用的高管角色有:
                    - CEO: 处理整体战略、公司发展方向和宏观决策的问题
                    - CFO: 处理财务、投资、融资和预算相关的问题
                    - COO: 处理日常运营、流程优化和执行效率相关的问题
                    - CMO: 处理市场、营销、品牌建设和销售策略相关的问题
                    - LEGAL: 处理法律、合规、风险管理和合同相关的问题
                    
                    分析用户的查询，返回一个JSON格式的回答，必须包含以下字段:
                    1. primary_role: 最适合回答的高管角色
                    2. secondary_roles: 可能需要咨询的其他高管角色列表
                    3. reasoning: 为什么选择这个高管角色的简短理由
                    
                    你的回答必须是有效的JSON格式。
                    """},
                    {"role": "user", "content": query}
                ]
            )
            
            try:
                # 尝试解析JSON响应
                result = json.loads(response.choices[0].message.content)
                return {
                    "primary_role": result.get("primary_role", "CEO"),
                    "secondary_roles": result.get("secondary_roles", []),
                    "reasoning": result.get("reasoning", "")
                }
            except json.JSONDecodeError:
                # 如果解析失败，提取CEO角色
                content = response.choices[0].message.content
                logger.warning(f"无法解析JSON响应: {content}")
                return {
                    "primary_role": "CEO",
                    "secondary_roles": [],
                    "reasoning": "无法解析AI分析，默认由CEO处理"
                }
        except Exception as e:
            logger.error(f"查询分析失败: {str(e)}")
            # 默认返回CEO
            return {
                "primary_role": "CEO",
                "secondary_roles": [],
                "reasoning": "分析失败，默认由CEO处理"
            }
    
    async def process_query(self, query: str) -> Dict[str, Any]:
        """处理用户查询，返回AI高管团队的回答"""
        try:
            # 分析查询应由哪个高管处理
            analysis = self.analyze_query(query)
            primary_role = analysis["primary_role"]
            secondary_roles = analysis["secondary_roles"]
            
            # 创建主要任务
            task = self._create_task(query, primary_role)
            
            # 创建包含任务的执行团队
            # 确保CEO代理存在
            if "CEO" not in self.agents:
                raise ValueError("缺少CEO高管配置")
            
            # 设置管理LLM
            manager_llm = ChatOpenAI(
                model_name=settings.OPENAI_MODEL,
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.7
            )
            
            # 直接在创建 Crew 时设置任务
            crew = Crew(
                agents=list(self.agents.values()),
                tasks=[task],  # 直接将任务列表传递给构造函数
                verbose=True,
                process=Process.sequential,
                manager_llm=manager_llm,
            )
            
            # 运行任务，不带参数
            result = crew.kickoff()
            
            return {
                "response": result,
                "primary_role": primary_role,
                "secondary_roles": secondary_roles,
                "reasoning": analysis["reasoning"]
            }
        except Exception as e:
            logger.error(f"处理查询失败: {str(e)}")
            # 检查是否配置了OpenAI API密钥
            if not settings.OPENAI_API_KEY:
                return {
                    "response": "抱歉，系统尚未配置AI服务所需的API密钥。请联系管理员配置OpenAI API密钥。",
                    "primary_role": "CEO",
                    "secondary_roles": [],
                    "reasoning": "未配置API密钥"
                }
            
            # 直接使用OpenAI回退
            try:
                from openai import OpenAI
                
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                
                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": """
                        你是AI首席执行官 (CEO)，一个全面负责公司的AI决策系统。
                        
                        作为CEO，你的职责包括：
                        1. 分析公司情况和市场，制定整体战略
                        2. 整合其他AI高管的见解和建议
                        3. 做出最终决策和判断
                        4. 与用户进行清晰、有效的沟通
                        
                        在回答问题时：
                        - 保持专业、自信但友好的语气
                        - 给出具体、可行的建议，不要过于理论化
                        - 考虑公司的整体利益和长期发展
                        - 注重执行效率和实用性
                        
                        综合所有可用信息，提供最佳的战略建议和决策方向。
                        """},
                        {"role": "user", "content": query}
                    ]
                )
                
                return {
                    "response": response.choices[0].message.content,
                    "primary_role": "CEO",
                    "secondary_roles": [],
                    "reasoning": "由于AI执行团队处理失败，由CEO直接回答"
                }
            except Exception as fallback_e:
                logger.error(f"回退处理也失败: {str(fallback_e)}")
                return {
                    "response": f"很抱歉，处理您的请求时出现了技术问题: {str(e)}",
                    "primary_role": "SYSTEM",
                    "secondary_roles": [],
                    "reasoning": "系统错误"
                } 