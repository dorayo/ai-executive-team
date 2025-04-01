import logging
from sqlalchemy.orm import Session

from app.services.ai_executive import initialize_default_executives
from app.api.deps import get_db

logger = logging.getLogger(__name__)

def init_app_data():
    """
    应用启动时初始化必要的数据
    - 初始化默认AI高管
    """
    logger.info("初始化应用数据")
    
    # 使用数据库会话初始化数据
    db = next(get_db())
    try:
        # 初始化默认AI高管
        initialize_default_executives(db)
        logger.info("初始化默认AI高管完成")
    except Exception as e:
        logger.error(f"初始化数据失败: {str(e)}")
        raise
    finally:
        db.close() 