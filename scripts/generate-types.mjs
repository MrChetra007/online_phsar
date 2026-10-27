import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const projectId = process.env.SUPABASE_PROJECT_ID ?? 'wdbelxrhvkikrncsgshg'
if (!/^[a-z0-9]+$/.test(projectId)) {
  throw new Error('SUPABASE_PROJECT_ID must be a lowercase project ref')
}
const output = fileURLToPath(
  new URL('../src/lib/database.types.ts', import.meta.url),
)

const types = execSync(
  `npx --yes supabase gen types typescript --project-id ${projectId} --schema public`,
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
)

writeFileSync(output, types.replace(/^\uFEFF/, ''), 'utf8')
console.log(`Generated ${output}`)
