/**
 * Portable version of Shakery (D-056): the folder built by electron-builder (dist/win-unpacked),
 * zipped under « Shakery/ » with a « Shakery Data » folder beside Shakery.exe. That folder makes
 * the copy portable: Shakery keeps its notebook, backups and logs in it (src/main/paths.ts).
 * Unzipped once, the copy starts as fast as the installed one, unlike a self-extracting
 * executable that unpacks itself at every launch.
 *
 * Usage, after electron-builder: npx tsx scripts/release/portable-zip.ts
 */
import { createWriteStream, readFileSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import yazl from 'yazl'

const ROOT = path.resolve(__dirname, '..', '..')
const UNPACKED = path.join(ROOT, 'dist', 'win-unpacked')
const FOLDER = 'Shakery'
const DATA_FOLDER = 'Shakery Data'

const README = [
  'Ce dossier contient ton carnet Shakery : fiches, dégustations, photos, sauvegardes et journal.',
  '',
  'Garde-le à côté de Shakery.exe. Tant qu’il est là, Shakery fonctionne en version portable et range tout ici,',
  'sans rien écrire ailleurs sur le PC. Tu peux emporter le dossier Shakery entier sur une clé USB.',
  '',
  'Pour passer à une nouvelle version, décompresse son archive portable au même endroit en remplaçant les fichiers :',
  'ce dossier reste en place, et ton carnet avec lui.',
  '',
].join('\r\n')

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name)
      return entry.isDirectory() ? files(full) : Promise.resolve([full])
    }),
  )
  return nested.flat()
}

async function main(): Promise<void> {
  const { version } = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { version: string }
  const target = path.join(ROOT, 'dist', `Shakery-${version}-portable.zip`)
  const zip = new yazl.ZipFile()
  const all = await files(UNPACKED)
  for (const file of all) {
    const inside = path.relative(UNPACKED, file).split(path.sep).join('/')
    zip.addFile(file, `${FOLDER}/${inside}`)
  }
  zip.addBuffer(
    Buffer.from(`${String.fromCharCode(0xfeff)}${README}`, 'utf8'),
    `${FOLDER}/${DATA_FOLDER}/LISEZMOI.txt`,
  )
  zip.end()
  await new Promise<void>((resolve, reject) => {
    zip.outputStream.pipe(createWriteStream(target)).on('close', resolve).on('error', reject)
  })
  console.log(`${path.relative(ROOT, target)}: ${String(all.length)} files`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
