export const artLevel = value => Number.isInteger(value) ? Math.max(1,Math.min(10,value)) : 1;

// Static layered pixels: brighter at high levels, no animation loop, filters or external images.
export function personalLustre(kind,level) {
  if(level<=1)return '';
  const wide=kind==='revolver',w=wide?256:192,h=wide?192:256;
  const tint=level>=8?'#dafff4':level>=5?'#94d9d1':'#f2cc78';
  const p=[`<g aria-hidden="true"><rect x="${w*.2}" y="${h*.16}" width="${w*.6}" height="${h*.67}" rx="12" fill="${tint}" opacity="${.018+level*.005}"/>`];
  for(let i=0;i<level-1;i++){
    const x=Math.round(w*(i%2?.8:.15)+(i%3)*3),y=Math.round(h*(.17+.065*i));
    p.push(`<path d="M${x} ${y-5}v10m-5-5h10" stroke="${tint}" stroke-width="2" opacity="${.35+level*.055}"/><rect x="${x-1}" y="${y-1}" width="3" height="3" fill="#fff6d4"/>`);
  }
  if(level>=7)p.push(`<path d="M${w*.35} ${h*.08}h${w*.3}m-${w*.27} -3h${w*.24}" stroke="#fff1bd" stroke-width="2"/>`);
  p.push('</g>');return p.join('');
}
