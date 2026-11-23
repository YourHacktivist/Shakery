import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fr } from '@renderer/i18n/fr'
import { installShakery, renderRoutes } from '@renderer/test/shakery'
import { CalculatorsPage } from './CalculatorsPage'

const t = fr.workshop.calculators

beforeEach(() => {
  installShakery()
})

/** Text of the figure under a result label. */
function figure(label: string): string {
  const card = screen.getAllByText(label).find((element) => element.tagName === 'SPAN')?.parentElement
  return (card?.textContent ?? '')
    .replace(label, '')
    .replaceAll(String.fromCharCode(0xa0), ' ')
    .replaceAll(String.fromCharCode(0x202f), ' ')
}

describe('CalculatorsPage', () => {
  it('computes the served ABV of the default lines with their dilution', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/calculators', element: <CalculatorsPage /> }], '/calculators')
    await user.click(screen.getByRole('radio', { name: t.tabs.abv }))
    // (30 × 40 + 30 × 25 + 30 × 15) / 100 = 24 ml of alcohol in 90 ml, then 108 ml served.
    expect(figure(t.abv.before)).toContain('26,7')
    expect(figure(t.abv.after)).toContain('22,2')
    expect(figure(t.abv.served)).toContain('108')
  })

  it('gives no degree while the degree of a poured line is unknown', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/calculators', element: <CalculatorsPage /> }], '/calculators')
    await user.click(screen.getByRole('radio', { name: t.tabs.abv }))
    await user.clear(screen.getByRole('spinbutton', { name: `${t.abv.lineAbv} 2` }))
    // Counted as 0 %, the 30 ml would have given 15,3 % served.
    expect(figure(t.abv.after)).toContain('–')
    expect(figure(t.abv.served)).toContain('108')
  })

  it('multiplies a batch written by hand, the fresh apart from the bottle', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/calculators', element: <CalculatorsPage /> }], '/calculators')
    await user.click(screen.getByRole('radio', { name: t.batch.starts.manual }))
    expect(screen.getByText(t.batch.manualEmpty)).toBeDefined()
    await user.type(screen.getByRole('textbox', { name: t.batch.lineLabel(1) }), 'Gin')
    await user.type(screen.getByRole('spinbutton', { name: t.batch.lineDose(1) }), '40')
    await user.click(screen.getByRole('button', { name: t.batch.addLine }))
    await user.type(screen.getByRole('textbox', { name: t.batch.lineLabel(2) }), 'Citron')
    await user.type(screen.getByRole('spinbutton', { name: t.batch.lineDose(2) }), '20')
    await user.selectOptions(screen.getByRole('combobox', { name: t.batch.lineWhere(2) }), 'fresh')
    // Ten drinks by default: 400 ml in the bottle, 200 ml of fresh juice apart.
    expect(figure(t.batch.bottle)).toContain('400')
    expect(figure(t.batch.fresh)).toContain('200')
  })

  it('converts an ounce with the validated equivalences', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/calculators', element: <CalculatorsPage /> }], '/calculators')
    await user.click(screen.getByRole('radio', { name: t.tabs.convert }))
    expect(figure(fr.recipes.units.ml)).toContain('30')
    expect(figure(fr.recipes.units.cl)).toContain('3')
  })
})
