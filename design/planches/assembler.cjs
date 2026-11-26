/*
 * Compose une planche par écran (avant et après côte à côte, changements, questions) à partir
 * de notes.json, puis l'index. À lancer depuis la racine du projet :
 *
 *   node design/planches/assembler.cjs
 *
 * Les pages vont dans design/planches/html/planches/. Le rendu PNG se fait ensuite avec rendu.cjs
 * (largeur 1800, hauteur auto).
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.join(__dirname)
const notes = JSON.parse(fs.readFileSync(path.join(ROOT, 'notes.json'), 'utf8'))
const OUT = path.join(ROOT, 'html', 'planches')
fs.mkdirSync(OUT, { recursive: true })
const css = fs.readdirSync(path.join(ROOT, 'html', 'assets')).find((f) => /^index-.*\.css$/.test(f))

// Typographie française : espace insécable avant : ; ? ! et à l'intérieur des guillemets.
const typo = (s) =>
  String(s)
    .replace(/[  ]*([;:?!])(?=\s|$)/g, ' $1')
    .replace(/«[  ]*/g, '« ')
    .replace(/[  ]*»/g, ' »')
const esc = (s) => typo(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const head = (title) => `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><title>${esc(title)}</title>
<link rel="stylesheet" href="../assets/${css}" />
<link rel="stylesheet" href="../assets/planches.css" />
<style>
  html, body { height: auto; background: var(--color-bg-base); color: var(--color-fg); font-family: var(--font-sans); }
  body { margin: 0; padding: 56px 64px 72px; }
  .b-top { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
  .b-kicker { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-fg-muted); }
  .b-title { margin: 0 0 36px; font-size: 34px; font-weight: 600; letter-spacing: -0.01em; }
  .b-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
  .b-shot { display: block; width: 100%; border: 1px solid var(--color-border-strong); border-radius: 10px; }
  .b-col > * + * { margin-top: 28px; }
  .b-list { margin: 0; padding: 0; list-style: none; }
  .b-list li { position: relative; padding: 10px 0; border-bottom: 1px solid var(--color-border); font-size: 15px; line-height: 1.55; color: var(--color-fg-secondary); }
  .b-empty { font-size: 15px; color: var(--color-fg-muted); }
  .b-index a { color: var(--color-fg); text-decoration: none; }
  .b-index li { display: grid; grid-template-columns: 60px 1fr; padding: 14px 0; border-bottom: 1px solid var(--color-border); font-size: 17px; }
  .b-index li span { color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
</style></head><body>`

const pad = (n) => String(n).padStart(2, '0')
for (const [i, screen] of notes.ecrans.entries()) {
  const id = path.basename(screen.fichier, '.png')
  const avant = `../../png/avant/${id}.png`
  const apres = `../../${screen.fichier}`
  const complet = screen.complet ? `../../${screen.complet}` : ''
  const list = (items, cls) =>
    items.length ? `<ul class="b-list ${cls}">${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="b-empty">Rien à trancher sur cet écran.</p>'
  const html = `${head(screen.titre)}
<div class="b-top"><span class="b-kicker">Shakery · refonte ergonomique · planche ${pad(i + 1)} sur ${pad(notes.ecrans.length)}</span><span class="b-kicker">${esc(notes.date)}</span></div>
<h1 class="b-title">${esc(screen.titre)}</h1>
<div class="b-grid">
  <div class="b-col">
    <p class="pl-section-title is-muted">Avant</p>
    <img class="b-shot" src="${avant}" alt="" />
    <p class="pl-section-title">Ce qui change</p>
    ${list(screen.changements, '')}
    <p class="pl-section-title is-muted">À trancher</p>
    ${list(screen.questions, 'is-q')}
  </div>
  <div class="b-col">
    <p class="pl-section-title">Après</p>
    <img class="b-shot" src="${apres}" alt="" />
    ${complet ? `<p class="pl-section-title">Après, page complète</p><img class="b-shot" src="${complet}" alt="" />` : ''}
  </div>
</div>
</body></html>`
  fs.writeFileSync(path.join(OUT, `${id}.html`), html)
  console.log(`planche ${id}`)
}

const index = `${head('Planches de la refonte')}
<div class="b-top"><span class="b-kicker">Shakery · refonte ergonomique</span><span class="b-kicker">${esc(notes.date)}</span></div>
<h1 class="b-title">Planches de la refonte</h1>
<p class="pl-section-title">Principes</p>
${`<ul class="b-list">${notes.principes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`}
<p class="pl-section-title" style="margin-top:36px">Écrans</p>
<ul class="b-list b-index">${notes.ecrans
  .map((s, i) => `<li><span>${pad(i + 1)}</span><a href="${path.basename(s.fichier, '.png')}.html">${esc(s.titre)}</a></li>`)
  .join('')}</ul>
</body></html>`
fs.writeFileSync(path.join(OUT, 'index.html'), index)
console.log('index')
