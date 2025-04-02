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
from app.knowledge.vector_store import search_vectors, get_vector_store_status

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
                # 检查向量存储状态
                vector_status = get_vector_store_status()
                if vector_status["status"] != "ok":
                    return f"向量数据库状态: {vector_status['status']}，暂时无法搜索知识库。{vector_status.get('error', '')}"
                
                # 限制查询长度
                if len(query) > 200:
                    query = query[:200] + "..."
                    logger.warning(f"搜索查询过长，已截断至200字符")
                
                # 执行搜索
                results = search_vectors(query, top_k=3)  # 增加到3个结果
                if not results:
                    return "未找到相关信息。您可以尝试换一种方式提问，或者确认知识库中是否有相关文档。"
                
                # 将结果按文档类型分组
                main_content_results = []
                attachment_results = []
                
                for result in results:
                    if result.get("is_attachment", False):
                        attachment_results.append(result)
                    else:
                        main_content_results.append(result)
                
                # 格式化结果
                formatted_results = []
                
                # 先处理主文档内容
                for i, result in enumerate(main_content_results):
                    # 计算匹配度百分比
                    score_percent = int(result["score"] * 100)
                    
                    # 获取文档标题和文本
                    doc_title = result.get("document_title", "未知文档")
                    text = result.get("text", "").strip()
                    
                    # 添加页码信息（如果有）
                    page_info = ""
                    if result.get("page_number"):
                        page_info = f"页码: {result.get('page_number')}"
                    
                    # 使用更明确的引用格式
                    formatted_result = f"""引用 #{i+1} - {doc_title} (正文) (匹配度: {score_percent}%){' - ' + page_info if page_info else ''}
```
{text}
```

"""
                    formatted_results.append(formatted_result)
                
                # 然后处理附件内容
                for i, result in enumerate(attachment_results):
                    # 计算匹配度百分比
                    score_percent = int(result["score"] * 100)
                    
                    # 获取文档标题和文本
                    doc_title = result.get("document_title", "未知文档")
                    text = result.get("text", "").strip()
                    
                    # 添加页码信息（如果有）
                    page_info = ""
                    if result.get("page_number"):
                        page_info = f"页码: {result.get('page_number')}"
                    
                    # 使用更明确的引用格式，特别标注为附件内容
                    formatted_result = f"""引用 #{i+1+len(main_content_results)} - {doc_title} (附件内容) (匹配度: {score_percent}%){' - ' + page_info if page_info else ''}
```
{text}
```

"""
                    formatted_results.append(formatted_result)
                
                # 构建更详细的响应
                response = "我在知识库中找到了以下相关信息：\n\n" + "\n".join(formatted_results)
                
                if len(results) > 0 and results[0]["score"] < 0.75:
                    response += "\n\n注意: 这些信息的匹配度较低，请在使用时结合上下文进行判断。"
                
                response += "\n\n在回答时，请直接引用上述信息并明确标明引用来源，不要只是简单复述。正文和附件内容都很重要，请全面分析所有相关内容。如果信息不足以回答问题，请明确说明。"
                
                return response
                
            except Exception as e:
                logger.error(f"知识库搜索失败: {str(e)}")
                return f"搜索错误: {str(e)[:100]}。请稍后再试。"
        
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
            temperature=0.5,  # 降低温度使回答更确定性
            max_tokens=16384  # 增加最大token数量
        )
        
        # 构建增强系统提示
        system_prompt = f"""
{executive.prompt_template}

重要指引：
1. 当使用知识库搜索时，对搜索结果进行深入分析，不要简单复述
2. 引用知识库时，使用明确格式："根据[文档名]：'[引用的文本]'"
3. 即使匹配度不高，也应分析知识库中可能相关的内容，说明其关联性
4. 如果知识库中没有相关信息，明确说明并基于你的专业知识提供建议
5. 回答要简明扼要但内容充实，重点突出，逻辑清晰
6. 避免空洞的表述和过度冗长的内容
7. 提供具体、可执行的建议和明确的结论
"""
        
        # 确保系统提示不会过长
        if len(system_prompt) > 2000:
            logger.warning(f"系统提示过长，已截断（原长度：{len(system_prompt)}）")
            system_prompt = system_prompt[:2000] + "..."
        
        return Agent(
            role=executive.name,
            goal=f"作为{executive.role}，提供最佳的专业建议和决策",
            backstory=executive.description[:300],  # 进一步限制背景故事的长度
            verbose=True,
            allow_delegation=True,
            tools=self.tools,
            llm=llm,
            system_prompt=system_prompt,
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
            temperature=0.5,  # 降低温度使输出更确定
            max_tokens=4000  # 增加max_tokens量
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
            # 更积极地限制查询长度
            if len(query) > 8000:
                logger.warning(f"查询长度超过8000字符，已截断（原长度：{len(query)}）")
                query = query[:8000] + "... [查询内容已截断]"
            
            # 获取对话历史记录（如果有对话ID）
            conversation_context = ""
            if self.conversation_id:
                try:
                    from app.services.conversation import get_messages
                    from app.db.session import SessionLocal
                    
                    # 创建数据库会话
                    db = SessionLocal()
                    try:
                        # 获取最近的5条消息作为上下文
                        messages = get_messages(db, self.conversation_id, skip=0, limit=10)
                        if messages and len(messages) > 1:  # 确保有历史消息
                            # 构建对话历史上下文，最多取最近5轮对话
                            recent_messages = messages[-10:]  # 最近的10条消息
                            history_pairs = []
                            
                            # 整理成对话对
                            for i in range(0, len(recent_messages)-1, 2):
                                if i+1 < len(recent_messages):
                                    user_msg = recent_messages[i]
                                    ai_msg = recent_messages[i+1]
                                    if user_msg.sender_type == "USER" and ai_msg.sender_type == "AI":
                                        history_pairs.append({
                                            "user": user_msg.content[:300],  # 限制长度
                                            "ai": ai_msg.content[:500]  # 限制长度
                                        })
                            
                            # 构建上下文文本
                            if history_pairs:
                                context_parts = ["以下是之前的对话历史（仅供参考）："]
                                for i, pair in enumerate(history_pairs):
                                    context_parts.append(f"用户: {pair['user']}")
                                    context_parts.append(f"AI: {pair['ai']}")
                                context_parts.append("\n现在，请回答用户的新问题。")
                                conversation_context = "\n\n".join(context_parts)
                                
                                # 限制上下文长度
                                if len(conversation_context) > 8000:
                                    conversation_context = conversation_context[:8000] + "\n...[历史记录已截断]"
                                
                                logger.info(f"为查询添加了 {len(history_pairs)} 轮对话历史上下文")
                    finally:
                        db.close()
                except Exception as e:
                    logger.error(f"获取对话历史失败: {str(e)}")
                    # 忽略错误，继续处理查询
            
            # 分析查询应由哪个高管处理
            analysis = self.analyze_query(query)
            primary_role = analysis["primary_role"]
            secondary_roles = analysis["secondary_roles"]
            
            # 创建主要任务，明确任务的预期输出
            task_description = f"""
            请处理以下问题并提供专业回答：
            
            {query}
            
            要求：
            1. 务必先使用search_knowledge_base工具搜索相关信息
            2. 当发现相关信息时，明确引用知识库内容，使用格式：'根据[文档名]：[引用内容]'
            3. 基于知识库内容进行详细分析，不要简单复述
            4. 重要：同时分析正文和附件内容，不要忽略附件中的关键信息
            5. 如果用户询问附件内容，请特别关注标记为"附件内容"的引用部分
            6. 回答应内容充实，重点突出，逻辑清晰，对于复杂问题可适当增加篇幅（1000-2000字）
            7. 如果无法找到相关信息，请明确指出并给出基于专业知识的建议
            """
            
            # 如果有对话历史上下文，添加到任务描述中
            if conversation_context:
                task_description = f"""
                {conversation_context}
                
                {task_description}
                """
            
            task = Task(
                description=task_description,
                agent=self.agents.get(primary_role),
                expected_output="基于知识库信息的专业分析，包含具体引用和明确建议",
            )
            
            # 设置管理LLM
            manager_llm = ChatOpenAI(
                model_name=settings.OPENAI_MODEL,
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.5,  # 降低温度使输出更确定
                max_tokens=4000  # 增加max_tokens量
            )
            
            # 创建精简的代理列表，优先使用主要角色
            focused_agents = []
            # 添加主要角色的代理
            if primary_role in self.agents:
                focused_agents.append(self.agents[primary_role])
            else:
                # 如果找不到主要角色，使用CEO
                focused_agents.append(self.agents["CEO"])
            
            # 添加次要角色代理（但控制数量）
            for role in secondary_roles[:1]:  # 最多添加1个次要角色
                if role in self.agents and role not in [agent.role for agent in focused_agents]:
                    focused_agents.append(self.agents[role])
            
            # 创建精简的执行团队
            crew = Crew(
                agents=focused_agents,
                tasks=[task],
                verbose=True,
                process=Process.sequential,
                manager_llm=manager_llm,
            )
            
            # 运行任务
            result = crew.kickoff()
            
            # 确保结果是字符串
            response_text = str(result) if result else "很抱歉，无法处理您的请求"
            
            # 限制响应长度，但允许更长的回复
            if len(response_text) > 24000:
                logger.warning(f"响应长度超过24000字符，已截断（原长度：{len(response_text)}）")
                response_text = response_text[:24000] + "\n\n[响应过长，部分内容已被截断]"
            
            return {
                "response": response_text,
                "primary_role": primary_role,
                "secondary_roles": secondary_roles,
                "reasoning": analysis["reasoning"]
            }
        except Exception as e:
            logger.error(f"处理查询失败: {str(e)}")
            return {
                "response": f"很抱歉，处理您的查询时遇到了错误: {str(e)}",
                "primary_role": "CEO",
                "secondary_roles": [],
                "reasoning": "处理失败，默认由CEO响应"
            } 