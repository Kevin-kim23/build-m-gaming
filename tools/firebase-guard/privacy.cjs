'use strict';
// Raw text is never an authorization or success signal. Only callers holding emit
// can produce one of these fixed, non-personal events.
const EVENTS=new Set(['admin-account-ok','guard-ready','projects-list-ok','inventory-ok','not-logged-in','login-waiting','login-completed','login-failed','request-blocked','file-write-blocked','child-blocked','warning-stopped','node-mismatch','sdk-warning','command-failed','configuration-invalid','source-mismatch']);
for(const event of ['inventory-stage-start','inventory-stage-ok','inventory-stage-failed','inventory-unexpected'])EVENTS.add(event);
EVENTS.add('guard-diagnostic');
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
      if(event==='guard-diagnostic') {
        const {CHECKS,TRANSPORTS}=require('./diagnostics.cjs');
        const {category}=details;
        if(!['guard-blocked','transport-failed','http-response','validation-failed','unclassified'].includes(category))throw new Error('GUARD_INVALID_EVENT');
        output.category=category;
        if(category==='guard-blocked'||category==='unclassified') {
          if(typeof details.beforeTransport!=='boolean')throw new Error('GUARD_INVALID_EVENT');
          output.beforeTransport=details.beforeTransport;
        }
        if(category==='unclassified') {
          if(typeof details.responseReceived!=='boolean')throw new Error('GUARD_INVALID_EVENT');
          output.responseReceived=details.responseReceived;
        }
        if(category==='guard-blocked'||category==='validation-failed') {
          if(!CHECKS.has(details.check))throw new Error('GUARD_INVALID_EVENT');
          output.check=details.check;
        }
        if(category==='transport-failed') {
          if(!TRANSPORTS.has(details.transport))throw new Error('GUARD_INVALID_EVENT');
          output.transport=details.transport;
        }
        if(category==='http-response') {
          if(!Number.isInteger(details.status)||details.status<100||details.status>599)throw new Error('GUARD_INVALID_EVENT');
          output.status=details.status;
        }
      }
      if(event.startsWith('inventory-stage-')||event==='inventory-unexpected') {
        if(!['run','scheduler','database','indexes'].includes(details.kind))throw new Error('GUARD_INVALID_EVENT');
        output.kind=details.kind;
        if(event==='inventory-stage-ok'||event==='inventory-unexpected') {
          if(!Number.isSafeInteger(details.count)||details.count<0||details.count>100000)throw new Error('GUARD_INVALID_EVENT');
          output.count=details.count;
        }
        if(event==='inventory-stage-ok') {
          if(!Number.isSafeInteger(details.regions)||details.regions<1||details.regions>1000)throw new Error('GUARD_INVALID_EVENT');
          output.regions=details.regions;
        }
      }
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
