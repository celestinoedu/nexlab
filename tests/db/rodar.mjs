// Testes de banco do NexLab num Postgres LOCAL descartável (nunca o Supabase).
//
// Recria o banco `nexlab_test`, aplica a simulação do Supabase
// (supabase_shim.sql), todas as migrations em ordem e roda testes_banco.sql.
// Com --carga, também mede a leitura da Lista de OS com 30 mil OS.
//
// Uso:  npm run test:db            (ou: node tests/db/rodar.mjs --carga)
// Conexão: PGHOST (localhost), PGPORT (54329), PGUSER (postgres) e PSQL
// (caminho do psql; padrão: PostgreSQL 18 no Windows ou `psql` no PATH).
// Ver tests/README.md para criar o cluster local.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const raiz = join(aqui, '..', '..')
const psqlWindows = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe'
const PSQL = process.env.PSQL || (existsSync(psqlWindows) ? psqlWindows : 'psql')
const conexao = ['-h', process.env.PGHOST || 'localhost', '-p', process.env.PGPORT || '54329', '-U', process.env.PGUSER || 'postgres']
const BANCO = 'nexlab_test'

function psql(args, { banco = BANCO, pararNoErro = true } = {}) {
  return execFileSync(PSQL, [...conexao, '-d', banco, '-X', '-q', ...(pararNoErro ? ['-v', 'ON_ERROR_STOP=1'] : []), ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PGCLIENTENCODING: 'UTF8' },
  })
}

function aplicar(arquivo) {
  try {
    psql(['-f', arquivo])
  } catch (erro) {
    console.error(`FALHOU ao aplicar ${arquivo}\n${erro.stderr || erro.message}`)
    process.exit(2)
  }
}

psql(['-c', `drop database if exists ${BANCO}`, '-c', `create database ${BANCO}`], { banco: 'postgres' })
aplicar(join(aqui, 'supabase_shim.sql'))
const pasta = join(raiz, 'supabase', 'migrations')
const migrations = readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort()
for (const m of migrations) aplicar(join(pasta, m))
console.log(`${migrations.length} migrations aplicadas (${migrations[0]} … ${migrations.at(-1)})\n`)

const saida = psql(['-At', '-f', join(aqui, 'testes_banco.sql')], { pararNoErro: false })
const linhas = saida.split(/\r?\n/).filter((l) => /^(PASS|FAIL) /.test(l) || /passaram$/.test(l))
console.log(linhas.join('\n'))
const falhas = linhas.filter((l) => l.startsWith('FAIL'))

if (process.argv.includes('--carga')) {
  aplicar(join(aqui, 'carga.sql'))
  const medicao = psql(['-At', '-f', join(aqui, 'medir.sql')])
  const tempos = medicao.match(/Execution Time: [\d.]+ ms/g) ?? []
  console.log(`\nCarga (30 mil OS): lista de OS ${tempos[0] ?? '?'} · contagem de itens ${tempos[1] ?? '?'}`)
}

process.exit(falhas.length ? 1 : 0)
