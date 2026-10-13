'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {CLI_VERSION}=require('./constants.cjs');
function checkSource(cliDir) {
  const manifest=require('./source-fingerprints.json');
  const pkg=JSON.parse(fs.readFileSync(path.join(cliDir,'package.json'),'utf8'));
  if(pkg.name!=='firebase-tools'||pkg.version!==CLI_VERSION)throw new Error('GUARD_SOURCE_MISMATCH');
  for(const [relative,hash] of Object.entries(manifest.files)) {
    const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(cliDir,relative))).digest('hex');
    if(actual!==hash)throw new Error('GUARD_SOURCE_MISMATCH');
  }
  return true;
}
module.exports={checkSource};
