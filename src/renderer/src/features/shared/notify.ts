import { toast } from '@renderer/components/Toast'
import { fr } from '@renderer/i18n/fr'
import { ShakeryError } from '@renderer/lib/ipc'

/** French message of a failed operation: the IPC code decides, never the technical text. */
export function errorMessage(error: unknown): string {
  return error instanceof ShakeryError ? error.userMessage : fr.errors.INTERNAL
}

/** True when the main process refused the operation because of existing data. */
export function isConflict(error: unknown): boolean {
  return error instanceof ShakeryError && error.code === 'CONFLICT'
}

export function notifyError(error: unknown): void {
  toast.show({ message: errorMessage(error), tone: 'error' })
}
