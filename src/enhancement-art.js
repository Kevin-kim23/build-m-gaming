import { artSurface, brush } from './pixel-detail.js';
export function advancedEquipmentSprite(base,level){
  const canvas=artSurface(110,62),c=canvas.getContext('2d'),r=brush(c),tier=level-10;
  const glow=tier>=6?'#80e7e499':'#efcf7788',metal=tier>=6?'#a8eee2':'#efcf85';
  // Follow the silhouette so the glow does not become a rectangular backdrop.
  c.shadowColor=glow;c.shadowBlur=8+tier*2;
  c.drawImage(base,0,0,110,62);
  c.shadowBlur=0;c.shadowColor='transparent';
  for(let i=0;i<tier;i++){
    const x=18+i*8,y=19+(i%3)*10;
    r(x,y,6,1,metal);r(x,y,1,4,metal);r(x+1,y+1,4,.5,'#fff8d3');
    const sx=12+(i*17)%86,sy=9+(i%3)*15;
    r(sx,sy,1,5,'#fff6bc');r(sx-2,sy+2,5,1,metal);
  }
  r(30,53,50,1,metal);r(35,54,40,1,'#725b35');
  if(level===20){r(50,10,11,2,'#fcecb7');r(52,7,2,6,metal);r(58,7,2,6,metal);r(55,6,1,6,'#fff9d8');}
  return canvas;
}
export function overheadEnhancement(c,level){
  if(level<=10)return;
  const r=brush(c),metal=level>=16?'#a8eee2':'#efcf85';
  for(let n=0;n<level-10;n++){const x=n%2?41:11,y=17+Math.floor(n/2)*8;r(x,y,4,1,metal);r(x+1,y-1,1,4,'#fff5bd');}
}
