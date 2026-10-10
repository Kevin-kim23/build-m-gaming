import { COUNTRIES,continentForProgress } from './campaign.js';
export const polygonPath=points=>'M'+points.map(p=>p.map(n=>Number(n.toFixed(2))).join(',')).join('L')+'Z';
export function bounds(points){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
export function inside([x,y],polygon){
  let result=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [ax,ay]=polygon[i],[bx,by]=polygon[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)result=!result;
  }return result;
}
// Half-plane clipping creates shared, gap-free borders; the country clip supplies the coastline.
function clip(poly,a,b,c){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],dp=a*p[0]+b*p[1]-c,dq=a*q[0]+b*q[1]-c;
    if(dp<=0)out.push(p);
    if((dp<=0)!==(dq<=0)){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }return out;
}
const regions=new Map();
export function countryRegions(id){
  if(regions.has(id))return regions.get(id);
  const country=COUNTRIES.find(c=>c.id===id);if(!country)throw new RangeError('Unknown country');
  const b=bounds(country.polygon),seeds=[];
  for(let row=0;row<5;row++)for(let col=0;col<4;col++){
    const reverse=row%2===1,gridCol=reverse?3-col:col;
    let x=b.x+b.width*(.2+gridCol*.2)+Math.sin(row*5+col*3+country.index)*13;
    let y=b.y+b.height*(.87-row*.175)+Math.cos(row*4+col+country.index)*12;
    // Pull points away from irregular coastal notches, preserving the serpentine route.
    while(!inside([x,y],country.polygon)){x+=(b.x+b.width*.5-x)*.1;y+=(b.y+b.height*.5-y)*.1;}
    seeds.push([x,y]);
  }
  const result=seeds.map((p,i)=>{
    let poly=[[0,0],[1000,0],[1000,2500],[0,2500]];
    for(const [j,q] of seeds.entries())if(i!==j)poly=clip(poly,2*(q[0]-p[0]),2*(q[1]-p[1]),q[0]**2+q[1]**2-p[0]**2-p[1]**2);
    return Object.freeze({id:country.firstStage+i,number:i+1,point:Object.freeze(p),polygon:Object.freeze(poly)});
  });regions.set(id,Object.freeze(result));return regions.get(id);
}
export function clampCamera(camera){
  const width=Math.min(2600,Math.max(360,camera.width)),height=camera.height/camera.width*width;
  return {...camera,width,height,x:width>1640?(1000-width)/2:Math.max(-320,Math.min(1320-width,camera.x)),y:height>2680?(2480-height)/2:Math.max(-100,Math.min(2580-height,camera.y))};
}
export function countryCamera(country,aspect){
  const b=bounds(country.polygon),width=Math.max(b.width+85,(b.height+100)*aspect);
  return clampCamera({x:b.x+b.width/2-width/2,y:b.y+b.height/2-width/aspect/2,width,height:width/aspect});
}
export function campaignHomeCamera(cleared,aspect,continentId=continentForProgress(cleared).id){
  const countries=COUNTRIES.filter(c=>c.continentId===continentId);
  const focus=countries[Math.max(0,Math.min(3,Math.floor((cleared-countries[0].firstStage+1)/20)))],width=Math.min(2600,Math.max(1150,1250*aspect));
  return clampCamera({width,height:width/aspect,x:500-width/2,y:focus.label[1]-width/aspect/2});
}
