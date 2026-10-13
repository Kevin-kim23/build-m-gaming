'use strict';
const CHECKS=new Set(['request-policy','transport-options','redirect','response-shape','unreachable',
  'region-identity','pagination','region-count','database-location','index-definition','index-match',
  'index-ready','index-missing','unexpected-resource','cli-request','response-decoding','unknown-check']);
const TRANSPORTS=new Set(['dns','connection','timeout','tls','aborted','other']);
function transportKind(error) {
  // Never classify by message/URL; only exact standard error codes.
  const code=error?.cause?.code??error?.code;
  if(['ENOTFOUND','EAI_AGAIN'].includes(code))return 'dns';
  if(['ECONNRESET','ECONNREFUSED','ENETUNREACH','EHOSTUNREACH','UND_ERR_SOCKET'].includes(code))return 'connection';
  if(['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT'].includes(code)||error?.name==='TimeoutError')return 'timeout';
  if(['CERT_HAS_EXPIRED','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_TLS_CERT_ALTNAME_INVALID'].includes(code))return 'tls';
  if(error?.name==='AbortError')return 'aborted';
  return 'other';
}
function createDiagnostics(output) {
  let failed=false,attempted=false,status;
  const check=value=>CHECKS.has(value)?value:'unknown-check';
  const failure=details=>{if(!failed){failed=true;output.emit('guard-diagnostic',details);}};
  return {
    reset(){failed=false;attempted=false;status=undefined;},
    attempted(){attempted=true;},
    blocked(beforeTransport,name){failure({category:'guard-blocked',beforeTransport,check:check(name)});},
    transport(error){failure({category:'transport-failed',transport:transportKind(error)});},
    http(value){
      if(!Number.isInteger(value)||value<100||value>599)return this.validation('response-shape');
      status=value;output.emit('guard-diagnostic',{category:'http-response',status:value});
      if(value>=300)failed=true;
    },
    validation(name){failure({category:'validation-failed',check:check(name)});},
    fallback(){if(!failed)failure({category:'unclassified',beforeTransport:!attempted,responseReceived:status!==undefined});}
  };
}
module.exports={createDiagnostics,transportKind,CHECKS,TRANSPORTS};
