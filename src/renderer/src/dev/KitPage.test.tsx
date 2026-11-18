import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { KitPage } from './KitPage'

describe('KitPage', () => {
  it('renders every section without crashing', () => {
    render(<KitPage />)
    for (const title of Object.values(fr.kit.sections).filter((v) => v !== fr.kit.sections.mockup)) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    }
    expect(screen.getByRole('heading', { name: new RegExp(fr.kit.demo) })).toBeTruthy()
  })
})
