import type { IpcErrorCode } from '@shared/ipc/result'
import { components } from './fr/components'
import { home } from './fr/home'
import { kit } from './fr/kit'
import { shell } from './fr/shell'

/**
 * Every user-facing string lives here, so the interface can be translated later.
 * Components never hard-code French text. Each area owns one file in ./fr/.
 */
export const fr = {
  app: {
    name: 'Shakery',
    tagline: 'Carnet de création',
  },
  boot: {
    version: (version: string) => `Version ${version}`,
    versionUnknown: 'Version inconnue',
    phase: 'Phase 0 : fondations. Les écrans arrivent aux phases suivantes.',
    logoAlt: 'Logo de Shakery, un shaker entouré d’un ruban cuivré',
  },
  errors: {
    UNKNOWN_CHANNEL: 'Opération inconnue.',
    FORBIDDEN: 'Opération refusée.',
    INVALID_INPUT: 'Les données envoyées sont invalides.',
    NOT_FOUND: 'Élément introuvable.',
    CONFLICT: 'Cette modification entre en conflit avec une donnée existante.',
    UNAVAILABLE: 'Le carnet n’est pas disponible pour le moment. Son état est indiqué dans les paramètres.',
    INTERNAL: 'Une erreur interne est survenue. Le détail est dans le journal.',
  } satisfies Record<IpcErrorCode, string>,
  components,
  shell,
  home,
  kit,
} as const
