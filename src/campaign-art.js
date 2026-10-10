import { COUNTRIES } from './campaign.js';
import { polygonPath,inside,bounds,countryRegions } from './campaign-geometry.js';
import {spaceMapDefs,spaceOceanArt,spaceCountryLand,spaceSettlement} from './campaign-space-art.js';
const cache=new Map();
const mountain=(x,y,s,snow)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-19 12L0-23 24 12Z" fill="#384f46" opacity=".25" transform="translate(5 5)"/><path d="M-19 12L0-23 24 12Z" fill="${snow?'#b6ceca':'#8b8970'}"/><path d="M0-23L24 12H2L-3-3Z" fill="${snow?'#719594':'#666a58'}"/><path d="M0-23L-8-8-2-11 3-7 7-12Z" fill="${snow?'#ecf3dc':'#c9c2a0'}"/></g>`;
const tree=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="9" rx="9" ry="4" fill="#263f3640"/><path d="M-2 0H2V11H-2" fill="#78694e"/><path d="M0-14L-9 5H9Z" fill="#365e4c"/><path d="M0-14L-1 2H-7Z" fill="#71916c"/></g>`;
function terrain(country){
  if(cache.has(country.id))return cache.get(country.id);
  let seed=4711+country.index*1237;
  const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const b=bounds(country.polygon),parts=[];
  for(let i=0;i<230;i++){
    const x=Math.round(b.x+random()*b.width),y=Math.round(b.y+random()*b.height);
    if(!inside([x,y],country.polygon))continue;
    const mountains=x>400&&x<580&&Math.sin(y/63)>.05;
    if(mountains)parts.push(mountain(x,y,.7+random()*.7,country.index===3));
    else if(country.index!==1&&random()>.35)parts.push(tree(x,y,.5+random()*.6));
    else parts.push(`<path d="M${x-6} ${y}q7-5 14 0m-9 5h8" fill="none" stroke="${country.dark}" opacity=".25" stroke-width="2"/>`);
  }
  const river=`M${b.x+b.width*.64} ${b.y+30}C${b.x+120} ${b.y+b.height*.4} ${b.x+b.width*.95} ${b.y+b.height*.4} ${b.x+b.width*.59} ${b.y+b.height*.67}S${b.x+b.width*.3} ${b.y+b.height*.87} ${b.x+b.width*.4} ${b.y+b.height}`;
  const result=`<g clip-path="url(#coast-${country.id})" pointer-events="none"><path d="${river}" fill="none" stroke="#d6d7ae" stroke-width="12" opacity=".65"/><path d="${river}" fill="none" stroke="#62999b" stroke-width="7"/>${parts.join('')}</g>`;
  cache.set(country.id,result);return result;
}
export function mapDefs(continentId='astera'){
  return `<defs><linearGradient id="atlas-sea" x2="1" y2="1"><stop stop-color="#203e48"/><stop offset=".5" stop-color="#305b62"/><stop offset="1" stop-color="#18373f"/></linearGradient>
  <pattern id="atlas-grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="#9cbcaf" opacity=".12" stroke-width="1"/><circle cx="0" cy="0" r="2" fill="#abc9ba" opacity=".25"/></pattern>
  <pattern id="atlas-grain" width="37" height="41" patternUnits="userSpaceOnUse"><path d="M3 4h1m11 8h2m14 16h1M8 32h2m23 8h1" stroke="#efe8c5" opacity=".23"/><path d="M7 18h2m12 20h1m16-34h1" stroke="#283c31" opacity=".18"/></pattern>
  ${continentId==='aetherion'?spaceMapDefs():''}${COUNTRIES.filter(c=>c.continentId===continentId).map(c=>`<clipPath id="coast-${c.id}"><path d="${polygonPath(c.polygon)}"/></clipPath><linearGradient id="land-${c.id}" x2=".6" y2="1"><stop stop-color="${c.accent}"/><stop offset=".35" stop-color="${c.color}"/><stop offset="1" stop-color="${c.dark}"/></linearGradient>`).join('')}</defs>`;
}
export function oceanArt(theme='earth'){
  if(theme==='space')return spaceOceanArt();
  return `<rect x="-1000" y="-1000" width="3000" height="4500" fill="url(#atlas-sea)"/><rect x="-1000" y="-1000" width="3000" height="4500" fill="url(#atlas-grid)"/>
  <g fill="#b3c4ba" opacity=".32" font-family="serif" font-size="23" letter-spacing="9"><text x="-70" y="1500" transform="rotate(-90 -70 1500)">고요의 바다</text><text x="980" y="800" transform="rotate(90 980 800)">여명의 해역</text></g>
  <g fill="#6d8879" stroke="#b3c2a1" stroke-width="2"><path d="M60 1990l-23 38 14 18 28-24Z"/><path d="M913 2100l-15 28 19 17 24-23Z"/><path d="M941 705l-23 12 12 34 27-16Z"/><path d="M120 364l-26 20 13 40 29-11Z"/></g>
  <g transform="translate(90 2240)" stroke="#dac99b" fill="none" opacity=".6"><circle r="37"/><path d="M0-59V59M-59 0H59M-26-26L26 26M26-26L-26 26"/><path d="M0-43L8 0 0 43-8 0Z" fill="#dac99b"/><text y="-68" text-anchor="middle" fill="#dac99b" stroke="none" font-size="22">N</text></g>`;
}
export function countryLand(country){
  if(country.theme==='space')return spaceCountryLand(country);
  const d=polygonPath(country.polygon);
  return `<path d="${d}" fill="none" stroke="#142f37" stroke-width="25" transform="translate(0 9)"/><path d="${d}" fill="none" stroke="#7fa39b" stroke-width="16" opacity=".35"/><path d="${d}" fill="url(#land-${country.id})" stroke="#d3d2a3" stroke-width="3"/><path d="${d}" fill="url(#atlas-grain)"/>${terrain(country)}`;
}
export function settlement(x,y,capital=false,theme='earth'){
  if(theme==='space')return spaceSettlement(x,y,capital);
  return `<g transform="translate(${x} ${y})" pointer-events="none"><ellipse cy="15" rx="${capital?29:17}" ry="7" fill="#183c3655"/>
  <path d="M-19 10V-9h7v5H-4v-12H5V-4H13V-9h7v24H-19Z" fill="${capital?'#d1c093':'#b9b897'}" stroke="#4c5c4a" stroke-width="2"/>
  <path d="M-12-4H13V13H-12Z" fill="#869781"/><path d="M-4 15V3q4-6 8 0V15Z" fill="#3b5148"/><path d="M-19-9h7m25 0h7M-4-16H5" stroke="#efe0b4" stroke-width="3"/>
  ${capital?'<path d="M0-16V-39h18l-5 7 5 7H2" fill="#e4c676" stroke="#56644f" stroke-width="2"/>':''}</g>`;
}
export function nationalLand(country,cleared,selected){
  const regions=countryRegions(country.id);
  return `<g clip-path="url(#coast-${country.id})">${regions.map(r=>{
    const done=r.id<=cleared,next=r.id===cleared+1,active=r.id===selected;
    return `<path data-region="${r.id}" d="${polygonPath(r.polygon)}" class="region-land ${done?'occupied':next?'frontier':'unconquered'} ${active?'selected':''}"/>`;
  }).join('')}<path d="M${regions.map(r=>r.point.join(',')).join('L')}" fill="none" stroke="#e5d5a7" stroke-width="3" stroke-dasharray="5 8" opacity=".55"/></g>`;
}
