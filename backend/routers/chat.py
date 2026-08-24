from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    ConversationListResponse,
    SourceItem,
)
from backend.services.rag import RAGService
from backend.models.conversation import Conversation

router = APIRouter()

rag_service = RAGService()


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Envía una pregunta y recibe una respuesta basada en los documentos indexados (modo síncrono).
    """
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La pregunta no puede estar vacía."
        )

    try:
        resultado = rag_service.preguntar(
            pregunta=request.question,
            db=db,
            conversation_id=request.conversation_id,
            mode=request.mode,
            user_id=request.user_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la pregunta: {str(e)}"
        )

    sources = [SourceItem(**s) for s in resultado["sources"]]

    return ChatResponse(
        answer=resultado["answer"],
        sources=sources,
        conversation_id=resultado["conversation_id"]
    )


@router.post("/stream")
def chat_stream(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Envía una pregunta y recibe una respuesta en tiempo real (Server-Sent Events streaming).
    """
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La pregunta no puede estar vacía."
        )

    return StreamingResponse(
        rag_service.preguntar_stream(
            pregunta=request.question,
            db=db,
            conversation_id=request.conversation_id,
            mode=request.mode,
            user_id=request.user_id
        ),
        media_type="text/event-stream"
    )


@router.get("/conversations", response_model=ConversationListResponse)
def get_conversations(user_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """
    Lista las conversaciones. Si se envía user_id, filtra solo las de ese usuario.
    """
    query = db.query(Conversation)
    if user_id is not None:
        query = query.filter(Conversation.user_id == user_id)
    convs = query.order_by(Conversation.id.desc()).all()

    conversations = []
    for conv in convs:
        conv_data = ConversationResponse.model_validate(conv)
        conversations.append(conv_data)

    return ConversationListResponse(
        total=len(conversations),
        conversations=conversations
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Obtiene una conversación específica con todos sus mensajes.
    Si se envía user_id, solo la devuelve si pertenece a ese usuario.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or (user_id is not None and conv.user_id not in (None, user_id)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversación con ID {conversation_id} no encontrada."
        )
    return ConversationResponse.model_validate(conv)


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Elimina una conversación y todos sus mensajes.
    Si se envía user_id, solo elimina si pertenece a ese usuario.
    """
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv or (user_id is not None and conv.user_id not in (None, user_id)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversación con ID {conversation_id} no encontrada."
        )
    db.delete(conv)
    db.commit()
    return {"message": f"Conversación {conversation_id} eliminada."}
