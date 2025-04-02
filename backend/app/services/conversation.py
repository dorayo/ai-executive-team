from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.conversation import Conversation, Message, SenderType
from app.models.user import User
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    MessageCreate
)
from app.ai.executive_engine import ExecutiveEngine
from app.services.ai_executive import get_ai_executives, get_ai_executive_by_role

async def create_conversation(
    db: Session, 
    obj_in: ConversationCreate,
    user_id: int
) -> Conversation:
    """创建新的对话"""
    db_obj = Conversation(
        title=obj_in.title,
        user_id=user_id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_conversation(db: Session, conversation_id: int) -> Optional[Conversation]:
    """获取对话详情"""
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()

def get_conversations(
    db: Session, 
    user_id: int, 
    skip: int = 0, 
    limit: int = 100
) -> List[Conversation]:
    """获取用户的所有对话"""
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def update_conversation(
    db: Session, 
    db_obj: Conversation, 
    obj_in: ConversationUpdate
) -> Conversation:
    """更新对话信息"""
    update_data = obj_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_conversation(db: Session, conversation_id: int) -> bool:
    """删除对话"""
    conversation = get_conversation(db, conversation_id)
    if conversation:
        # 先删除所有相关消息
        db.query(Message).filter(Message.conversation_id == conversation_id).delete()
        # 再删除对话
        db.delete(conversation)
        db.commit()
        return True
    return False

async def create_message(
    db: Session, 
    obj_in: MessageCreate,
    conversation_id: int
) -> Message:
    """创建新消息"""
    db_obj = Message(
        conversation_id=conversation_id,
        content=obj_in.content,
        sender_type=obj_in.sender_type,
        sender_id=obj_in.sender_id,
        created_at=datetime.now()
    )
    db.add(db_obj)
    
    # 更新对话的最后更新时间
    conversation = get_conversation(db, conversation_id)
    if conversation:
        conversation.updated_at = datetime.now()
        db.add(conversation)
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_messages(
    db: Session, 
    conversation_id: int, 
    skip: int = 0, 
    limit: int = 100
) -> List[Message]:
    """获取对话的所有消息"""
    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )

async def process_user_message(
    db: Session,
    conversation_id: int,
    user_id: int,
    content: str
) -> Dict[str, Any]:
    """
    处理用户消息，获取AI执行团队的回复
    
    步骤：
    1. 存储用户消息
    2. 使用AI执行引擎处理用户查询
    3. 存储AI回复
    4. 返回处理结果
    """
    # 限制用户输入长度
    if len(content) > 8000:
        content = content[:8000] + "... [内容过长，已截断]"
    
    # 创建用户消息
    user_message = await create_message(
        db=db,
        obj_in=MessageCreate(
            content=content,
            sender_type=SenderType.USER,
            sender_id=user_id
        ),
        conversation_id=conversation_id
    )
    
    # 获取所有活跃的AI高管
    executives = get_ai_executives(db, active_only=True)
    
    # 初始化AI执行引擎
    engine = ExecutiveEngine(
        executives=executives,
        user_id=user_id,
        conversation_id=conversation_id
    )
    
    try:
        # 处理用户查询
        response = await engine.process_query(content)
        
        # 确定回复的AI高管
        primary_role = response.get("primary_role")
        ai_executive = get_ai_executive_by_role(db, primary_role)
        
        if not ai_executive:
            # 如果找不到主要角色，使用CEO
            ai_executive = get_ai_executive_by_role(db, "CEO")
        
        if not ai_executive:
            # 如果仍找不到，使用一个默认ID
            ai_executive_id = 1
        else:
            ai_executive_id = ai_executive.id
        
        # 获取AI回复内容
        ai_response = response.get("response", "很抱歉，无法处理您的请求")
        
        # 确保AI回复是字符串
        if not isinstance(ai_response, str):
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"AI回复不是字符串类型: {type(ai_response)}")
            # 强制转换为字符串
            ai_response = str(ai_response)
        
        # 限制回复长度
        if len(ai_response) > 24000:
            ai_response = ai_response[:24000] + "\n\n[回复过长，部分内容已被截断]"
        
        # 创建AI回复消息
        ai_message = await create_message(
            db=db,
            obj_in=MessageCreate(
                content=ai_response,
                sender_type=SenderType.AI,
                sender_id=ai_executive_id
            ),
            conversation_id=conversation_id
        )
        
        # 获取对话信息
        conversation = get_conversation(db, conversation_id)
        
        # 获取对话中的消息数量
        message_count = db.query(Message).filter(Message.conversation_id == conversation_id).count()
        
        # 如果这是第一组消息（用户消息+AI回复，共2条消息），并且标题是默认的"新对话"或为空
        is_first_message = message_count <= 2
        
        # 如果是第一组消息，根据内容生成标题
        if is_first_message and (conversation.title == "新对话" or not conversation.title):
            # 使用用户输入的前20个字符作为标题基础
            new_title = content[:20] + "..."
            
            # 更新对话标题
            update_conversation(
                db=db,
                db_obj=conversation,
                obj_in=ConversationUpdate(title=new_title)
            )
        
        return {
            "user_message": user_message,
            "ai_message": ai_message,
            "primary_role": primary_role,
            "secondary_roles": response.get("secondary_roles", []),
            "reasoning": response.get("reasoning", ""),
            "title_updated": is_first_message and (conversation.title == "新对话" or not conversation.title),
            "new_title": new_title if is_first_message and (conversation.title == "新对话" or not conversation.title) else None
        }
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"处理用户消息时出错: {str(e)}")
        
        # 确定使用的AI高管 - 出错时默认使用CEO
        ai_executive = get_ai_executive_by_role(db, "CEO")
        ai_executive_id = ai_executive.id if ai_executive else 1
        
        # 创建错误回复消息
        error_message = f"很抱歉，处理您的请求时遇到了错误: {str(e)[:200]}"
        ai_message = await create_message(
            db=db,
            obj_in=MessageCreate(
                content=error_message,
                sender_type=SenderType.AI,
                sender_id=ai_executive_id
            ),
            conversation_id=conversation_id
        )
        
        return {
            "user_message": user_message,
            "ai_message": ai_message,
            "primary_role": "CEO",
            "secondary_roles": [],
            "reasoning": "处理失败，默认由CEO响应",
            "title_updated": False,
            "new_title": None
        } 