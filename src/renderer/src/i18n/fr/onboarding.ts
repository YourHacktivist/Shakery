/** Strings of the first-launch assistant (section 10.15). */
export const onboarding = {
  title: 'Bienvenue dans Shakery',
  progress: (step: number, total: number) => `Étape ${step} sur ${total}`,
  skip: 'Passer',
  back: 'Retour',
  next: 'Continuer',
  finish: 'Ouvrir le carnet',
  done: 'Le carnet est prêt. Une première idée se note avec Ctrl N.',
  steps: {
    display: {
      title: 'Unité des doses et thème',
      text: 'Ces deux choix se changent ensuite dans les paramètres. Les doses déjà enregistrées restent telles quelles.',
    },
    base: {
      title: 'Tout est déjà dans l’application',
      text: 'Les classiques sont là, hors ligne. Ctrl K ouvre la recherche, et un nom suffit pour trouver sa fiche.',
    },
    backups: {
      title: 'Dossier des sauvegardes',
      text: 'Shakery sauvegarde le carnet chaque jour et à la fermeture. Un dossier sur un autre disque le protège mieux.',
    },
  },
  base: { cocktails: 'cocktails', preps: 'préparations', ingredients: 'ingrédients' },
} as const
