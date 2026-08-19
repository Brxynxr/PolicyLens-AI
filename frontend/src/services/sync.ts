import type { SyncSummaryResponse } from '../types'
import api from './api'

export async function sincronizarDocumentos(): Promise<SyncSummaryResponse> {
  const data = await api.post('/documents/sync') as any
  return data as SyncSummaryResponse
}
