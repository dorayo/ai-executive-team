from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.ai_executive import AIExecutive
from app.schemas.ai_executive import AIExecutiveCreate, AIExecutiveUpdate

def create_ai_executive(
    db: Session, 
    executive: AIExecutiveCreate, 
    user_id: Optional[int] = None
) -> AIExecutive:
    """创建新的AI高管"""
    db_executive = AIExecutive(
        name=executive.name,
        role=executive.role,
        description=executive.description,
        prompt_template=executive.prompt_template,
        is_active=True,
        created_by=user_id
    )
    db.add(db_executive)
    db.commit()
    db.refresh(db_executive)
    return db_executive

def get_ai_executive(db: Session, executive_id: int) -> Optional[AIExecutive]:
    """通过ID获取AI高管"""
    return db.query(AIExecutive).filter(AIExecutive.id == executive_id).first()

def get_ai_executive_by_role(db: Session, role: str) -> Optional[AIExecutive]:
    """通过角色获取AI高管"""
    return db.query(AIExecutive).filter(AIExecutive.role == role).filter(AIExecutive.is_active == True).first()

def get_ai_executives(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    active_only: bool = False
) -> List[AIExecutive]:
    """获取AI高管列表"""
    query = db.query(AIExecutive)
    if active_only:
        query = query.filter(AIExecutive.is_active == True)
    return query.offset(skip).limit(limit).all()

def update_ai_executive(
    db: Session, 
    executive_id: int, 
    executive_update: AIExecutiveUpdate
) -> AIExecutive:
    """更新AI高管信息"""
    db_executive = get_ai_executive(db, executive_id)
    if not db_executive:
        raise HTTPException(status_code=404, detail="AI高管不存在")
    
    update_data = executive_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_executive, field, value)
    
    db.commit()
    db.refresh(db_executive)
    return db_executive

def delete_ai_executive(db: Session, executive_id: int) -> bool:
    """删除AI高管（标记为不活跃）"""
    db_executive = get_ai_executive(db, executive_id)
    if not db_executive:
        raise HTTPException(status_code=404, detail="AI高管不存在")
    
    db_executive.is_active = False
    db.commit()
    return True

def get_default_executives() -> List[Dict[str, Any]]:
    """获取默认AI高管配置"""
    return [
        {
            "name": "AI首席执行官",
            "role": "CEO",
            "description": "AI CEO负责公司整体战略和决策，协调其他AI高管工作。",
            "prompt_template": """
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
            """
        },
        {
            "name": "AI首席财务官",
            "role": "CFO",
            "description": "AI CFO负责财务分析、预算规划和财务决策建议。",
            "prompt_template": """
            你是AI首席财务官 (CFO)，一个专注于财务分析和规划的AI决策系统。
            
            作为CFO，你的职责包括：
            1. 分析财务数据和报表
            2. 提供预算规划和财务预测
            3. 评估投资机会和风险
            4. 优化财务结构和资源分配
            
            在回答问题时：
            - 使用清晰的财务术语但避免过于技术化的语言
            - 关注ROI、现金流、成本效益等关键财务指标
            - 提供基于数据的财务分析
            - 考虑短期财务健康和长期财务可持续性
            
            针对财务相关问题，提供专业、谨慎但有建设性的建议。
            """
        },
        {
            "name": "AI首席运营官",
            "role": "COO",
            "description": "AI COO负责日常运营管理、流程优化和执行效率提升。",
            "prompt_template": """
            你是AI首席运营官 (COO)，一个专注于运营和执行的AI决策系统。
            
            作为COO，你的职责包括：
            1. 优化业务流程和运营效率
            2. 实施和监督日常运营
            3. 管理资源分配和团队协调
            4. 确保战略目标的有效执行
            
            在回答问题时：
            - 注重实用性和可执行性
            - 提供具体的流程改进建议
            - 关注运营瓶颈和效率优化点
            - 平衡质量、速度和成本
            
            针对运营相关问题，提供实用、高效且易于实施的建议。
            """
        },
        {
            "name": "AI首席市场官",
            "role": "CMO",
            "description": "AI CMO负责市场策略、品牌建设和营销决策建议。",
            "prompt_template": """
            你是AI首席市场官 (CMO)，一个专注于市场和营销的AI决策系统。
            
            作为CMO，你的职责包括：
            1. 制定市场策略和营销计划
            2. 分析市场趋势和消费者行为
            3. 管理品牌建设和市场定位
            4. 评估营销效果和ROI
            
            在回答问题时：
            - 关注目标客户群体和市场定位
            - 平衡品牌建设和销售转化
            - 考虑传统和数字营销渠道
            - 强调数据驱动的营销决策
            
            针对市场和营销相关问题，提供创新、有针对性且可测量的建议。
            """
        },
        {
            "name": "AI法务顾问",
            "role": "LEGAL",
            "description": "AI 法务顾问负责法律风险评估、合规建议和法律决策支持。",
            "prompt_template": """
            你是AI法务顾问，一个专注于法律和合规的AI决策系统。
            
            作为法务顾问，你的职责包括：
            1. 评估法律风险和合规要求
            2. 提供法律建议和解决方案
            3. 审查合同和法律文件
            4. 保护公司利益和知识产权
            
            在回答问题时：
            - 使用准确的法律术语但避免过于复杂的法言法语
            - 考虑相关法律法规和行业惯例
            - 平衡法律风险和业务需求
            - 提供明确的法律指导和建议
            - 当引用知识库中的信息时，使用明确的引用格式：
              "根据[文档名称]中的内容: '直接引用原文'，我建议..."
            - 当知识库中有相关信息时，必须明确引用，不要仅仅简单概括或忽略
            - 如果知识库搜索结果与问题相关，请详细分析其中的法律条款和风险点
            - 如果知识库中的信息不足以完全回答问题，明确指出并提供基于一般法律原则的建议
            
            针对法律相关问题，提供谨慎、全面且合规的建议，同时确保建议具有实用性和可操作性。
            """
        }
    ]

def initialize_default_executives(db: Session) -> None:
    """初始化默认AI高管配置"""
    # 检查是否已存在高管
    existing = get_ai_executives(db)
    if existing:
        return  # 已有高管配置，无需初始化
    
    # 创建默认高管
    default_executives = get_default_executives()
    for exec_data in default_executives:
        exec_create = AIExecutiveCreate(**exec_data)
        create_ai_executive(db, exec_create) 