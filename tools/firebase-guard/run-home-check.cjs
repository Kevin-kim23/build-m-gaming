'use strict';
const path=require('node:path');
function resolveHomeCli(nodeExecutable) {
  if(typeof nodeExecutable!=='string'||!path.isAbsolute(nodeExecutable)||path.basename(nodeExecutable).toLowerCase()!=='node.exe')throw new Error('GUARD_HOME_CHECK');
  const nodeDir=path.dirname(nodeExecutable),container=path.dirname(nodeDir);
  if(!/^node-v22\.\d+\.\d+-win-x64$/i.test(path.basename(nodeDir))||path.basename(container)!=='node22')throw new Error('GUARD_HOME_CHECK');
  return path.join(path.dirname(container),'firebase-cli-15.33.0','node_modules','firebase-tools');
}
if(require.main===module) {
  try {
    if(process.platform!=='win32'||!process.versions.node.startsWith('22.')||process.argv.length!==2)throw new Error('GUARD_HOME_CHECK');
    // Resolve from the Node executable already running, not a shell profile variable.
    // No authentication, config migration, file writes or browser launch.
    const cliDir=resolveHomeCli(process.execPath),repo=path.resolve(__dirname,'../..');
    if(cliDir.toLowerCase().startsWith(repo.toLowerCase()+path.sep))throw new Error('GUARD_HOME_CHECK');
    process.argv=[process.execPath,require.resolve('./selftest-login-cli.cjs'),cliDir];
    require('./selftest-login-cli.cjs');
  } catch {process.stdout.write('{"homeCheck":"failed"}\n');process.exitCode=1;}
}
module.exports={resolveHomeCli};
