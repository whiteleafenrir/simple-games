import { spawn } from 'node:child_process';
import { devUrls } from './lib/dev-urls.mjs';

const selected = process.argv[2] || 'all';
const names = selected === 'all' ? ['game', 'api', 'studio'] : [selected];
for (const name of names) {
  const url = devUrls[name];
  if (!url) {
    console.error('Выберите all, game, api, health или studio.');
    process.exitCode = 1;
    break;
  }
  const child = process.platform === 'win32'
    ? spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { windowsHide: true, stdio: 'ignore' })
    : spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' });
  child.on('error', () => console.log(`Откройте вручную: ${url}`));
  console.log(url);
}
