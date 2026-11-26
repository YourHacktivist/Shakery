/*
 * Rend une page HTML des planches en PNG avec l'Electron du projet.
 *
 *   npx electron design/planches/rendu.cjs <page.html> <sortie.png> [largeur] [hauteur|auto]
 *
 * Largeur et hauteur sont en pixels CSS (1440 × 900 par défaut, comme les captures de l'appli).
 * L'image sort à l'échelle 1,25, la même que les captures de Windows. Avec « auto », la hauteur
 * suit celle du document (planches composées).
 */
const { app, BrowserWindow } = require('electron')
const { resolve } = require('node:path')
const { writeFileSync } = require('node:fs')
const { pathToFileURL } = require('node:url')

const SCALE = 1.25
const [input, output, widthArg = '1440', heightArg = '900'] = process.argv.slice(2)

if (!input || !output) {
  console.error('Usage : npx electron design/planches/rendu.cjs <page.html> <sortie.png> [largeur] [hauteur|auto]')
  process.exit(1)
}

app.whenReady().then(async () => {
  const width = Number(widthArg)
  let height = heightArg === 'auto' ? 900 : Number(heightArg)
  const win = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    webPreferences: { offscreen: true, backgroundThrottling: false },
  })
  const cdp = win.webContents.debugger
  cdp.attach('1.3')
  const metrics = (h) =>
    cdp.sendCommand('Emulation.setDeviceMetricsOverride', { width, height: h, deviceScaleFactor: SCALE, mobile: false })
  await win.loadURL(pathToFileURL(resolve(input)).href)
  await metrics(height)
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)')
  if (heightArg === 'auto') {
    height = await win.webContents.executeJavaScript(
      'Math.ceil(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight))',
    )
    await metrics(height)
  }
  await new Promise((done) => setTimeout(done, 900))
  const shot = await cdp.sendCommand('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })
  writeFileSync(resolve(output), Buffer.from(shot.data, 'base64'))
  console.log(`${output} : ${Math.round(width * SCALE)} × ${Math.round(height * SCALE)}`)
  app.quit()
})
