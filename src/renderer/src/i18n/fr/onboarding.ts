/** Strings of the first-launch assistant (section 10.15). */
export const onboarding = {
  title: 'Bienvenue dans Shakery',
  progress: (step: number, total: number) => `Étape ${step} sur ${total}`,
  skip: 'Passer',
  back: 'Retour',
  next: 'Continuer',
  finish: 'Ouvrir mon carnet',
  done: 'Ton carnet est prêt. Note ta première idée avec Ctrl N.',
  steps: {
    display: {
      title: 'Comment veux-tu lire tes fiches ?',
      text: 'Choisis l’unité des doses et le thème. Les doses enregistrées ne changent pas.',
    },
    base: {
      title: 'Tout est déjà dans l’application',
      text: 'Les classiques sont là, hors ligne. Tape un nom avec Ctrl K et la fiche s’ouvre.',
    },
    backups: {
      title: 'Où garder tes sauvegardes ?',
      text: 'Shakery sauvegarde le carnet chaque jour et à la fermeture. Un dossier sur un autre disque le protège mieux.',
    },
  },
  base: { cocktails: 'cocktails', preps: 'préparations', ingredients: 'ingrédients' },
} as const
