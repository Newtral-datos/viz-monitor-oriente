import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import fs from 'fs'

const REPO_NAME = 'viz-monitor-oriente'

// Plugin que convierte archivos .csv en módulos JS (array de objetos)
function csvPlugin() {
  return {
    name: 'csv-loader',
    transform(code, id) {
      if (!id.endsWith('.csv')) return null

      const lines = code.split('\n').filter(l => l.trim())
      const headers = parseCSVLine(lines[0])
      const rows = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
      })

      return {
        code: `export default ${JSON.stringify(rows)}`,
        map: null,
      }
    },
  }
}

// Parser de línea CSV que respeta campos entrecomillados
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function geojsonPlugin() {
  return {
    name: 'geojson-loader',
    transform(code, id) {
      if (!id.endsWith('.geojson')) return null
      return {
        code: `export default ${code}`,
        map: null,
      }
    },
  }
}

export default defineConfig({
  plugins: [csvPlugin(), geojsonPlugin(), svelte()],
  base: process.env.NODE_ENV === 'production' ? `/${REPO_NAME}/` : '/',
})
