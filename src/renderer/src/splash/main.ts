/**
 * Start-up window (D-056). Only the strings of the shell are read, not the whole interface:
 * the window must appear at once. `?first` marks the first launch, when the classics load.
 */
import logoUrl from '@renderer/assets/logo-512.png'
import { shell } from '@renderer/i18n/fr/shell'
import { frenchSpaces } from '@renderer/i18n/typography'

const first = new URLSearchParams(window.location.search).has('first')
const status = document.getElementById('status')
if (status) status.textContent = frenchSpaces(first ? shell.splash.firstLaunch : shell.splash.opening)
const logo = document.getElementById('logo')
if (logo instanceof HTMLImageElement) logo.src = logoUrl
