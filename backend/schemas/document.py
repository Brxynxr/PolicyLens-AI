from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DocumentBase(BaseModel):
    name: str
    original_name: str
    type: str
    size: int
    status: str = "processed"


class DocumentCreate(DocumentBase):
    hash: str


class DocumentResponse(DocumentBase):
    id: int
    hash: str
    upload_date: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentListResponse(BaseModel):
    total: int
    documents: List[DocumentResponse]


class SyncFileDetail(BaseModel):
    filename: str
    hash: str
    status: str  # "added", "updated", "unchanged", "error"
    message: Optional[str] = None


class SyncSummaryResponse(BaseModel):
    added: List[str]
    updated: List[str]
    unchanged: List[str]
    errors: List[str]
    total_processed: int
    details: List[SyncFileDetail] = []


class ReindexFileDetail(BaseModel):
    archivo: str
    chunks: int


class ReindexSummaryResponse(BaseModel):
    chunks_antes: int
    registros_eliminados_sqlite: int
    archivos_procesados: List[ReindexFileDetail]
    total_chunks: int
    errores: List[str]
