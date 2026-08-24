const MARCA_MOJIBAKE = /[ÃÂ]/

export function limpiarEncoding(texto: string): string {
  if (!texto || !MARCA_MOJIBAKE.test(texto)) return texto

  // Si termina en un byte suelto de la secuencia corrupta, esperar al siguiente token
  if (/[\u00C3\u00C2\u00E3\u00E2]$/.test(texto)) return texto

  try {
    const bytes = Uint8Array.from(texto, c => c.charCodeAt(0) & 0xFF)
    const reparado = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const antes = (texto.match(/[ÃÂ]/g) || []).length
    const despues = (reparado.match(/[ÃÂ]/g) || []).length
    if (despues < antes) return reparado
  } catch {
    // Si el navegador no soporta TextDecoder, devolver el original
  }
  return texto
}
