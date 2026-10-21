/**
 * Grava a versao do build em dois lugares, antes do `next build`:
 *  - `public/version.json` — sempre a versao do servidor;
 *  - `lib/build-version.ts` — a versao congelada no pacote (bundle) desta aba.
 *
 * E o que permite a uma aba aberta ha dias descobrir que saiu versao nova: o
 * bundle carrega BUILD_VERSION congelada; version.json responde a do servidor.
 * Divergiu, saiu versao nova (ver components/AutoUpdate.tsx).
 *
 * A versao vem de NWBASSET_BUILD_VERSION (o commit, se o build passar). Sem
 * ela cai no horario do build, que serve igual: o que importa e mudar a cada
 * publicacao.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const versao =
  process.env.NWBASSET_BUILD_VERSION?.trim() ||
  new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

const raiz = process.cwd();

mkdirSync(join(raiz, 'public'), { recursive: true });
writeFileSync(
  join(raiz, 'public', 'version.json'),
  JSON.stringify({ version: versao, builtAt: new Date().toISOString() }, null, 2) + '\n',
);

mkdirSync(join(raiz, 'lib'), { recursive: true });
writeFileSync(
  join(raiz, 'lib', 'build-version.ts'),
  `// Gerado por scripts/gravar-versao.mjs no build. Nao editar a mao.\nexport const BUILD_VERSION = ${JSON.stringify(versao)};\n`,
);

console.log(`versao do build: ${versao}`);
