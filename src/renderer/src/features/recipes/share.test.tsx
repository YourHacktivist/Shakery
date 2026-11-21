import { describe, expect, it } from 'vitest'
import { recipeDetail } from '@renderer/test/shakery'
import { recipeMarkdown } from './share'

const NBSP = String.fromCharCode(0xa0)

describe('recipe as Markdown', () => {
  it('writes the name, the details, the lines with their notes, the garnish and the steps', () => {
    const recipe = recipeDetail({
      name: 'Negroni *maison*',
      family: 'spirit_forward',
      method: 'stir',
      garnish: 'Zeste d’orange',
      steps: ['Verser sur glace', 'Remuer'],
      lines: [
        {
          id: 'l1',
          ingredientId: 'gin',
          preferredProductId: null,
          quantity: 30,
          unit: 'ml',
          topEstimateMl: null,
          isOptional: false,
          isGarnish: false,
          note: 'Rutte Dry Gin',
        },
        {
          id: 'l2',
          ingredientId: 'orange',
          preferredProductId: null,
          quantity: null,
          unit: 'piece',
          topEstimateMl: null,
          isOptional: true,
          isGarnish: true,
          note: null,
        },
      ],
    })
    const text = recipeMarkdown(recipe, {
      ingredientName: (id) => ({ gin: 'Gin', orange: 'Orange' })[id] ?? id,
      glass: 'Rocks',
      ice: null,
    }).replaceAll(NBSP, ' ')
    expect(text.split('\n')).toEqual([
      '# Negroni \\*maison\\*',
      '',
      '*Spirit-forward · Verre à mélange · Rocks*',
      '',
      '## Ingrédients',
      '',
      '- 30 ml Gin (Rutte Dry Gin)',
      '- dose à définir Orange (optionnel, garniture)',
      '',
      '**Décoration** : Zeste d’orange',
      '',
      '## Étapes',
      '',
      '1. Verser sur glace',
      '2. Remuer',
      '',
      '_Fiche Shakery_',
      '',
    ])
  })
})
