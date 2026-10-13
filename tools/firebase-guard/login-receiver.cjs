'use strict';
const http=require('node:http');
function createReceiver(session,{timeoutMs=300000,host='127.0.0.1'}={}) {
  if(host!=='127.0.0.1')throw new Error('GUARD_LOGIN_DENIED');
  let server,timer,used=false,started=false,resolveResult,rejectResult;
  const result=new Promise((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
  // Avoid an unhandled rejection while the browser is being launched.
  result.catch(()=>{});
  function close(){clearTimeout(timer);server?.close();server?.closeAllConnections();}
  const stop=()=>{session.stop();close();rejectResult(new Error('GUARD_LOGIN_DENIED'));};
  server=http.createServer((req,res)=>{
    if(used){res.destroy();stop();return;}
    used=true;
    server.close(); // Stop accepting new connections before exchanging any code.
    try {
      session.receive({method:req.method,host:req.headers.host,remoteAddress:req.socket.remoteAddress,url:req.url});
      res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Connection':'close'});
      res.end('대기',()=>{close();resolveResult();});
    } catch {
      res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Connection':'close'});
      res.end('실패',stop);
    }
  });
  server.on('clientError',(_error,socket)=>{socket.destroy();stop();});
  server.on('error',stop);
  return {
    async start() {
      if(started)throw new Error('GUARD_LOGIN_DENIED');
      started=true;
      await new Promise((resolve,reject)=>{
        server.once('error',reject);
        // Port 0 asks the OS for an available ephemeral port; no port scan/retry.
        server.listen({host,port:0,exclusive:true},()=>{
          server.removeListener('error',reject);
          try {
            const address=server.address();session.bind(address.address,address.port);
            resolve();
          } catch {stop();reject(new Error('GUARD_LOGIN_DENIED'));}
        });
      });
      timer=setTimeout(stop,timeoutMs);
    },
    result,close:stop,dispose:close,
    address:()=>server.address()
  };
}
module.exports={createReceiver};
