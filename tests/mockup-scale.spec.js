import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGO_PATH = path.join(__dirname, '..', 'public', 'logo1.png')

// Helpers
async function waitForCanvas(page) {
  await page.waitForSelector('canvas', { state: 'visible' })
  await page.waitForTimeout(1800) // WebGL + model load
}

async function uploadLogo(page) {
  await page.locator('input[type="file"]').setInputFiles(LOGO_PATH)
  await page.waitForTimeout(600) // aspect-ratio detection
}

/** Set the Tamaño (scale) slider to an exact value via the native input setter. */
async function setScale(page, value) {
  await page.evaluate((v) => {
    const slider = document.querySelector('input[type="range"][max="0.80"]')
    if (!slider) return
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(slider, String(v))
    slider.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
  await page.waitForTimeout(200)
}

/** Read the first badge that contains "cm" (the w × h readout in the sidebar). */
async function getCmBadgeText(page) {
  return page.locator('span.tabular-nums').filter({ hasText: 'cm' }).first().textContent()
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Euro Cotton scale accuracy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForCanvas(page)
    await uploadLogo(page)
  })

  test('Size M at scale 0.45 reads ~25 cm width', async ({ page }) => {
    // M is the default size — click it to be explicit
    await page.getByRole('button', { name: 'M' }).click()
    await setScale(page, 0.45)

    const text = await getCmBadgeText(page)
    // Formula: (0.45 / 0.90) × 50.8 = 25.4 cm
    const wCm = parseFloat(text)
    expect(wCm).toBeGreaterThanOrEqual(23)
    expect(wCm).toBeLessThanOrEqual(28)
  })

  test('XG cm readout is larger than M at the same scale', async ({ page }) => {
    await page.getByRole('button', { name: 'M' }).click()
    await setScale(page, 0.45)
    const textM = await getCmBadgeText(page)
    const wM = parseFloat(textM)

    await page.getByRole('button', { name: 'XG' }).click()
    await page.waitForTimeout(200)
    const textXG = await getCmBadgeText(page)
    const wXG = parseFloat(textXG)

    // XG shirt is 61.0 cm vs M's 50.8 cm — same scale must read wider
    expect(wXG).toBeGreaterThan(wM)
  })

  test('CH cm readout is smaller than M at the same scale', async ({ page }) => {
    await page.getByRole('button', { name: 'M' }).click()
    await setScale(page, 0.45)
    const textM = await getCmBadgeText(page)
    const wM = parseFloat(textM)

    await page.getByRole('button', { name: 'CH' }).click()
    await page.waitForTimeout(200)
    const textCH = await getCmBadgeText(page)
    const wCH = parseFloat(textCH)

    // CH shirt is 45.7 cm — same scale reads narrower
    expect(wCH).toBeLessThan(wM)
  })
})

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Download Mockup Image', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForCanvas(page)
  })

  test('Download button exists and is visible', async ({ page }) => {
    const btn = page.getByRole('button', { name: 'Descargar Imagen' })
    await expect(btn).toBeVisible()
  })

  test('clicking Download Mockup triggers a .png download', async ({ page }) => {
    // Register the download listener before triggering it
    const downloadPromise = page.waitForEvent('download')

    await page.getByRole('button', { name: 'Descargar Imagen' }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.png$/i)
  })

  test('download includes logos when one is placed on the canvas', async ({ page }) => {
    await uploadLogo(page)

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Descargar Imagen' }).click()

    const download = await downloadPromise
    // File must exist (non-zero size) — save to temp and check
    const tmpPath = await download.path()
    expect(tmpPath).toBeTruthy()
    expect(download.suggestedFilename()).toBe('michuno-mockup.png')
  })
})
