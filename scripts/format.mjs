import { execFileSync } from 'node:child_process';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

// Git supplies exact paths (NUL-separated); no shell expansion or staging of files.
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
let write = false;
let all = false;
let base = process.env.FORMAT_BASE || 'HEAD';
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (arg === '--write') write = true;
  else if (arg === '--all') all = true;
  else if (arg === '--base' && args[index + 1] && !args[index + 1].startsWith('-')) base = args[++index];
  else throw new Error(`Неизвестный или неполный аргумент: ${arg}`);
}

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    cwd: root,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

// A first push of a branch has an all-zero "before" SHA.
if (/^0+$/.test(base)) base = 'HEAD^';
const revision = all ? null : git('rev-parse', '--verify', '--end-of-options', `${base}^{commit}`).trim();
const paths = all
  ? git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
  : git('diff', '--name-only', '-z', '--diff-filter=ACMR', revision, '--') +
    git('ls-files', '-z', '--others', '--exclude-standard');

let checked = 0;
let changed = 0;
for (const file of [...new Set(paths.split('\0').filter(Boolean))].sort()) {
  const stat = await lstat(file).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (!stat?.isFile()) continue;
  const info = await prettier.getFileInfo(file, { ignorePath: ['.gitignore', '.prettierignore'] });
  if (info.ignored || !info.inferredParser) continue;
  checked++;
  const options = { ...(await prettier.resolveConfig(file)), filepath: file };
  const source = await readFile(file, 'utf8');
  if (await prettier.check(source, options)) continue;
  changed++;
  if (write) await writeFile(file, await prettier.format(source, options));
  console.log(`${write ? 'Отформатирован' : 'Нужно форматирование'}: ${file}`);
}

console.log(`Prettier: проверено ${checked}; ${write ? 'исправлено' : 'требуют форматирования'} ${changed}.`);
if (!checked)
  console.log('Нет изменённых поддерживаемых файлов. Для коммитов укажи --base <commit>; для всех файлов — --all.');
if (!write && changed) process.exitCode = 1;
