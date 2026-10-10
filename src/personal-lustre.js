import { PERSONAL_MAX_LEVEL } from './personal-catalog.js';
export const artLevel = (value, maxLevel=PERSONAL_MAX_LEVEL) => Number.isInteger(value) ? Math.max(1,Math.min(maxLevel,value)) : 1;

// Static layered pixels: brighter at high levels, no animation loop, filters or external images.
export function personalLustre(kind,level) {
  if(level<=1)return '';
  const wide=kind==='revolver',w=wide?256:192,h=wide?192:256;
  const tint=level>30?'#d8f6ff':level>=26?'#ffe8af':level>=21?'#d7afff':level>=16?'#ffd69a':level>=11?'#d5e9ff':level>=8?'#dafff4':level>=5?'#94d9d1':'#f2cc78';
  const p=[`<g aria-hidden="true"><rect x="${w*.2}" y="${h*.16}" width="${w*.6}" height="${h*.67}" rx="12" fill="${tint}" opacity="${.018+level*.005}"/>`];
  for(let i=0;i<Math.min(19,level-1);i++){
    const x=Math.round(w*(i%2?.85:.12)+(i%3)*2),y=Math.round(h*(.17+.065*Math.floor(i/2)));
    p.push(`<path d="M${x} ${y-5}v10m-5-5h10" stroke="${tint}" stroke-width="2" opacity="${Math.min(1,.35+level*.035)}"/><rect x="${x-1}" y="${y-1}" width="3" height="3" fill="#fff6d4"/>`);
  }
  if(level>=7)p.push(`<path d="M${w*.35} ${h*.08}h${w*.3}m-${w*.27} -3h${w*.24}" stroke="#fff1bd" stroke-width="2"/>`);
  if(level>10) {
    for(let i=0;i<Math.min(10,level-10);i++) {
      const x=w*(i%2?.91:.07),y=h*(.29+Math.floor(i/2)*.09);
      p.push(`<path d="M${x} ${y}l-4 5 4 6 4-6Z" fill="${level>=16?'#b3423c':'#6884b0'}" stroke="${tint}" stroke-width="1.5"/>`);
    }
    p.push(`<path d="M${w*.26} ${h*.87}l${w*.08} 6h${w*.32}l${w*.08}-6" fill="none" stroke="${tint}" stroke-width="2"/>`);
  }
  if(level>20)p.push(`<path d="M${w*.25} ${h*.13}L${w*.2} ${h*.22}V${h*.75}L${w*.28} ${h*.83}H${w*.72}L${w*.8} ${h*.75}V${h*.22}L${w*.75} ${h*.13}" fill="none" stroke="${tint}" stroke-width="${level>=26?3:2}" opacity=".7"/>`);
  if(kind==='flag'&&level>30)for(let i=0;i<Math.min(10,level-30);i++){
    const x=57+i*8;p.push('<rect x="'+x+'" y="203" width="5" height="6" fill="#d8f6ff" stroke="#6c9eae" stroke-width="1"/>');
  }
  p.push('</g>');return p.join('');
}
