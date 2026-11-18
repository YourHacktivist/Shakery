import { componentsDisplay } from './components-display'
import { componentsForms } from './components-forms'

/** Strings of the shared components (src/renderer/src/components), one file per area. */
export const components = {
  forms: componentsForms,
  display: componentsDisplay,
} as const
