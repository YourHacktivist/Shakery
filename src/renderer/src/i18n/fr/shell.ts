/** Strings of the application shell: navigation, top bar, palette, shortcuts, placeholder screens. */

/** No-break space, built at run time: a literal one in a template string is refused by the linter. */
const NBSP = String.fromCharCode(0xa0)
const quote = (text: string) => `«${NBSP}${text}${NBSP}»`
const colon = `${NBSP}:`

export const shell = {
  skipToContent: 'Aller au contenu',
  brand: {
    name: 'Shakery',
    tagline: 'Carnet de création',
  },
  version: (version: string) => `Version ${version}`,
  versionUnknown: 'Version inconnue',
  sidebar: {
    label: 'Barre latérale',
    collapse: 'Replier la barre latérale',
    expand: 'Déplier la barre latérale',
    shortcuts: 'Raccourcis clavier',
  },
  nav: {
    label: 'Navigation principale',
    home: 'Accueil',
    recipes: 'Fiches',
    lab: 'Atelier',
    journal: 'Journal',
    notebook: 'Carnet',
    bar: 'Mon bar',
    preps: 'Préparations',
    collections: 'Collections',
    practice: 'Révision',
    calculators: 'Calculateurs',
    settings: 'Paramètres',
    kit: 'Kit de composants (développement)',
  },
  side: {
    retest: {
      title: 'À retester',
      empty: 'Rien à retester pour l’instant.',
    },
    preps: {
      title: 'Préparations',
      empty: 'Aucune préparation en cours.',
    },
    tonight: {
      title: 'Ce soir',
      empty: 'Coche les bouteilles que tu possèdes pour voir ce que tu peux préparer.',
      action: 'Ouvrir Mon bar',
    },
  },
  topbar: {
    label: 'Barre d’outils',
    search: 'Rechercher une fiche, un ingrédient, une note',
    quickIdea: 'Idée rapide',
    settings: 'Paramètres',
  },
  keys: {
    mod: 'Ctrl',
    shift: 'Maj',
    escape: 'Échap',
    enter: 'Entrée',
    up: '↑',
    down: '↓',
    letter: 'A à Z',
  },
  dialog: {
    close: 'Fermer',
  },
  toast: {
    region: 'Notifications',
    dismiss: 'Fermer la notification',
    undo: 'Annuler',
    errorPrefix: `Erreur${colon} `,
  },
  palette: {
    title: 'Palette de recherche',
    label: 'Rechercher',
    placeholder: 'Rechercher un écran',
    listLabel: 'Résultats',
    groupScreens: 'Aller à',
    empty: 'Aucun résultat',
    emptyHint: 'La recherche dans tes fiches, tes ingrédients et tes notes arrive à la phase 5.',
    hintMove: 'naviguer',
    hintOpen: 'ouvrir',
    hintClose: 'fermer',
  },
  quickIdea: {
    title: 'Idée rapide',
    description: `Bientôt, tu noteras ici une idée en quelques secondes${colon} un nom, quelques ingrédients, une ligne de note, puis Entrée.`,
    phase: 'La saisie arrive à la phase 3, avec les fiches et les ingrédients.',
    confirm: 'Compris',
  },
  shortcuts: {
    title: 'Raccourcis clavier',
    description: `Ceux marqués ${quote('Bientôt')} arriveront avec les prochaines phases.`,
    soon: 'Bientôt',
    items: {
      palette: 'Ouvrir la palette de recherche',
      typeToSearch: 'Chercher en tapant, hors d’un champ de saisie',
      quickIdea: 'Noter une idée rapide',
      newRecipe: 'Créer une fiche complète',
      tastingNote: 'Noter une dégustation',
      openInLab: 'Ouvrir la fiche affichée dans l’atelier',
      print: 'Imprimer',
      prepMode: 'Passer en mode préparation',
      back: 'Fermer la fenêtre ouverte ou revenir en arrière',
      help: 'Afficher les raccourcis',
    },
  },
  screens: {
    recipes: {
      eyebrow: 'Arrive à la phase 3',
      title: 'Fiches',
      emptyTitle: 'Tes fiches vivront ici',
      emptyText:
        'Chaque recette avec ses ingrédients, ses doses, ses étapes, ses versions et ses calculs. La création et l’édition arrivent à la phase 3, les filtres et la recherche à la phase 5.',
    },
    lab: {
      eyebrow: 'Arrive à la phase 6',
      title: 'Atelier',
      emptyTitle: 'L’atelier, pour ajuster tes doses',
      emptyText:
        'Règle chaque dose et vois le degré, le sucre, l’acidité et la dilution bouger en direct, puis compare tes versions côte à côte. Il arrive à la phase 6.',
    },
    journal: {
      eyebrow: 'Arrive à la phase 7',
      title: 'Journal',
      emptyTitle: 'Ton journal de dégustation',
      emptyText:
        'Note chaque essai de 1 à 5, critère par critère, et garde la prochaine étape à tester. Il arrive à la phase 7.',
    },
    notebook: {
      eyebrow: 'Arrive à la phase 7',
      title: 'Carnet',
      emptyTitle: 'Tes notes libres',
      emptyText: `Associations de saveurs, techniques, inspirations, bouteilles à goûter${colon} tout ce qui n’est pas encore une recette. Le carnet arrive à la phase 7.`,
    },
    bar: {
      eyebrow: 'Arrive aux phases 3 et 8',
      title: 'Mon bar',
      emptyTitle: 'Tes ingrédients et tes bouteilles',
      emptyText:
        'Les ingrédients et les bouteilles arrivent à la phase 3. Ce que tu possèdes, ce que tu peux préparer ce soir et la liste d’achats arrivent à la phase 8.',
    },
    preps: {
      eyebrow: 'Arrive à la phase 8',
      title: 'Préparations',
      emptyTitle: 'Tes préparations maison',
      emptyText:
        'Sirops, cordiaux, oleo saccharum. Suis chaque fabrication et sa date limite. Elles arrivent à la phase 8.',
    },
    collections: {
      eyebrow: 'Arrive à la phase 8',
      title: 'Collections',
      emptyTitle: 'Tes collections de fiches',
      emptyText:
        'Regroupe des fiches pour une carte, un concours ou un thème, dans l’ordre que tu veux, avec un export PDF. Elles arrivent à la phase 8.',
    },
    practice: {
      eyebrow: 'Arrive à la phase 8',
      title: 'Révision',
      emptyTitle: 'Révise tes recettes',
      emptyText:
        'Cartes mémoire et quiz sur une collection, avec ton score et les erreurs à revoir. La révision arrive à la phase 8.',
    },
    calculators: {
      eyebrow: 'Arrive à la phase 8',
      title: 'Calculateurs',
      emptyTitle: 'Tes calculateurs',
      emptyText:
        'Batch, degré et dilution, conversion d’unités et coût, seuls ou à partir d’une fiche. Ils arrivent à la phase 8.',
    },
    settings: {
      eyebrow: 'Arrive au fil des phases',
      title: 'Paramètres',
      emptyTitle: 'Tes réglages',
      emptyText:
        'Unités, dilution, sauvegardes, impression et apparence. Les premiers réglages, les unités et la dilution, arrivent à la phase 3.',
    },
  },
} as const
