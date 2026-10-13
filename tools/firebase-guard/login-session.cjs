'use strict';
const crypto=require('node:crypto');
const {issuerFailureCode}=require('./login-issuer.cjs');
const {createPolicy,parseTarget}=require('./request-policy.cjs');
const AUTH='https://accounts.google.com/o/oauth2/auth';
const TOKEN='https://accounts.google.com/o/oauth2/token';
const SCOPES=Object.freeze(['email','openid','https://www.googleapis.com/auth/cloudplatformprojects.readonly',
  'https://www.googleapis.com/auth/firebase','https://www.googleapis.com/auth/cloud-platform']);
const fail=()=>{throw new Error('GUARD_LOGIN_DENIED');};
function validateLoginArguments(args) {
  if(!Array.isArray(args)||args.length!==2||args[0]!=='login'||args[1]!=='--localhost')fail();
}
function createLoginSession({args,clientId,clientSecret,scopes}) {
  validateLoginArguments(args);
  if(!clientId||!clientSecret||JSON.stringify(scopes)!==JSON.stringify(SCOPES))fail();
  const state=crypto.randomBytes(32).toString('hex'),base=createPolicy();
  let phase='created',port,code,posted=false,rejection=1;
  const stop=()=>{phase='closed';code=undefined;base.stop();};
  const deny=(reason=1)=>{if(rejection===1)rejection=reason;stop();fail();};
  const redirect=()=> 'http://localhost:'+port;
  function assert(request) {
    if(phase==='closed')return base.assert(request);
    let u;
    try {
      u=new URL(request.url);
      // OAuth scope/redirect query values legitimately contain encoded slashes.
      // Validate the address separately; every query value is compared below.
      parseTarget(u.origin+u.pathname);
      if(u.href!==request.url||u.username||u.password||u.hash||u.port||/[\s\\]/.test(request.url))return deny();
    } catch{return deny();}
    if(request.method==='GET'&&u.origin+u.pathname===AUTH&&phase==='waiting'&&request.body===undefined) {
      const expected={client_id:clientId,scope:SCOPES.join(' '),response_type:'code',state,redirect_uri:redirect()};
      if([...u.searchParams].length!==5||Object.entries(expected).some(([k,v])=>u.searchParams.get(k)!==v))return deny();
      return 'login-browser';
    }
    if(request.method==='POST'&&request.url===TOKEN&&phase==='received'&&!posted) {
      const b=request.body,expected={code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirect(),grant_type:'authorization_code'};
      if(!b||Object.keys(b).length!==5||Object.entries(expected).some(([k,v])=>b[k]!==v))return deny();
      posted=true;phase='exchanging';return 'login-exchange';
    }
    return deny();
  }
  return Object.freeze({
    bind(host,chosenPort) {
      if(phase!=='created'||host!=='127.0.0.1'||!Number.isInteger(chosenPort)||chosenPort<1024||chosenPort>65535)return deny();
      port=chosenPort;phase='waiting';
    },
    browserUrl() {
      if(phase!=='waiting')return deny();
      const query={client_id:clientId,scope:SCOPES.join(' '),response_type:'code',state,redirect_uri:redirect()};
      return AUTH+'?'+Object.entries(query).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
    },
    openBrowser(url,open) {
      assert({method:'GET',url});
      // A second browser launch is not allowed, even if the URL is unchanged.
      phase='listening';return open(url);
    },
    receive({method,host,remoteAddress,url}) {
      if(phase!=='listening')return deny(41);
      if(method!=='GET')return deny(42);
      if(!['localhost:'+port,'127.0.0.1:'+port].includes(host))return deny(43);
      if(remoteAddress!=='127.0.0.1')return deny(44);
      if(!url?.startsWith('/?'))return deny(45);
      if(/[\u0000-\u0020\u007f]/.test(url))return deny(46);
      let u;try{u=new URL(url,redirect());}catch{return deny(46);}
      const entries=[...u.searchParams],keys=entries.map(([k])=>k);
      if(u.origin!==redirect()||u.pathname!=='/'||u.hash)return deny(46);
      if(new Set(keys).size!==keys.length)return deny(47);
      if(u.searchParams.get('state')!==state)return deny(48);
      // Diagnostic categories only: these responses remain rejected.
      if(keys.includes('error'))return deny(u.searchParams.get('error')==='access_denied'?53:49);
      if(keys.some(k=>!['state','code','scope','authuser','prompt','hd','iss'].includes(k)))return deny(50);
      const issuerFailure=issuerFailureCode(u.searchParams.get('iss'));
      if(issuerFailure)return deny(issuerFailure);
      if(!u.searchParams.get('code')||u.searchParams.get('code').length>8192)return deny(51);
      code=u.searchParams.get('code');phase='received';
    },
    exchangeRequest() {
      if(phase!=='received')return deny();
      return {method:'POST',url:TOKEN,body:{code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirect(),grant_type:'authorization_code'}};
    },
    complete() {
      if(phase!=='exchanging')return deny();
      phase='closed';code=undefined;
    },
    rejectionCode:()=>rejection,
    stop,assert,isStopped:()=>base.isStopped(),mode:()=>phase==='closed'?'readonly':'login'
  });
}
module.exports={createLoginSession,validateLoginArguments,SCOPES,AUTH,TOKEN};
