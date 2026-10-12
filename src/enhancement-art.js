import { artSurface, brush } from './pixel-detail.js';
export function advancedEquipmentSprite(base,level){
  const canvas=artSurface(110,62),c=canvas.getContext('2d'),r=brush(c),tier=Math.min(10,level-10),red=level>20;
  const glow=level>40?'#d2f4ff':level>30?'#ac89ff99':red?'#f4514199':tier>=6?'#80e7e499':'#efcf7788',metal=level>40?'#d2f4ff':level>30?'#e1cdff':red?'#efbd73':tier>=6?'#a8eee2':'#efcf85';
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
  if(level>=20){r(50,10,11,2,'#fcecb7');r(52,7,2,6,metal);r(58,7,2,6,metal);r(55,6,1,6,'#fff9d8');}
  // Ten bounded ruby-inlaid plates, with gold bevels and a bright core at +30.
  if(red) {
    for(let i=0;i<Math.min(10,level-20);i++) {
      const x=23+(i%5)*14,y=26+Math.floor(i/5)*16;
      r(x,y,9,5,'#74352a');r(x,y,9,1,metal);r(x,y+1,1,3,'#ffdca2');
      r(x+2,y+1,6,3,'#c75140');r(x+3,y+1,3,1,'#ff9b6d');r(x+3,y+4,5,1,'#e6a257');
    }
    r(31,53,48,1,'#ff9470');
    if(level>=30){r(50,9,11,3,'#d86043');r(53,6,5,7,'#ffd98b');r(54,7,3,4,'#fff0c4');}
    for(let i=0;i<Math.min(10,level-30);i++) {
      const x=16+(i%5)*18,y=14+Math.floor(i/5)*32;
      r(x,y,6,4,'#503474');r(x,y,6,1,metal);r(x+2,y+1,2,2,'#e9e0ff');
    }
  }
  return canvas;
}
export function overheadEnhancement(c,level){
  if(level<=10)return;
  const r=brush(c),metal=level>40?'#d2f4ff':level>30?'#e1cdff':level>20?'#efbd73':level>=16?'#a8eee2':'#efcf85';
  for(let n=0;n<Math.min(10,level-10);n++){const x=n%2?41:11,y=17+Math.floor(n/2)*8;r(x,y,4,1,metal);r(x+1,y-1,1,4,'#fff5bd');}
  for(let n=0;n<Math.min(10,level-20);n++){
    const x=n%2?34:18,y=19+Math.floor(n/2)*8;
    r(x,y,5,4,'#74352a');r(x,y,5,1,metal);r(x+1,y+1,3,2,'#d65a46');r(x+1,y+1,1,1,'#ffca8b');
  }
  for(let n=0;n<Math.min(10,level-30);n++){
    const x=n%2?39:12,y=17+Math.floor(n/2)*8;
    r(x,y,4,3,'#644586');r(x+1,y,2,2,'#eee4ff');
  }
}
