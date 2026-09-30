import { RANK_DEFINITIONS } from './ranks.js';
const cache=new Map();
export function rankInsignia(index) {
  if(cache.has(index))return cache.get(index);
  const rank=RANK_DEFINITIONS[index];if(!rank)throw new RangeError('Unknown rank');
  const tier=['enlisted','nco','officer','field','general'].indexOf(rank.kind);
  const out=[],r=(x,y,w,h,c)=>out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  const metal=tier===2?'#bbcdd3':tier<2?'#c8ca9c':'#d6af61', shine=tier===2?'#f0f5e2':'#fff0b1',dark='#786139';
  if(tier<2){
    for(let i=0;i<rank.marks;i++) {
      const y=19+i*7;
      if(tier===0){r(20,y,32,4,metal);r(20,y,32,1,shine);r(20,y+4,32,1,dark);}
      else for(let n=0;n<8;n++){r(17+n*2,y+n/2,2,3,metal);r(53-n*2,y+n/2,2,3,metal);r(17+n*2,y+n/2,2,1,shine);r(53-n*2,y+n/2,2,1,shine);}
    }
  } else {
    const gap=tier===4?15:17,start=36-(rank.marks-1)*gap/2;
    for(let i=0;i<rank.marks;i++) {
      const x=start+i*gap,y=tier===4?21:24;
      if(tier===2){for(let n=0;n<6;n++){r(x-n,y+n,2*n+1,1,metal);r(x-n,y+11-n,2*n+1,1,metal);}r(x-1,y+2,2,7,shine);}
      else if(tier===3){r(x-2,y-3,5,17,metal);r(x-7,y+2,15,7,metal);r(x-5,y,11,11,metal);r(x-1,y+2,3,5,shine);r(x,y+5,2,3,dark);}
      else {r(x-1,y-5,3,18,metal);r(x-7,y,15,4,metal);r(x-4,y+4,9,5,metal);r(x-6,y+9,4,3,metal);r(x+3,y+9,4,3,metal);r(x-1,y-3,1,10,shine);r(x-5,y,10,1,shine);}
    }
    // Fictional wing-and-leaf ornament, not an official military emblem.
    const rows=tier===2?3:tier===3?4:5;
    for(let i=0;i<rows;i++){
      const y=42+i*3,reach=22-i*3;
      r(35-reach,y,reach-2,2,metal);r(38,y,reach-2,2,metal);
      r(35-reach,y,reach-2,.7,shine);r(38,y,reach-2,.7,shine);
    }
    r(33,42,7,9,metal);r(35,43,3,6,shine);
    if(tier>=3)for(let i=0;i<5;i++)for(const sign of [-1,1]){const x=36+sign*(26-i*3);r(x,37+i*4,3,5,metal);r(x,37+i*4,1,3,shine);}
    if(tier===4){r(26,62,20,2,metal);r(31,60,10,2,shine);r(34,55,5,4,metal);}
  }
  const html=`<span class="insignia rank-art ${rank.kind}" data-rank-kind="${rank.kind}"><svg viewBox="0 0 72 72" aria-hidden="true" shape-rendering="crispEdges">${out.join('')}</svg></span>`;
  cache.set(index,html);return html;
}
