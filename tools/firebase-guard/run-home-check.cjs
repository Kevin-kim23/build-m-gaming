'use strict';
const path=require('node:path');
function resolveHomeCli(profile) {
  if(typeof profile!=='string'||!path.isAbsolute(profile))throw new Error('GUARD_HOME_CHECK');
  return path.join(profile,'AppData','Local','BudaeKiugiTools','firebase-15.33.0','node_modules','firebase-tools');
}
if(require.main===module) {
  try {
    if(process.platform!=='win32'||!process.versions.node.startsWith('22.')||process.argv.length!==2)throw new Error('GUARD_HOME_CHECK');
    // Fixed home installation: do not trust a stale LOCALAPPDATA in an old shell.
    // No authentication, config migration, file writes or browser launch.
    process.argv=[process.execPath,require.resolve('./selftest-login-cli.cjs'),resolveHomeCli(process.env.USERPROFILE)];
    require('./selftest-login-cli.cjs');
  } catch {process.stdout.write('{"homeCheck":"failed"}\n');process.exitCode=1;}
}
module.exports={resolveHomeCli};
