// Original visual profiles. Timings only affect presentation, never combat damage.
export const WEAPON_FX = Object.freeze({
  artillery:{style:'shell',color:'#ffd293',shots:1,travel:260,recoil:3},
  tank:{style:'slug',color:'#fff1bd',shots:1,travel:190,recoil:2},
  selfPropelled:{style:'howitzer',color:'#ffb16b',shots:1,travel:330,recoil:4},
  rocketLauncher:{style:'rockets',color:'#ff9958',shots:4,travel:200,recoil:1},
  helicopter:{style:'tracers',color:'#ffd890',shots:5,travel:120,recoil:.8},
  transport:{style:'supply',color:'#9df3c4',shots:1,travel:400,recoil:0},
  fighter:{style:'missiles',color:'#b4e5ff',shots:2,travel:180,recoil:1},
  railgunTank:{style:'rail',color:'#95edff',shots:1,travel:110,recoil:4},
  icbm:{style:'ballistic',color:'#ffad65',shots:1,travel:330,recoil:0},
  carrier:{style:'jets',color:'#c5f0fc',shots:3,travel:310,recoil:.5},
  flyingFortress:{style:'bombs',color:'#ffc06c',shots:3,travel:250,recoil:1},
  orbitalAssault:{style:'laser',color:'#9cecff',shots:1,travel:220,recoil:0},
  plasmaTank:{style:'plasma',color:'#bf92ff',shots:1,travel:250,recoil:3},
  droneCarrier:{style:'drones',color:'#7ff9df',shots:3,travel:300,recoil:.5},
  siegeMech:{style:'twin',color:'#e3b67b',shots:2,travel:290,recoil:5},
  stellarBomber:{style:'nova-bombs',color:'#efa4ff',shots:4,travel:220,recoil:1.2},
  novaCannon:{style:'nova',color:'#e3b2ff',shots:1,travel:250,recoil:0},
});
export function weaponRecoil(id,age){const p=WEAPON_FX[id];return !p||age<0||age>220?0:Math.sin(age/220*Math.PI)*p.recoil;}
export function headquartersDestructionTiming(battle,reduced=false){
  const side=battle.status==='victory'?'enemy':'player',attacker=side==='enemy'?'player':'enemy';
  const impactDelayMs=Math.max(0,...(battle.fx??[]).filter(f=>f.at===battle.elapsedMs&&f.side===attacker&&
    (f.kind==='strike'||(f.kind==='shot'&&(side==='enemy'?f.to>=1000:f.to<=0))))
    .map(f=>{const p=WEAPON_FX[f.id]??WEAPON_FX.artillery;return p.style==='rail'?70:p.travel;}));
  return {side,reduced,impactDelayMs,durationMs:impactDelayMs+(reduced?250:1500)};
}
export function headquartersDestructionFrame(timing,elapsed){
  return elapsed<timing.impactDelayMs?null:{side:timing.side,age:elapsed-timing.impactDelayMs,reduced:timing.reduced};
}
const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));};
function line(c,x,y,xx,yy,color,width){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
function ring(c,x,y,r,color,alpha=1){c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.ellipse(x,y,r,r*.6,0,0,Math.PI*2);c.stroke();}
function payload(c,x,y,color,bomb=false){
  box(c,x-3,y-7,6,14,'#213047');box(c,x-2,y-5,4,10,color);box(c,x-1,y-9,2,3,'#f3f8ff');
  box(c,x-6,y+3,12,3,'#93a4b7');box(c,x-1,y+6,2,bomb?3:8,bomb?'#d9ba78':'#ffc258');
}
export function drawWeaponShot(c,f,age,x,y0,y1){
  if(age<0||age>600)return;
  const p=WEAPON_FX[f.id]??WEAPON_FX.artillery;
  if(p.style==='supply'){drawSupportPulse(c,age,x,y0);return;}
  c.save();
  if(['rail','laser','nova'].includes(p.style)){
    const charge=p.style==='rail'?70:p.travel;
    if(age<charge){ring(c,x,y0,4+age/charge*10,p.color,.85);box(c,x-2,y0-2,4,4,'#ffffff');}
    else{const fade=Math.max(0,1-(age-charge)/(600-charge));c.globalAlpha=fade;
      line(c,x,y0,x,y1,p.style==='nova'?'#7342b6':'#357d9d',p.style==='nova'?16:9);
      line(c,x,y0,x,y1,p.color,p.style==='rail'?3:7);line(c,x,y0,x,y1,'#faffff',2);
      ring(c,x,y1,9+(1-fade)*30,p.color,fade);}
  }else{
    for(let i=0;i<p.shots;i++){
      const a=age-i*(p.shots>3?58:90);if(a<0||a>470)continue;
      const t=Math.min(1,a/p.travel),dx=(i-(p.shots-1)/2)*7,tx=x+dx;
      let y=y0+(y1-y0)*t;
      const arc=['shell','howitzer','ballistic'].includes(p.style)?Math.sin(t*Math.PI)*18:0;
      const px=tx+arc;
      c.globalAlpha=Math.min(1,Math.max(0,1-(a-p.travel)/220));
      if(t<1){
        if(['rockets','missiles','ballistic','bombs','nova-bombs'].includes(p.style)){
          c.save();c.translate(px,y);if(y1>y0)c.rotate(Math.PI);payload(c,0,0,p.color,p.style.includes('bomb'));c.restore();
          line(c,px,y,px-(arc*.2),y+(y1<y0?16:-16),'#d8d1c080',2);
        }else if(p.style==='jets'||p.style==='drones'){
          box(c,px-6,y-2,12,3,p.color);box(c,px-2,y-6,4,12,'#dfeaf1');box(c,px-1,y-4,2,3,p.color);
        }else if(p.style==='plasma'){
          ring(c,px,y,6,p.color,.9);box(c,px-3,y-3,6,6,'#f5dfff');line(c,px,y,px,y+12,p.color,3);
        }else {line(c,px,y,px,y+(y1<y0?9:-9),p.color,p.style==='tracers'?1.5:4);box(c,px-1,y-2,3,4,'#fffee8');}
      }else{
        const k=(a-p.travel)/220;ring(c,tx,y1,4+k*(p.style.includes('bomb')?24:16),p.color,Math.max(0,1-k));
        for(let j=0;j<6;j++)box(c,tx+Math.cos(j)*k*22,y1+Math.sin(j)*k*17,3,3,j%2?p.color:'#fff5d3');
      }
    }
    if(age<100){c.globalAlpha=1-age/100;box(c,x-5,y0-5,10,10,p.color);box(c,x-2,y0-2,4,4,'#fff9df');}
  }
  c.restore();
}

// Support pulses are driven by the transport's lastShotMs, not an attack event.
// A dropped supply crate and expanding green crosses communicate healing even
// when every ally is already healthy; this does not change the heal calculation.
export function drawSupportPulse(c,age,x,y){
  if(age<0||age>600)return;
  const t=age/600,drop=Math.min(1,age/260),cy=y-22+drop*20,color='#9df3c4';
  c.save();
  ring(c,x,y+5,7+t*30,color,Math.max(0,.85-t*.8));
  c.globalAlpha=Math.min(1,(1-t)*1.6);
  if(drop<1){
    c.strokeStyle='#dfefdc';c.lineWidth=1;
    c.beginPath();c.ellipse(x,cy-8,8,4,0,Math.PI,Math.PI*2);c.stroke();
    line(c,x-8,cy-8,x-4,cy,'#cedcc9',1);line(c,x+8,cy-8,x+4,cy,'#cedcc9',1);
  }
  box(c,x-6,cy-1,12,10,'#284837');box(c,x-5,cy,10,8,'#68aa83');
  box(c,x-5,cy,10,2,'#bae6bb');box(c,x-1,cy+1,2,6,'#f4fff0');box(c,x-3,cy+3,6,2,'#f4fff0');
  for(const side of [-1,1]){
    const px=x+side*(12+t*12),py=y-1-t*15;
    box(c,px-1,py-4,2,8,color);box(c,px-4,py-1,8,2,color);
  }
  c.restore();
}

export function drawHeadquartersDestruction(c,age,x,y,reduced=false){
  const duration=reduced?250:1500,t=Math.min(1,Math.max(0,age/duration));
  c.save();
  // Roof breaks into plates; the broad dust cloud remains after the flash.
  box(c,x-75,y-31,150,62,'#18202e');
  for(let i=0;i<20;i++){
    const angle=i*2.39996,d=(12+(i%5)*6)+Math.min(1,t*2)*45;
    const xx=x+Math.cos(angle)*d,yy=y+Math.sin(angle)*d*.45;
    box(c,xx,yy,7+i%4,4+i%3,i%3?'#59606d':'#9a8c78');
  }
  c.globalAlpha=Math.max(.18,1-t)*.7;
  for(let i=0;i<10;i++)box(c,x-75+i*16,y-20-Math.sin(i*5+t*2)*12,20+t*15,18+t*10,'#62606b');
  if(!reduced&&t<.65){
    for(let i=0;i<7;i++){
      const local=Math.max(0,t-i*.045),r=8+local*38;
      c.globalAlpha=Math.max(0,1-local*2);
      const xx=x+Math.sin(i*11)*54,yy=y+Math.cos(i*7)*20;
      box(c,xx-r/2,yy-r/2,r,r,'#ed7438');box(c,xx-r/3,yy-r/3,r*.67,r*.67,'#ffc965');box(c,xx-r/6,yy-r/6,r*.33,r*.33,'#fff2c9');
    }
    ring(c,x,y,20+t*170,'#f9c376',Math.max(0,.7-t));
  }
  c.restore();
}
