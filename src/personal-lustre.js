import { PERSONAL_MAX_LEVEL } from './personal-catalog.js';
export const artLevel = value => Number.isInteger(value) ? Math.max(1,Math.min(PERSONAL_MAX_LEVEL,value)) : 1;

// Static layered pixels: brighter at high levels, no animation loop, filters or external images.
export function personalLustre(kind,level) {
  if(level<=1)return '';
  const wide=kind==='revolver',w=wide?256:192,h=wide?192:256;
  const tint=level>=16?'#ffd69a':level>=11?'#d5e9ff':level>=8?'#dafff4':level>=5?'#94d9d1':'#f2cc78';
  const p=[`<g aria-hidden="true"><rect x="${w*.2}" y="${h*.16}" width="${w*.6}" height="${h*.67}" rx="12" fill="${tint}" opacity="${.018+level*.005}"/>`];
  for(let i=0;i<level-1;i++){
    const x=Math.round(w*(i%2?.85:.12)+(i%3)*2),y=Math.round(h*(.17+.065*Math.floor(i/2)));
    p.push(`<path d="M${x} ${y-5}v10m-5-5h10" stroke="${tint}" stroke-width="2" opacity="${Math.min(1,.35+level*.035)}"/><rect x="${x-1}" y="${y-1}" width="3" height="3" fill="#fff6d4"/>`);
  }
  if(level>=7)p.push(`<path d="M${w*.35} ${h*.08}h${w*.3}m-${w*.27} -3h${w*.24}" stroke="#fff1bd" stroke-width="2"/>`);
  if(level>10) {
    for(let i=0;i<level-10;i++) {
      const x=w*(i%2?.91:.07),y=h*(.29+Math.floor(i/2)*.09);
      p.push(`<path d="M${x} ${y}l-4 5 4 6 4-6Z" fill="${level>=16?'#b3423c':'#6884b0'}" stroke="${tint}" stroke-width="1.5"/>`);
    }
    p.push(`<path d="M${w*.26} ${h*.87}l${w*.08} 6h${w*.32}l${w*.08}-6" fill="none" stroke="${tint}" stroke-width="2"/>`);
  }
  p.push('</g>');return p.join('');
}
