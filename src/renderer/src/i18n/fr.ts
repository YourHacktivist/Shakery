import type { IpcErrorCode } from '@shared/ipc/result'
import { bar } from './fr/bar'
import { components } from './fr/components'
import { guide } from './fr/guide'
import { journal } from './fr/journal'
import { home } from './fr/home'
import { kit } from './fr/kit'
import { onboarding } from './fr/onboarding'
import { recipes } from './fr/recipes'
import { settings } from './fr/settings'
import { shell } from './fr/shell'
import { workshop } from './fr/workshop'

/**
 * Every user-facing string lives here, so the interface can be translated later.
 * Components never hard-code French text. Each area owns one file in ./fr/.
 */
export const fr = {
  app: {
    name: 'Shakery',
    tagline: 'Carnet de création',
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
  journal,
  workshop,
  shell,
  home,
  kit,
  recipes,
  bar,
  settings,
  guide,
  onboarding,
} as const
