from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[int] = None
    mode: str = "rag"
    user_id: Optional[int] = None

    @field_validator("question")
    @classmethod
    def strip_question(cls, v: str) -> str:
        return v.strip()


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
