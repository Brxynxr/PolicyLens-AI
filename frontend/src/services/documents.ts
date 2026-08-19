import type { Document, DocumentListResponse } from '../types'

const MOCK_DOCUMENTS_KEY = 'policylens_mock_documents'

const defaultDocuments: Document[] = [
  {
    id: 1,
    name: 'manual_rrhh_2026.pdf',
    original_name: 'manual_rrhh_2026.pdf',
    type: 'pdf',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    size: 245120, // 239 KB
    upload_date: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'processed'
  },
  {
    id: 2,
    name: 'politica_teletrabajo_2025.docx',
    original_name: 'politica_teletrabajo_2025.docx',
    type: 'docx',
    hash: '8f4325a74e2d46b7a2d46b7a2d46b7a2d46b7a2d46b7a2d46b7a2d46b7a2d46b',
    size: 154200, // 150 KB
    upload_date: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'processed'
  },
  {
    id: 3,
    name: 'contrato_confidencialidad_general.html',
    original_name: 'contrato_confidencialidad_general.html',
    type: 'html',
    hash: '5d8f6385a49fb5f6e8574c8bdf12903e1a0b3c66fdf0689b9d3b4e6c7d8a9e0f',
    size: 45800, // 44 KB
    upload_date: new Date(Date.now() - 3600000 * 12).toISOString(),
    status: 'processed'
  }
]

const getStoredDocuments = (): Document[] => {
  const data = localStorage.getItem(MOCK_DOCUMENTS_KEY)
  if (!data) {
    localStorage.setItem(MOCK_DOCUMENTS_KEY, JSON.stringify(defaultDocuments))
    return defaultDocuments
  }
  return JSON.parse(data)
}

const saveStoredDocuments = (docs: Document[]) => {
  localStorage.setItem(MOCK_DOCUMENTS_KEY, JSON.stringify(docs))
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function listarDocumentos(): Promise<DocumentListResponse> {
  await delay(500)
  const docs = getStoredDocuments()
  return {
    total: docs.length,
    documents: docs.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
  }
}

export async function obtenerDocumento(id: number): Promise<Document | null> {
  await delay(300)
  const docs = getStoredDocuments()
  const found = docs.find(d => d.id === id)
  return found || null
}

export async function subirDocumento(file: File, onProgress?: (percent: number) => void): Promise<Document> {
  // Simulate upload progress
  if (onProgress) {
    onProgress(10)
    await delay(150)
    onProgress(35)
    await delay(200)
    onProgress(70)
    await delay(150)
    onProgress(95)
    await delay(100)
    onProgress(100)
  }

  await delay(200) // Processing delay

  const docs = getStoredDocuments()
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf'
  
  const newDoc: Document = {
    id: docs.length > 0 ? Math.max(...docs.map(d => d.id)) + 1 : 1,
    name: file.name,
    original_name: file.name,
    type: fileExt,
    hash: Math.random().toString(16).substring(2, 18) + Math.random().toString(16).substring(2, 18),
    size: file.size,
    upload_date: new Date().toISOString(),
    status: 'processed'
  }

  docs.push(newDoc)
  saveStoredDocuments(docs)
  return newDoc
}

export async function eliminarDocumento(id: number): Promise<void> {
  await delay(400)
  const docs = getStoredDocuments()
  const updated = docs.filter(d => d.id !== id)
  saveStoredDocuments(updated)
}
