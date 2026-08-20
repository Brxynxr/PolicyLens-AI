from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[int] = None
    mode: str = "rag"


class SourceItem(BaseModel):
    document: str
    page: int
    section: str
    content: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceItem]
    conversation_id: Optional[int] = None


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: int
    created_at: datetime
    messages: List[MessageResponse]

    model_config = ConfigDict(from_attributes=True)


class ConversationListResponse(BaseModel):
    total: int
    conversations: List[ConversationResponse]
