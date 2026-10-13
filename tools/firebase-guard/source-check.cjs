'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {CLI_VERSION}=require('./constants.cjs');
const SOURCE_REASONS=Object.freeze(['path-invalid','manifest-unreadable','manifest-invalid','version-mismatch','source-unreadable','source-changed']);
function fail(reason){throw Object.assign(new Error('GUARD_SOURCE_MISMATCH'),{guardReason:reason});}
function checkSource(cliDir) {
  if(typeof cliDir!=='string'||!path.isAbsolute(cliDir))fail('path-invalid');
  const manifest=require('./source-fingerprints.json');
  let raw,pkg;
  try {raw=fs.readFileSync(path.join(cliDir,'package.json'),'utf8');}catch{fail('manifest-unreadable');}
  try {pkg=JSON.parse(raw);}catch{fail('manifest-invalid');}
  if(pkg?.name!=='firebase-tools'||pkg?.version!==CLI_VERSION)fail('version-mismatch');
  for(const [relative,hash] of Object.entries(manifest.files)) {
    let bytes;
    try {bytes=fs.readFileSync(path.join(cliDir,relative));}catch{fail('source-unreadable');}
    const actual=crypto.createHash('sha256').update(bytes).digest('hex');
    if(actual!==hash)fail('source-changed');
  }
  return true;
}
module.exports={checkSource,SOURCE_REASONS};
