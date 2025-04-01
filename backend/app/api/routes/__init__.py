from fastapi import APIRouter
from app.api.routes import users, auth, ai_executives, documents, conversations

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["authentication"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(ai_executives.router, prefix="/executives", tags=["ai-executives"])
router.include_router(documents.router, prefix="/documents", tags=["documents"])
router.include_router(conversations.router, prefix="/conversations", tags=["conversations"]) 