const r=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
const p=(d,color)=>`<path d="${d}" fill="${color}"/>`;
const repeat=(n,fn)=>Array.from({length:n},(_,i)=>fn(i)).join('');
const glass=(x,y,w,h)=>r(x,y,w,h,'#234759')+r(x+1,y+1,w-2,h-2,'#659dad')+r(x+1,y+1,w-2,1,'#ccf3ed')+
  repeat(Math.floor(w/5),i=>r(x+3+i*5,y+1,.7,h-2,'#bdd8d8'));
const block=(x,y,w,h,color)=>r(x+2,y+3,w,h,'#243f5055')+r(x,y,w,h,color)+r(x,y,w-2,2,'#d1dddb')+
  r(x+w-3,y+2,3,h-2,'#3d6074')+r(x-1,y-3,w+2,3,'#3d5769')+r(x,y-3,w,1,'#bbd5d9');
const dish=(x,y)=>r(x+7,y+9,2,10,'#c3d8df')+p(`M${x} ${y}h18l-3 7-6 4-6-4z`,'#b1cdd6')+
  p(`M${x+2} ${y+1}h14l-4 4h-6z`,'#e3eef0')+r(x+8,y-4,1,9,'#657f92');
function specialty(id,level) {
  switch(id){
    case 'research':return block(20,25,53,34,'#8faab4')+glass(24,30,45,12)+
      r(27,45,6,13,'#d7ded8')+r(30,45,3,8,'#74c6cf')+r(42,43,3,13,'#dce8db')+r(39,51,9,5,'#75abb8')+
      r(57,44,9,12,'#335971')+repeat(3,i=>r(59,46+i*3,5,1,'#8fe3d8'));
    case 'logistics':return block(12,29,72,30,'#91aaa9')+repeat(3,i=>r(18+i*21,37,17,22,'#304b5b')+
      repeat(5,j=>r(19+i*21,38+j*4,14,2,'#849fa6')))+r(9,54,17,7,'#d5c28b')+r(11,60,3,3,'#2a4051')+r(22,60,3,3,'#2a4051');
    case 'simulation':return block(16,25,63,35,'#7398ae')+glass(22,29,51,13)+
      p('M12 24l12-9h47l14 9z','#b8d0d7')+r(30,47,34,12,'#264555')+r(34,49,26,6,'#68c4cd')+
      p('M36 52h6v-2h8v3h10v1H46v-2h-3v2h-7z','#e2f0ca');
    case 'strategy':return block(23,15,49,44,'#8596b0')+glass(28,20,39,17)+dish(60,8)+
      r(29,41,34,12,'#234c68')+p('M32 49l8-5 9 3 7-5 4 3v5H32z','#78bdcc')+r(44,54,10,8,'#d3d6c1');
    case 'spaceport':return block(10,36,72,23,'#8ca9b6')+p('M8 36l13-12h49l14 12z','#c9d6d6')+
      r(18,40,49,19,'#314f68')+repeat(7,i=>r(20+i*6,43,3,14,'#6c9fad'))+
      r(76,18,11,39,'#5d879e')+glass(74,13,15,9)+r(80,3,1,10,'#cad9d8')+
      p('M38 34l7-19 3-6 3 6 7 19-7-4h-7z','#e0e6d7')+r(46,18,3,6,'#5eafc0');
    case 'orbital':return block(19,33,59,26,'#7d98b0')+glass(24,39,49,10)+dish(14,17)+dish(57,10)+
      r(43,12,3,22,'#b7d8dc')+r(36,16,17,2,'#d1e2de')+r(41,7,7,5,'#83b9cf');
    case 'reactor':return block(17,34,62,25,'#72a4ac')+repeat(2,i=>{
      const x=22+i*34;return p(`M${x} 13h14l-2 8 5 20h-20l5-20z`,'#a4c9ca')+r(x+2,14,10,2,'#e3eeea')+
        r(x+4,20,6,16,'#347789')+r(x+5,22,4,12,'#80f3e0');
    })+glass(24,45,47,8);
    case 'gate':return block(10,41,76,18,'#889aaf')+block(17,15,13,35,'#9bbdcc')+block(66,15,13,35,'#9bbdcc')+
      p('M28 15l10-7h20l10 7-5 7H33z','#b6d6dd')+p('M31 24l5-5h25l5 5v20H31z','#294e6c')+
      repeat(5,i=>r(34+i*6,24,2,20,'#75cbd8'))+r(34,23,29,2,'#d6ffff')+r(28,48,39,3,'#d1d9c3');
    case 'nexus':return block(11,34,74,26,'#879fb6')+block(29,15,37,44,'#a4bac9')+
      glass(33,20,29,22)+repeat(2,i=>block(14+i*57,24,10,32,'#a7bfc7'))+
      p('M27 13l9-9h23l9 9z','#d8d6b4')+r(38,10,20,4,'#347189')+
      repeat(5,i=>r(36+i*5,47,2,6,'#fae4ae')+r(35+i*5,49,4,2,'#fae4ae'));
    default:throw new RangeError('Unknown late facility');
  }
}
// Shared upgrade language, distinct functions/silhouettes, and visible additions on every level.
export function lateFacilityBody(id,level) {
  let art=r(4,60,88,8,'#273e5055')+r(6,58,84,8,'#718f9c')+r(7,58,82,1,'#d5dfd8');
  if(level>=5)art+=block(4,37,17,25,'#86a4b6')+glass(6,41,12,15);
  if(level>=10)art+=block(76,28,15,34,'#8fb0c1')+glass(79,33,9,22);
  art+=specialty(id,level);
  if(level>=15)art+=r(19,57,59,3,'#d5d5b6')+r(21,57,55,1,'#fff0c6')+
    r(8,21,2,37,'#abcdd1')+r(84,21,2,37,'#abcdd1')+r(5,19,8,3,'#e9f3d6')+r(81,19,8,3,'#e9f3d6');
  // New terrace lights, wall fins and photovoltaic panels track intermediate upgrades.
  for(let i=0;i<level;i++){
    const x=12+(i%10)*7,y=i<10?63:67;
    art+=r(x,y,5,1,i<10?'#ccefe6':'#f4dca4');
  }
  if(level>=2)art+=r(26,59,42,2,'#b5c7c8');
  if(level>=3)art+=r(5,52,5,7,'#3e7466')+r(86,52,5,7,'#3e7466');
  if(level>=7)art+=glass(6,47,11,6);
  if(level>=12)art+=r(80,29,1,27,'#d9dcc6');
  if(level>=18)art+=r(13,55,69,1,'#ead6a7');
  if(level===20)art+=`<g data-structure="landmark">${r(37,1,23,4,'#405e7b')}${r(39,1,19,1,'#f4e3b9')}${repeat(5,i=>r(40+i*4,2,2,2,'#b3f0ed'))}</g>`;
  return `<g data-late-facility="${id}">${art}</g>`;
}

export function commandSchoolBody(level) {
  let art=r(5,60,86,8,'#243f5455')+block(18,24,61,38,'#859fb6')+glass(24,30,48,22)+
    block(35,13,28,43,'#a1bccc')+glass(39,19,20,29)+r(32,11,34,3,'#e3d5a3')+
    r(35,55,28,8,'#2a4b66')+r(37,56,24,2,'#bde6e1')+r(46,57,5,6,'#839b9f');
  for(let i=0;i<Math.max(1,level);i++)art+=r(38+i*4,14,2,3,'#ffebac');
  if(level>=2)art+=block(7,35,14,27,'#7596ab')+glass(9,39,9,19);
  if(level>=3)art+=block(76,24,14,38,'#9db8c7')+glass(79,29,8,29)+dish(73,12);
  if(level>=4)art+=r(21,28,2,30,'#e2cf97')+r(72,28,2,30,'#e2cf97')+r(24,53,48,2,'#e6d09a');
  if(level>=5)art+=block(40,4,18,9,'#63849a')+r(42,5,14,4,'#a4e0e2')+r(31,65,36,2,'#eadcba');
  return `<g data-command-school="${level}">${art}</g>`;
}
