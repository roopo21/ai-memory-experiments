import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

export async function localStudio() {
  const server = await createServer({
    server: { host: '127.0.0.1', port: 0, open: false },
    logLevel: 'error',
  })
  await server.listen()
  return {
    url: 'http://127.0.0.1:' + server.httpServer.address().port,
    close: () => server.close(),
  }
}
export function launchBrowser() {
  const paths = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    chromium.executablePath(),
  ]
  const executablePath = paths.find((p) => p && existsSync(p))
  if (!executablePath) throw Error('Set CHROME_PATH to a Chrome or Chromium executable.')
  return chromium.launch({
    executablePath,
    args: process.platform === 'darwin' ? ['--use-angle=metal'] : ['--enable-unsafe-swiftshader'],
  })
}
