import type { SyncSummaryResponse } from '../types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function sincronizarDocumentos(): Promise<SyncSummaryResponse> {
  await delay(2000) // Simulating scanning & processing RAG index

  return {
    added: ['politica_viajes_2026.pdf'],
    updated: ['politica_teletrabajo_2025.docx'],
    unchanged: ['manual_rrhh_2026.pdf', 'contrato_confidencialidad_general.html'],
    errors: ['manual_obsoleto_corrupto.pdf'],
    total_processed: 5,
    details: [
      {
        filename: 'politica_viajes_2026.pdf',
        hash: 'b35a96f13e5...f89c3a',
        status: 'added',
        message: 'Nuevo documento procesado e ingresado a la BD'
      },
      {
        filename: 'politica_teletrabajo_2025.docx',
        hash: '8f4325a74e2...f2d46b',
        status: 'updated',
        message: 'Documento actualizado por cambio de contenido (SHA-256)'
      },
      {
        filename: 'manual_rrhh_2026.pdf',
        hash: 'e3b0c44298f...852b85',
        status: 'unchanged',
        message: 'Documento sin cambios detectados'
      },
      {
        filename: 'contrato_confidencialidad_general.html',
        hash: '5d8f6385a49...7d8a9e',
        status: 'unchanged',
        message: 'Documento sin cambios detectados'
      },
      {
        filename: 'manual_obsoleto_corrupto.pdf',
        hash: '',
        status: 'error',
        message: 'Error al procesar: El archivo PDF no existe o está corrupto.'
      }
    ]
  }
}
