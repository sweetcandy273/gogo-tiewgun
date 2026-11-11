import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

const SKIP = new Set(['sw.js', '_redirects', '_headers'])

/** URLs to precache, from paths relative to the build dir. */
export function precacheList(files: readonly string[]): string[] {
  const urls = files
    .map((f) => f.split(sep).join('/'))
    .filter((f) => !SKIP.has(f) && !f.endsWith('.map') && !f.startsWith('.'))
    .map((f) => '/' + f)
  return [...new Set(urls)].sort()
}

export function renderServiceWorker(template: string, version: string, urls: readonly string[]): string {
  if (!/^[a-f0-9]{8,64}$/.test(version)) throw new Error(`bad sw version: ${version}`)
  return template
    .replace("'__VERSION__'", JSON.stringify(version))
    .replace('__PRECACHE__', JSON.stringify(urls))
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (e.isFile()) out.push(p)
  }
  return out
}

/** Writes dist/sw.js that precaches every built file (app shell, fonts, trip photos). */
export function serviceWorker(): Plugin {
  let outDir = 'dist'
  return {
    name: 'gogo-service-worker',
    apply: 'build',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir) },
    async closeBundle() {
      const abs = await walk(outDir)
      const rel = abs.map((p) => relative(outDir, p))
      const urls = precacheList(rel)
      const hash = createHash('sha256')
      for (const u of urls) {
        hash.update(u)
        hash.update(await readFile(join(outDir, u.slice(1))))
      }
      const template = await readFile(fileURLToPath(new URL('./sw.template.js', import.meta.url)), 'utf8')
      await writeFile(join(outDir, 'sw.js'), renderServiceWorker(template, hash.digest('hex').slice(0, 16), urls))
    },
  }
}
