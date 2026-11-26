/** Strings of the preparations, collections, revision and calculators screens (phase 8). */
const NBSP = String.fromCharCode(0xa0)
const quote = (text: string) => `«${NBSP}${text}${NBSP}»`
const plural = (count: number, one: string, many: string) =>
  count <= 1 ? `${count} ${one}` : `${count} ${many}`

export const workshop = {
  preps: {
    title: 'Préparations maison',
    /** « 10 préparations, 2 lots en cours », over the title. */
    summary: (preps: number, active: number) =>
      preps === 0
        ? 'Aucune préparation'
        : `${plural(preps, 'préparation', 'préparations')}, ${
            active === 0 ? 'aucun lot en cours' : plural(active, 'lot en cours', 'lots en cours')
          }`,
    description:
      'Une préparation est une base faite à l’avance, comme un sirop, un cordial ou un oleo saccharum. Chaque fabrication enregistre un lot daté, avec la date jusqu’à laquelle l’utiliser.',
    newPrep: 'Nouvelle préparation',
    empty: {
      title: 'Aucune préparation',
      description:
        'Une fiche de type préparation, comme un sirop, un cordial ou une infusion, permet de suivre ses fabrications.',
    },
    columns: {
      prep: 'Préparation',
      shelfLife: 'Conservation',
      lastBatch: 'Dernier lot',
      useBy: 'À utiliser avant',
    },
    groups: { active: 'Lots en cours', idle: 'Sans lot en cours' },
    /** « Citron vert, sucre et acide citrique », under the name of a preparation. */
    composition: (names: readonly string[]) =>
      names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} et ${names.at(-1) ?? ''}`,
    /** « 3 jours », « 2 semaines », « 1 mois ». */
    keeps: (days: number) =>
      days > 0 && days % 30 === 0
        ? `${days / 30} mois`
        : days > 0 && days % 7 === 0
          ? plural(days / 7, 'semaine', 'semaines')
          : plural(days, 'jour', 'jours'),
    lastBatch: {
      active: (date: string) => `Lot du ${date}`,
      past: (date: string) => `Le ${date}`,
      none: 'Jamais',
    },
    listLabel: 'Liste des préparations',
    /** Name of the list of the batches in use of one preparation. */
    batchesOf: (name: string) => `Lots en cours de ${name}`,
    /** Name of the button that starts a batch, the preparation being the one of its row. */
    makeOf: (name: string) => `Nouvelle fabrication de ${name}`,
    shelfLifeMissing: 'Sans durée de conservation, aucune date limite n’est calculée.',
    newBatch: 'Nouvelle fabrication',
    batch: {
      title: (name: string) => `Nouvelle fabrication de ${name}`,
      madeAt: 'Fabriquée le',
      quantity: 'Quantité',
      notes: 'Notes',
      bestBefore: (date: string) => `À consommer avant le ${date}`,
      noBestBefore: 'Pas de date limite (durée de conservation non précisée).',
      create: 'Enregistrer la fabrication',
      cancel: 'Annuler',
      created: (name: string) => `Fabrication de ${quote(name)} enregistrée.`,
      madeOn: (date: string) => `Fabriquée le ${date}`,
      finish: 'Terminée',
      discard: 'Jetée',
      finished: 'Fabrication terminée.',
      discarded: 'Fabrication jetée.',
      delete: 'Supprimer la fabrication',
      deleted: 'Fabrication supprimée.',
      statuses: { active: 'En cours', finished: 'Terminée', discarded: 'Jetée' },
      history: 'Fabrications passées',
    },
    label: {
      action: 'Imprimer une étiquette',
      title: 'Étiquette de bouteille',
      description:
        'L’étiquette porte le nom, la date de fabrication et la date limite, sur rouleau ou planche A4.',
      format: 'Format',
      formats: {
        roll62x29: `Rouleau 62 × 29${NBSP}mm`,
        roll89x36: `Rouleau 89 × 36${NBSP}mm`,
        roll57x32: `Rouleau 57 × 32${NBSP}mm`,
        sheet21: `Planche A4, 21 étiquettes de 63,5 × 38,1${NBSP}mm`,
        sheet8: `Planche A4, 8 étiquettes de 99,1 × 67,7${NBSP}mm`,
      },
      count: 'Nombre d’étiquettes',
      first: 'Première case libre',
      firstHint: 'Elle sert à finir une planche entamée.',
      allergens: 'Allergènes déclarés',
      allergensHint:
        'Ils viennent des ingrédients de la préparation. Les étiquettes des produits restent à vérifier.',
      scaleHint: `L’impression se fait à 100${NBSP}%, sans « ajuster à la page ».`,
      madeOn: 'Fait le',
      bestBefore: 'À utiliser avant le',
      quantity: 'Volume',
      contains: (list: string) => `Contient${NBSP}: ${list}`,
      savePdf: 'Enregistrer en PDF',
      print: 'Imprimer',
      saved: 'PDF des étiquettes enregistré.',
      sent: 'Étiquettes envoyées à l’imprimante.',
    },
    side: {
      expiring: (count: number) => plural(count, 'fabrication à surveiller', 'fabrications à surveiller'),
    },
  },
  collections: {
    title: 'Collections',
    count: (count: number) =>
      count === 0 ? 'Aucune collection' : plural(count, 'collection', 'collections'),
    add: 'Nouvelle collection',
    empty: {
      title: 'Aucune collection',
      description:
        'Une collection regroupe des fiches pour une carte, un concours ou un thème. Elle se révise et s’exporte en PDF.',
    },
    listLabel: 'Liste des collections',
    listHint:
      'Une collection ouverte range ses fiches dans l’ordre voulu, avec une note et un prix de vente pour chacune.',
    columns: { name: 'Collection', kind: 'Type', count: 'Fiches', updated: 'Modifiée' },
    kinds: { menu: 'Carte', competition: 'Concours', theme: 'Thème', other: 'Autre' },
    recent: 'Dernières révisions',
    sessionMeta: (mode: string, date: string) => `${mode}, ${date}`,
    form: {
      createTitle: 'Nouvelle collection',
      editTitle: (name: string) => `Modifier ${quote(name)}`,
      name: 'Nom',
      description: 'Description',
      kind: 'Type',
      save: 'Enregistrer',
      cancel: 'Annuler',
      created: (name: string) => `Collection ${quote(name)} créée.`,
      saved: 'Collection enregistrée.',
    },
    edit: 'Modifier',
    delete: 'Supprimer',
    deleted: (name: string) => `Collection ${quote(name)} supprimée.`,
    exportPdf: 'Exporter en PDF',
    exportPdfOf: (name: string) => `Exporter ${quote(name)} en PDF`,
    exported: 'PDF enregistré.',
    more: 'Autres actions',
    moreOf: (name: string) => `Autres actions pour ${quote(name)}`,
    shareOpen: 'Partager',
    share: {
      title: (name: string) => `Partager ${quote(name)}`,
      description:
        'L’export crée un fichier .shakery avec la collection, ses fiches, leurs préparations et leurs ingrédients, à importer dans un autre Shakery.',
      export: 'Exporter',
      cancel: 'Annuler',
      done: 'Collection exportée.',
    },
    practice: 'Réviser',
    practiceOf: (name: string) => `Réviser ${quote(name)}`,
    prepare: 'Préparer',
    tabs: { listLabel: 'Contenu de la collection', recipes: 'Fiches' },
    addRecipes: 'Ajouter des fiches',
    addPlaceholder: 'Chercher une fiche à ajouter',
    added: (name: string) => `${quote(name)} ajoutée à la collection.`,
    itemsEmpty: 'Aucune fiche dans cette collection.',
    moveUp: (name: string) => `Monter ${quote(name)}`,
    moveDown: (name: string) => `Descendre ${quote(name)}`,
    remove: (name: string) => `Retirer ${quote(name)} de la collection`,
    removed: (name: string) => `${quote(name)} retirée de la collection.`,
    note: 'Note',
    notePlaceholder: 'Note pour cette collection',
    price: 'Prix de vente',
    sheet: 'Fiche culture',
    addToCollection: 'Ajouter à une collection',
    inCollection: (name: string) => `Dans ${quote(name)}`,
    addedTo: (recipe: string, collection: string) => `${quote(recipe)} ajoutée à ${quote(collection)}.`,
    noCollection: 'Aucune collection pour l’instant. Une collection se crée depuis l’écran Collections.',
  },
  print: {
    collection: (count: number) => plural(count, 'fiche', 'fiches'),
    price: 'Prix',
    loading: 'Préparation du document',
  },
  practice: {
    title: 'Révision',
    collection: 'Collection',
    mode: 'Mode',
    modes: { quiz: 'QCM', flashcards: 'Cartes mémoire' },
    quizHint: 'Jusqu’à quatre réponses par question, dont une seule est juste.',
    flashcardsHint: 'La question s’affiche, la réponse se cherche de tête, puis la carte se retourne.',
    options: 'Réglages',
    length: 'Nombre de questions',
    order: 'Ordre des questions',
    orders: { random: 'Au hasard', collection: 'Ordre de la collection' },
    weakFirst: 'Commencer par les questions à revoir',
    weakFirstHint: (count: number) =>
      count === 0
        ? 'Aucune question de cette collection n’a été ratée au dernier passage.'
        : count === 1
          ? 'La question ratée au dernier passage arrive en tête de la série.'
          : `Les ${count} questions ratées au dernier passage arrivent en tête de la série.`,
    start: 'Commencer la révision',
    summary: (questions: number, items: number) =>
      `${plural(questions, 'question tirée', 'questions tirées')} ${
        items === 1 ? 'de l’unique fiche' : `des ${items} fiches`
      } de la collection.`,
    noQuestion:
      'Cette collection ne donne aucune question. Il lui faut des fiches avec leurs doses, leur méthode et leur verre.',
    progress: (current: number, total: number) => `Question ${current} sur ${total}`,
    reveal: 'Voir la réponse',
    knew: 'Réponse trouvée',
    didNotKnow: 'À revoir',
    next: 'Suivante',
    finish: 'Terminer',
    right: 'Bonne réponse',
    wrong: (answer: string) => `Réponse attendue${NBSP}: ${answer}`,
    quit: 'Arrêter',
    result: {
      title: 'Session terminée',
      score: (score: number, total: number) => `${score} sur ${total}`,
      mistakes: 'Erreurs à revoir',
      none: 'Aucune erreur dans cette série.',
      again: 'Recommencer',
      back: 'Retour',
    },
    history: 'Dernières sessions',
    historyEmpty: 'Aucune session pour l’instant.',
    outOf: (total: number) => ` / ${total}`,
    weakTitle: 'À revoir',
    weakCount: (count: number) => plural(count, 'question à revoir', 'questions à revoir'),
    prompts: {
      dose: (ingredient: string) => `Quelle dose de ${ingredient}${NBSP}?`,
      intruder: `Quel ingrédient n’entre pas dans ce cocktail${NBSP}?`,
      method: `Quelle méthode${NBSP}?`,
      glass: `Quel verre${NBSP}?`,
      ice: `Quelle glace${NBSP}?`,
      garnish: `Quelle décoration${NBSP}?`,
      length: `Short drink ou long drink${NBSP}?`,
      moment: `À quel moment le servir${NBSP}?`,
      family: `Quelle famille${NBSP}?`,
      abv: `Quel TAV retenu par le socle${NBSP}?`,
      recite: 'Quelle est la recette complète, avec doses, méthode, verre et décoration ?',
      className: `Quelle classe${NBSP}?`,
      minAbv: `Quel TAV minimum${NBSP}?`,
      origin: `Quelle origine${NBSP}?`,
      takeaway: `De quel produit s’agit-il${NBSP}?`,
      cell: (column: string) => `${column}${NBSP}?`,
    },
    abv: (value: string) => `${value}${NBSP}% vol`,
  },
  calculators: {
    title: 'Calculateurs',
    tabsLabel: 'Calculateur affiché',
    tabs: { batch: 'Batch', abv: 'Degré et dilution', convert: 'Conversion', cost: 'Coût' },
    fromRecipe: 'À partir d’une fiche',
    recipePlaceholder: 'Rechercher une fiche',
    batch: {
      /** Line above the title while this calculator is shown (D-057). */
      caption: 'Le batch multiplie une fiche pour préparer un service à l’avance.',
      servings: 'Nombre de verres',
      start: 'Départ du batch',
      starts: { recipe: 'Une fiche', manual: 'Sans fiche' },
      manualHint: 'Chaque ligne porte un ingrédient, sa dose pour un verre et l’endroit où il va.',
      manualTitle: 'Recette du batch',
      name: 'Nom du batch',
      defaultName: 'Batch',
      dosePerDrink: 'Dose par verre',
      where: 'Où il va',
      lineLabel: (index: number) => `Ingrédient ${index}`,
      lineDose: (index: number) => `Dose par verre de l’ingrédient ${index}`,
      lineWhere: (index: number) => `Où va l’ingrédient ${index}`,
      addLine: 'Ajouter un ingrédient',
      removeLine: (index: number) => `Retirer l’ingrédient ${index}`,
      dilution: 'Dilution',
      manualEmpty: 'Le batch s’affiche dès qu’un ingrédient a sa dose.',
      includeWater: 'Ajouter l’eau de dilution dans la bouteille',
      waterHint: 'Cette option convient à un cocktail remué ou construit, servi sans passer sur la glace.',
      empty: 'Le batch s’affiche ici une fois la fiche choisie.',
      ingredient: 'Ingrédient',
      quantity: 'Quantité',
      volume: 'Volume',
      when: 'Quand',
      hints: { ok: 'Dans la bouteille', fresh: 'Frais, le jour même', add_at_service: 'Au service' },
      freshWarning: 'Ces ingrédients s’ajoutent le jour même, jamais dans une bouteille conservée.',
      target: 'Cible du batch',
      byServings: 'En verres',
      byVolume: 'En volume',
      targetVolume: 'Volume à embouteiller',
      step: 'Arrondi',
      stepValue: (ml: number) => `${ml}${NBSP}ml`,
      includeGarnish: 'Compter les décorations',
      drinks: (count: string) => `${count} verres`,
      fresh: 'Frais, à part',
      nothingKeeps:
        'Rien de cette fiche ne se garde en bouteille. Le calcul en nombre de verres reste possible.',
      sheetTitle: 'Batch',
      total: 'Total',
      savePdf: 'Enregistrer en PDF',
      print: 'Imprimer',
      saved: 'PDF du batch enregistré.',
      sent: 'Batch envoyé à l’imprimante.',
      water: 'Eau de dilution',
      bottle: 'Volume de la bouteille',
      service: 'Ajouté au service',
      garnish: 'décoration',
      optional: 'facultatif',
    },
    abv: {
      caption: 'Ce calcul donne le degré d’un mélange avant et après la dilution.',
      lines: 'Lignes',
      volume: 'Volume',
      lineAbv: 'Degré',
      addLine: 'Ajouter une ligne',
      removeLine: (index: number) => `Retirer la ligne ${index}`,
      dilution: 'Dilution',
      before: 'Avant dilution',
      after: 'Servi',
      served: 'Volume servi',
      fromRecipeHint: 'Une fiche choisie remplit les volumes et les degrés, qui restent ajustables.',
    },
    convert: {
      caption:
        'La conversion passe une dose d’une unité de bar à une autre, selon les équivalences des paramètres.',
      value: 'Valeur',
      unit: 'Unité',
      approx: 'valeur d’usage',
    },
    cost: {
      caption:
        'Le coût d’une dose se calcule depuis le prix de la bouteille, et le prix de vente d’une fiche depuis son coût matière.',
      price: 'Prix de la bouteille',
      bottleVolume: 'Contenance',
      dose: 'Dose',
      perDose: 'Coût de la dose',
      perLitre: 'Prix au litre',
      recipeCost: 'Coût matière du verre',
      salePrice: 'Prix de vente conseillé',
      ratio: 'Ratio coût / prix',
      incomplete: 'Le coût est incomplet, car il manque le prix d’au moins une bouteille.',
      rules: (multiplier: string, vat: string) => `Coefficient ${multiplier}, TVA ${vat}${NBSP}%`,
    },
  },
  bar: {
    shopping: {
      title: 'Liste d’achats',
      description: 'Ces ingrédients débloqueraient le plus de fiches. Chacun est le seul qui leur manque.',
      empty:
        'Aucun achat à suggérer pour l’instant. Les suggestions viennent des bouteilles cochées dans la liste des ingrédients.',
      unlocks: (count: number) => `débloque ${plural(count, 'fiche', 'fiches')}`,
    },
    owned: (name: string) => `${name} au bar`,
    makeable: (count: number) =>
      count === 0
        ? 'Aucune fiche réalisable ce soir'
        : `${plural(count, 'fiche réalisable', 'fiches réalisables')} ce soir`,
    unlock: (name: string, count: number) => `${name} en débloquerait ${count}`,
  },
} as const
