import {bounds,inside,polygonPath} from './campaign-geometry.js';

const cache=new Map();
export function spaceMapDefs(){
  return `<radialGradient id="atlas-nebula"><stop stop-color="#675080" stop-opacity=".7"/><stop offset=".5" stop-color="#303957" stop-opacity=".45"/><stop offset="1" stop-color="#0c1025" stop-opacity="0"/></radialGradient>
  <radialGradient id="atlas-planet" cx=".3" cy=".25"><stop stop-color="#ad98c5"/><stop offset=".45" stop-color="#5c5a85"/><stop offset=".85" stop-color="#252941"/><stop offset="1" stop-color="#0f152b"/></radialGradient>
  <pattern id="atlas-tech" width="70" height="70" patternUnits="userSpaceOnUse"><path d="M0 35h18l17-17h35M35 70V53L18 36" stroke="#c8b8ec" stroke-width="1" fill="none" opacity=".12"/><circle cx="35" cy="18" r="2" fill="#b6f0f2" opacity=".4"/></pattern>`;
}
export function spaceOceanArt(){
  if(cache.has('sky'))return cache.get('sky');
  let seed=79123;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const stars=Array.from({length:300},()=>{const x=Math.round(random()*2200-600),y=Math.round(random()*3500-500),r=(random()*1.8+.6).toFixed(1);return `<circle cx="${x}" cy="${y}" r="${r}" opacity="${(.25+random()*.65).toFixed(2)}"/>`;}).join('');
  const sky=`<rect x="-1000" y="-1000" width="3000" height="4500" fill="#0d1329"/>
  <ellipse cx="450" cy="700" rx="1100" ry="1200" fill="url(#atlas-nebula)"/><ellipse cx="300" cy="2050" rx="1100" ry="700" fill="url(#atlas-nebula)"/>
  <g fill="#d9e5ff" pointer-events="none">${stars}</g><rect x="-1000" y="-1000" width="3000" height="4500" fill="url(#atlas-grid)"/>
  <g transform="translate(920 1870) rotate(-26)" opacity=".7"><ellipse rx="172" ry="48" stroke="#bdb2d2" stroke-width="10" fill="none"/><circle r="96" fill="url(#atlas-planet)"/><path d="M-171 0a172 48 0 0 0 342 0" stroke="#bdb2d2" stroke-width="10" fill="none"/></g>
  <circle cx="72" cy="310" r="75" fill="url(#atlas-planet)" opacity=".6"/>
  <g stroke="#a4c8ed" fill="none" opacity=".28"><path d="M40 1180l18-30 35 8 10 36-28 27-31-13ZM945 773l-15-27 26-34 30 17 2 31ZM105 2180l-26-8-11 24 21 19 24-17"/><path d="M500 2370v90m-35-45h70"/><circle cx="500" cy="2415" r="24"/></g>
  <g fill="#c9c0e3" opacity=".52" font-family="inherit" font-size="22" letter-spacing="8"><text x="-65" y="1520" transform="rotate(-90 -65 1520)">오리온 성운해</text><text x="982" y="480" transform="rotate(90 982 480)">침묵의 항성로</text></g>`;
  cache.set('sky',sky);return sky;
}
export function spaceCountryLand(country){
  if(cache.has(country.id))return cache.get(country.id);
  const b=bounds(country.polygon),d=polygonPath(country.polygon),details=[];
  let seed=9173+country.index*577;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<85;i++){
    const x=Math.round(b.x+b.width*random()),y=Math.round(b.y+b.height*random());
    if(!inside([x,y],country.polygon))continue;
    if(i%4===0)details.push(`<g transform="translate(${x} ${y})"><ellipse cy="6" rx="17" ry="7" fill="#16172f66"/><path d="M-12 4l8-22 10 4 6 20-14 7Z" fill="${country.dark}" stroke="${country.accent}" opacity=".75"/><path d="M-4-18L-2 13 6-14" fill="#b9d6ed" opacity=".32"/></g>`);
    else if(i%4===1)details.push(`<g transform="translate(${x} ${y})"><ellipse rx="17" ry="9" fill="none" stroke="#211f3a" stroke-width="5" opacity=".45"/><path d="M-15 0a15 7 0 0 1 30 0" fill="none" stroke="${country.accent}" opacity=".3"/></g>`);
    else details.push(`<path d="M${x-12} ${y}h8l9-9h8" fill="none" stroke="#b7d7e8" opacity=".35" stroke-width="2"/>`);
  }
  const seam=`M${b.x+b.width*.55} ${b.y}l-65 ${b.height*.22} 80 ${b.height*.13}-105 ${b.height*.22} 45 ${b.height*.16}-80 ${b.height*.28}`;
  const art=`<path d="${d}" fill="#18162d" stroke="#101325" stroke-width="22" transform="translate(0 19)"/><path d="${d}" fill="none" stroke="#9487c5" stroke-width="15" opacity=".2"/><path d="${d}" fill="url(#land-${country.id})" stroke="#d8b679" stroke-width="3"/>
  <g clip-path="url(#coast-${country.id})" pointer-events="none"><path d="${d}" fill="url(#atlas-tech)"/><path d="${seam}" stroke="#1c243e" stroke-width="13" fill="none"/><path d="${seam}" stroke="#8ccddd" stroke-width="3" fill="none" opacity=".72"/>${details.join('')}</g>`;
  cache.set(country.id,art);return art;
}
export function spaceSettlement(x,y,capital){
  return `<g transform="translate(${x} ${y})" pointer-events="none"><ellipse cy="12" rx="34" ry="13" fill="#10172d88"/>
  <path d="M-28 3l9-17h38l9 17-9 16h-38Z" fill="#3d385e" stroke="#e0bd85" stroke-width="2"/><path d="M-21 0l7-11h28l7 11-7 12h-28Z" fill="#7775a7" stroke="#b7d2de" stroke-width="1.5"/>
  <path d="M-11-5V-20L0-29l11 9v15L0 3Z" fill="#403f6a" stroke="#dab278" stroke-width="2"/><path d="M0-29V3l11-8v-15Z" fill="#273950"/><path d="M-6-13h12m-12 5h12M-17 4h8m18 0h8" stroke="#a0eef0" stroke-width="3"/>
  ${capital?'<path d="M0-29v-18m-7 7H7" stroke="#e3c491" stroke-width="2"/><circle cy="-47" r="3" fill="#c8fbf8"/>':''}</g>`;
}
