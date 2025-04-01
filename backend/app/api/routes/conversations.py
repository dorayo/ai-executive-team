from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session

from app.api import deps
from app.services.conversation import (
    create_conversation,
    get_conversation,
    get_conversations,
    update_conversation,
    delete_conversation,
    get_messages,
    process_user_message
)
from app.schemas.conversation import (
    Conversation,
    ConversationCreate,
    ConversationUpdate,
    ConversationWithMessages,
    Message,
    MessageRequest,
    MessageProcessResponse,
    MessageResponse,
    TaskCreate
)
from app.models.user import User
from app.services.ai_executive import get_ai_executive

router = APIRouter()

@router.post("/", response_model=Conversation)
async def create_new_conversation(
    *,
    db: Session = Depends(deps.get_db),
    conversation_in: ConversationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    创建新对话
    """
    conversation = await create_conversation(
        db=db, 
        obj_in=conversation_in, 
        user_id=current_user.id
    )
    return conversation

@router.get("/", response_model=List[Conversation])
def read_conversations(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    获取当前用户的所有对话
    """
    conversations = get_conversations(
        db=db, user_id=current_user.id, skip=skip, limit=limit
    )
    return conversations

@router.get("/{conversation_id}", response_model=ConversationWithMessages)
def read_conversation(
    *,
    db: Session = Depends(deps.get_db),
    conversation_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    获取对话详情和消息列表
    """
    conversation = get_conversation(db=db, conversation_id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限访问此对话")
    
    # 获取对话相关的所有消息
    messages = get_messages(db=db, conversation_id=conversation_id)
    
    # 构建包含发送者信息的消息响应
    message_responses = []
    for msg in messages:
        sender_name = None
        sender_role = None
        
        if msg.sender_type == "AI":
            # 如果是AI消息，获取对应的AI高管信息
            ai_executive = get_ai_executive(db=db, executive_id=msg.sender_id)
            if ai_executive:
                sender_name = ai_executive.name
                sender_role = ai_executive.role
        elif msg.sender_type == "USER":
            # 如果是用户消息，使用用户名
            sender_name = current_user.full_name or current_user.email
        
        message_responses.append(
            MessageResponse(
                id=msg.id,
                content=msg.content,
                sender_type=msg.sender_type,
                sender_id=msg.sender_id,
                sender_name=sender_name,
                sender_role=sender_role,
                created_at=msg.created_at
            )
        )
    
    # 创建包含消息的对话响应
    conversation_with_messages = ConversationWithMessages(
        id=conversation.id,
        title=conversation.title,
        user_id=conversation.user_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        messages=message_responses
    )
    
    return conversation_with_messages

@router.put("/{conversation_id}", response_model=Conversation)
def update_existing_conversation(
    *,
    db: Session = Depends(deps.get_db),
    conversation_id: int,
    conversation_in: ConversationUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    更新对话信息
    """
    conversation = get_conversation(db=db, conversation_id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限更新此对话")
    
    conversation = update_conversation(
        db=db, db_obj=conversation, obj_in=conversation_in
    )
    return conversation

@router.delete("/{conversation_id}", response_model=bool)
def delete_existing_conversation(
    *,
    db: Session = Depends(deps.get_db),
    conversation_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    删除对话
    """
    conversation = get_conversation(db=db, conversation_id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    if conversation.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="没有权限删除此对话")
    
    result = delete_conversation(db=db, conversation_id=conversation_id)
    return result

@router.post("/{conversation_id}/messages", response_model=MessageProcessResponse)
async def send_message(
    *,
    db: Session = Depends(deps.get_db),
    conversation_id: int,
    message_in: MessageRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    在对话中发送消息并获取AI执行团队的回复
    """
    conversation = get_conversation(db=db, conversation_id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限在此对话中发送消息")
    
    # 处理用户消息并获取AI回复
    result = await process_user_message(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        content=message_in.content
    )
    
    return result

@router.post("/{conversation_id}/task", response_model=MessageProcessResponse)
async def submit_task(
    *,
    db: Session = Depends(deps.get_db),
    conversation_id: int,
    task_in: TaskCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    向AI CEO提交任务描述
    """
    conversation = get_conversation(db=db, conversation_id=conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="没有权限在此对话中提交任务")
    
    # 使用普通消息处理函数来处理任务
    result = await process_user_message(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        content=task_in.task_description
    )
    
    return result 