import type { Document, DocumentListResponse } from '../types'
import api from './api'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function listarDocumentos(): Promise<DocumentListResponse> {
  await delay(500)
  const res = await api.get<DocumentListResponse>('/documents')
  return {
    total: res.data.total,
    documents: res.data.documents.sort((a: any, b: any) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
  }
}

export async function obtenerDocumento(id: number): Promise<Document | null> {
  await delay(300)
  const res = await api.get<Document>(`/documents/${id}`)
  return res?.data ? { id: res.data.id, name: res.data.name, original_name: res.data.original_name, type: res.data.type, hash: res.data.hash, size: res.data.size, upload_date: res.data.upload_date, status: res.data.status } : null
}

export async function subirDocumento(file: File, onProgress?: (percent: number) => void): Promise<Document> {
  // Simulate upload progress mientras el backend procesa
  if (onProgress) {
    onProgress(10)
    await delay(100)
    onProgress(35)
    await delay(150)
    onProgress(70)
    await delay(100)
    onProgress(100)
  }

  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post<Document>('/documents/upload', formData) as any

  // El backend ya guardó en SQLite + filesystem, así que recargamos la lista
  // para reflejar el nuevo documento
  await delay(300)

  return res
}

export async function eliminarDocumento(id: number): Promise<void> {
  await delay(400)
  await api.delete(`/documents/${id}`)
}