import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { LICENCES_FILE, shippedLicences } from './licenses'

it('the licences of « À propos » follow package-lock.json (npm run licenses)', () => {
  const lock = JSON.parse(
    readFileSync(path.resolve(__dirname, '../package-lock.json'), 'utf8'),
  ) as Parameters<typeof shippedLicences>[0]
  expect(JSON.parse(readFileSync(LICENCES_FILE, 'utf8'))).toEqual(shippedLicences(lock))
})
