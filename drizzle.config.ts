import { defineConfig } from 'drizzle-kit'

// As migrations são geradas a partir do schema tipado e aplicadas no
// processo principal do Electron durante a inicialização do app.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/database/schema.ts',
  out: './src/main/database/migrations',
  verbose: true,
  strict: true
})
