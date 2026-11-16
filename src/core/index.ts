/**
 * Business logic shared by the desktop app and the future phone app.
 *
 * Rules: pure functions only, no import from Electron, Node, React or the DOM
 * (enforced by tsconfig.core.json and ESLint). Every calculation is tested with Vitest
 * before it is wired to the interface. Modules arrive from phase 3 (units, abv,
 * dilution, cost, allergens) onwards.
 */
export {}
