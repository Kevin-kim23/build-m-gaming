// Original relief medal artwork. Solid fills keep repeated shelf/dialog copies independent.
export function galacticFormationMedalSvg(level){
  if(!Number.isInteger(level)||level<1||level>5)throw new RangeError('Unknown galactic medal');
  const parts=[],gold='#d5ae66',light='#ffe3a3',copper='#bb8253',dark='#271e3f',violet='#69478e';
  const rect=(x,y,w,h,color)=>parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`);
  const path=(d,fill,stroke='',width=1)=>parts.push(`<path d="${d}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${width}"`:''}/>`);
  // Violet woven ribbon with copper rank bars, folded tails and double suspension ring.
  path('M25 2H71V34L60 43 48 35 36 43 25 34Z',dark);
  path('M27 4H69V33L59 40 48 32 37 40 27 33Z',violet);
  for(let x=29;x<68;x+=3)rect(x,6,1,26,x%2?'#8760ae':'#4a326d');
  for(const x of [31,36,58,63])rect(x,5,2,29,gold);
  rect(25,2,46,3,gold);rect(27,2,42,1,light);rect(42,5,12,23,'#342047');
  for(let i=0;i<level;i++){rect(44,9+i*3,8,2,copper);rect(44,9+i*3,8,1,light);}
  parts.push(`<ellipse cx="48" cy="41" rx="8" ry="7" fill="none" stroke="${gold}" stroke-width="4"/><ellipse cx="47" cy="40" rx="6" ry="5" fill="none" stroke="${light}" stroke-width="1"/>`);
  // Stepped command wings grow wider while remaining inside the 96-pixel artboard.
  for(const side of [-1,1])for(let n=0;n<4+level;n++){
    const inner=20+n*1.5,outer=inner+9+(level-1)*1.3,y=57+n*4;
    path(`M${48+side*inner} ${y}L${48+side*outer} ${y-5}L${48+side*(outer-2)} ${y+3}L${48+side*(inner-1)} ${y+5}Z`,gold);
    path(`M${48+side*inner} ${y}L${48+side*outer} ${y-5}`, 'none',light);
  }
  path('M48 46L76 57 79 79 69 96 48 108 27 96 17 79 20 57Z','#1b1930');
  path('M48 46L75 58 76 78 67 94 48 105 29 94 20 78 21 58Z',gold);
  path('M48 49L72 60 73 77 65 92 48 101 31 92 23 77 24 60Z',light);
  path('M48 53L68 62 69 77 62 88 48 97 34 88 27 77 28 62Z','#7b522f');
  path('M48 55L66 64 67 76 60 87 48 94 36 87 29 76 30 64Z',violet);
  path('M48 55V94L60 87 67 76 66 64Z','#493063');
  path('M32 65L48 58 64 65','none','#ac88d0',1.5);
  for(const [x,y]of [[48,50],[25,61],[25,79],[34,93],[62,93],[72,79],[71,61]]){
    parts.push(`<circle cx="${x}" cy="${y}" r="1.5" fill="${light}"/>`);
  }
  // A thin orbital ring frames a faceted copper star cluster (one to five).
  parts.push(`<ellipse cx="48" cy="75" rx="20" ry="12" fill="none" stroke="${copper}" stroke-width="1.5" transform="rotate(-20 48 75)"/>`);
  const positions=level===1?[[48,75,10]]:level===2?[[40,75,7],[56,75,7]]:level===3?[[35,76,6],[48,69,6],[61,76,6]]:level===4?[[40,68,6],[56,68,6],[40,82,6],[56,82,6]]:[[35,69,5],[48,65,5],[61,69,5],[40,82,5],[56,82,5]];
  for(const [cx,cy,size]of positions){
    const points=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?size*.44:size;return [Number((cx+Math.cos(a)*r).toFixed(2)),Number((cy+Math.sin(a)*r).toFixed(2))];});
    parts.push(`<g class="galactic-medal-star"><polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${copper}" stroke="${light}" stroke-width=".6"/>`);
    for(let i=0;i<10;i+=2)parts.push(`<polygon points="${cx},${cy} ${points[i].join(',')} ${points[(i+1)%10].join(',')}" fill="${i<4?'#edc488':'#8d572f'}"/>`);
    parts.push('</g>');
  }
  rect(39,99,18,2,gold);rect(42,101,12,2,light);
  return `<svg class="achievement-medal-svg" viewBox="0 0 96 112" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}
