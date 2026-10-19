import type { IpcResult } from '@shared/types'

/**
 * Chama um handler IPC do processo principal e desembrulha o envelope.
 * Lança em caso de erro para ser tratado via try/catch + toast na UI.
 */
export async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const res = (await window.api.invoke(channel, payload)) as IpcResult<T>
  if (!res.ok) throw new Error(res.error)
  return res.data
}
