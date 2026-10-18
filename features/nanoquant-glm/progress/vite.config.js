import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const tasksPath = resolve(here, '../tasks.md')

function tasksMd() {
  const serve = (req, res, next) => {
    const path = req.url?.split('?')[0]
    if (path !== '/tasks.md') return next()
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(readFileSync(tasksPath))
  }
  return {
    name: 'tasks-md',
    configureServer(server) {
      server.middlewares.use(serve)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve)
    }
  }
}

export default defineConfig({
  plugins: [svelte(), tasksMd()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true }
})
