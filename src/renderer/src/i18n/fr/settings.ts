/** Settings screen: import of a .shakery notebook (D-018), then the other settings. */
export const settings = {
  import: {
    eyebrow: 'Importer',
    title: 'Importer un carnet',
    description:
      'Un fichier .shakery venant d’un autre carnet ou d’une conversion, comme les carnets MAF. Le carnet actuel est sauvegardé avant l’import.',
    choose: 'Choisir un fichier…',
    reading: 'Lecture du fichier…',
    source: (label: string | null) => (label ? `Fichier : ${label}` : 'Fichier sans nom'),
    tableHead: { table: 'Contenu', total: 'Dans le fichier', added: 'Nouveaux', matched: 'Déjà présents' },
    conflicts: (count: number) =>
      count === 1
        ? '1 élément existe déjà avec un contenu différent.'
        : `${count} éléments existent déjà avec un contenu différent.`,
    strategyLabel: 'Éléments déjà présents',
    strategies: {
      ignore: 'Garder les miens',
      replace: 'Remplacer',
      duplicate: 'Garder les deux',
    },
    apply: 'Importer',
    applying: 'Import en cours…',
    cancel: 'Annuler',
    done: (inserted: number, updated: number) =>
      updated > 0
        ? `Import terminé : ${inserted} éléments ajoutés, ${updated} remplacés.`
        : `Import terminé : ${inserted} éléments ajoutés.`,
    invalid: 'Ce fichier n’est pas un carnet Shakery valide. Rien n’a été modifié.',
    expired: 'Le fichier choisi a expiré. Choisis-le à nouveau.',
    /** Names of the tables shown in the preview; the others are counted in « Autres éléments ». */
    tables: {
      recipes: 'Recettes',
      ingredients: 'Ingrédients',
      products: 'Bouteilles',
      knowledge_sheets: 'Fiches de culture',
      knowledge_items: 'Éléments de fiches',
      reference_specs: 'Versions de référence',
      collections: 'Collections',
      study_tables: 'Tableaux à réviser',
      tasting_notes: 'Dégustations',
      notebook_entries: 'Notes du carnet',
      prep_batches: 'Lots de préparations',
    } as Record<string, string>,
    otherTables: 'Autres éléments',
  },
  rest: {
    title: 'Les autres réglages',
    text: 'Unités, dilution, sauvegardes, impression et apparence arrivent au fil des phases.',
  },
} as const
