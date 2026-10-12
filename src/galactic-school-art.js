// Original silver/violet academy: lecture hall, observatory, simulation wings.
// Inline vectors have no document IDs, and schoolIcon caches every level.
const p={edge:'#28243e',wall:'#77718c',shade:'#47455e',silver:'#c9d9e8',
  light:'#ecf4ff',glass:'#398d9f',glow:'#9ceff1',violet:'#a395d7',gold:'#cca169'};
const r=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
const block=(x,y,w,h)=>r(x+1,y+2,w,h,'#13213966')+r(x,y,w,h,p.edge)+r(x+1,y+1,w-3,h-2,p.wall)+
  r(x+w-3,y+2,2,h-2,p.shade)+r(x-1,y-2,w+2,2,p.silver);
const glass=(x,y,w,h)=>r(x,y,w,h,p.edge)+r(x+1,y+1,w-2,h-2,p.glass)+r(x+1,y+1,w-2,.8,p.glow)+
  Array.from({length:Math.max(1,Math.floor(w/5)-1)},(_,i)=>r(x+4+i*5,y+1,.6,h-2,p.silver)).join('');
export function galacticSchoolBody(level){
  level=Math.max(0,Math.min(5,Math.floor(level)||0));
  let art=r(3,62,90,7,'#21324b66')+r(5,61,86,6,p.shade)+r(6,61,84,1,p.silver);
  art+=block(16,35,64,27)+block(27,25,42,35);
  for(let row=0;row<3;row++)art+=glass(30,29+row*8,36,6);
  art+=r(26,22,44,3,p.silver)+r(29,19,38,3,p.violet)+r(33,16,30,3,p.wall)+r(38,13,20,3,p.silver);
  art+=r(43,11,10,2,p.glow)+r(47,5,2,6,p.silver)+r(44,7,8,1,p.violet);
  for(const x of [17,70])for(let row=0;row<2;row++)art+=glass(x+2,40+row*8,8,6);
  // An open book over the auditorium door distinguishes education from a command HQ.
  art+=r(35,50,26,3,p.silver)+r(38,53,20,9,p.edge)+glass(40,55,16,7)+
    `<path d="M41 43l7 2 7-2v6l-7 2-7-2z" fill="${p.gold}"/><path d="M42 44l5 2v3l-5-1zM49 46l5-2v4l-5 1z" fill="#f5dfb4"/>`;
  if(level>=2){
    art+=block(7,40,17,22)+glass(9,43,12,6)+glass(9,52,12,6)+r(7,36,17,4,p.violet)+r(8,36,15,1,p.light);
  }
  if(level>=3){
    art+=block(73,31,15,31)+glass(75,35,10,9)+glass(75,47,10,10)+r(76,26,9,5,p.violet)+
      r(79,17,2,9,p.silver)+r(76,19,8,2,p.glow)+r(72,26,17,2,p.silver);
  }
  if(level>=4){
    art+=r(23,28,2,33,p.silver)+r(70,28,2,33,p.silver)+r(23,29,.7,30,p.light)+r(70,29,.7,30,p.light)+
      `<path d="M19 31V21l11-9h36l11 9v10" fill="none" stroke="${p.violet}" stroke-width="2"/><path d="M20 27v-5l11-9h34l11 9v5" fill="none" stroke="${p.silver}" stroke-width=".7"/>`;
  }
  if(level>=5){
    art+=block(39,4,18,10)+glass(41,6,14,6)+r(43,1,10,1,p.violet)+r(29,64,38,2,p.gold)+r(30,64,36,.7,p.light);
  }
  for(let n=0;n<Math.max(1,level);n++)art+=r(36+n*5,24,2,2,p.glow);
  for(let n=0;n<3;n++)art+=r(35-n*3,61+n*2,26+n*6,2,p.wall)+r(35-n*3,61+n*2,26+n*6,.6,p.silver);
  return `<g data-galactic-school="${level}">${art}</g>`;
}
