import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Root npm ci also installs the independent Functions package from its lock.
// Use the running npm/Node pair directly; no Windows .cmd shell or global install.
const npmCli=process.env.npm_execpath;
if(!npmCli) {
  console.error('Run this installer through npm install/ci, or run npm ci --prefix server explicitly.');
  process.exitCode=1;
} else {
  const server=fileURLToPath(new URL('../server/',import.meta.url));
  const result=spawnSync(process.execPath,[npmCli,'ci','--prefix',server],{stdio:'inherit',shell:false});
  if(result.error)console.error('Server dependency installation could not start.');
  process.exitCode=result.status??1;
}
