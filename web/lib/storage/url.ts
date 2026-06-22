/**
 * Converte uma URL pública do Supabase Storage em uma URL segura via API.
 * Funciona com buckets privados — gera signed URL no servidor.
 *
 * Formato de entrada: https://xxx.supabase.co/storage/v1/object/public/BUCKET/PATH
 * Formato de saída: /api/storage/download?bucket=BUCKET&path=PATH
 */
export function secureStorageUrl(publicUrl: string | null): string | null {
  if (!publicUrl) return null

  // Se já é uma URL da API, retornar como está
  if (publicUrl.startsWith('/api/storage/')) return publicUrl

  // Extrair bucket e path da URL pública do Supabase
  const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (!match) return publicUrl // URL não reconhecida, retornar como está

  const [, bucket, path] = match
  return `/api/storage/download?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`
}
