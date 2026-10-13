'use strict';
// Raw text is never an authorization or success signal. Only callers holding emit
// can produce one of these fixed, non-personal events.
const EVENTS=new Set(['admin-account-ok','guard-ready','projects-list-ok','inventory-ok','not-logged-in','login-waiting','login-completed','login-failed','request-blocked','file-write-blocked','child-blocked','warning-stopped','node-mismatch','sdk-warning','command-failed','configuration-invalid','source-mismatch']);
function createOutput(write) {
  return Object.freeze({
    discard(_chunk,_encoding,callback) {
      if(typeof _encoding==='function')callback=_encoding;
      if(typeof callback==='function')queueMicrotask(callback);
      return true;
    },
    emit(event,details={}) {
      if(!EVENTS.has(event))throw new Error('GUARD_INVALID_EVENT');
      const output={event};
      if(event==='admin-account-ok') {
        if(!['moderation-caller','moderation-runtime'].includes(details.account)||
          typeof details.exists!=='boolean'||typeof details.disabled!=='boolean')throw new Error('GUARD_INVALID_EVENT');
        output.account=details.account;output.exists=details.exists;output.disabled=details.disabled;
      }
      if(event==='projects-list-ok') {
        if(!Number.isSafeInteger(details.count)||details.count<0||details.count>100000||typeof details.devVisible!=='boolean')throw new Error('GUARD_INVALID_EVENT');
        output.count=details.count;output.devVisible=details.devVisible;
      }
      if(event==='inventory-ok') {
        if(!Number.isSafeInteger(details.count)||details.count<0||details.count>100000)throw new Error('GUARD_INVALID_EVENT');
        output.count=details.count;
      }
      write(JSON.stringify(output)+'\n');
    }
  });
}
function installOutput() {
  const stdout=process.stdout.write,stderr=process.stderr.write;
  const output=createOutput(stdout.bind(process.stdout));
  process.stdout.write=output.discard;
  process.stderr.write=output.discard;
  return {...output,restore(){process.stdout.write=stdout;process.stderr.write=stderr;}};
}
module.exports={createOutput,installOutput};
