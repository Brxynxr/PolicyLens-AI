import type { Document, DocumentListResponse } from '../types'
import api from './api'

export async function listarDocumentos(): Promise<DocumentListResponse> {
  const res = await api.get<DocumentListResponse>('/documents') as any
  return {
    total: res.total,
    documents: res.documents.sort((a: any, b: any) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
  }
}

export async function obtenerDocumento(id: number): Promise<Document | null> {
  try {
    const res = await api.get(`/documents/${id}`) as any
    return res ? { id: res.id, name: res.name, original_name: res.original_name, type: res.type, hash: res.hash, size: res.size, upload_date: res.upload_date, status: res.status } : null
  } catch {
    return null
  }
}

export async function subirDocumento(file: File, onProgress?: (percent: number) => void): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
  }) as any
  if (onProgress) onProgress(100)
  return res
}

export async function eliminarDocumento(id: number): Promise<void> {
  await api.delete(`/documents/${id}`)
}