import { FACILITY_BY_ID, MAX_FACILITY_LEVEL } from './facility-catalog.js';
const cache=new Map();
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
function windows(x,y,count) {
  return Array.from({length:count},(_,i)=>rect(x+i*13,y,9,11,'#263c42')+rect(x+1+i*13,y+1,6,4,'#90bac1')+rect(x+4+i*13,y,1,11,'#596d65')).join('');
}
function details(id) {
  switch(id) {
    case 'kitchen':return rect(68,9,8,21,'#514b43')+rect(66,8,12,4,'#b0aaa0')+rect(23,39,21,3,'#e4d1a0')+rect(25,36,3,12,'#e4d1a0')+rect(33,36,3,12,'#e4d1a0')+rect(41,36,3,12,'#e4d1a0');
    case 'gym':return rect(22,43,28,3,'#dce4dc')+rect(20,37,5,14,'#39464c')+rect(47,37,5,14,'#39464c')+rect(18,39,2,10,'#bcc8c6')+rect(52,39,2,10,'#bcc8c6');
    case 'pcRoom':return [22,37,52].map(x=>rect(x,37,11,9,'#273742')+rect(x+1,38,9,6,'#6bc6db')+rect(x+5,46,2,3,'#c2c9bf')+rect(x+2,49,9,2,'#4a5453')).join('');
    case 'infirmary':return rect(35,35,19,19,'#e3e1cb')+rect(42,38,5,13,'#488d78')+rect(38,42,13,5,'#488d78');
    case 'range':return [25,47,69].map(x=>rect(x,40,2,17,'#625648')+`<circle cx="${x+1}" cy="37" r="7" fill="#e3d7ba"/><circle cx="${x+1}" cy="37" r="4" fill="#9b6551"/><circle cx="${x+1}" cy="37" r="2" fill="#e3d7ba"/>`).join('');
    case 'workshop':return rect(24,32,43,27,'#34464a')+Array.from({length:5},(_,i)=>rect(26,34+i*4,39,2,'#708585')).join('')+rect(74,41,4,15,'#e8ca7e')+rect(71,40,10,4,'#e8ca7e');
    case 'depot':return [19,33,47].map((x,i)=>rect(x,44-i*3,12,14+i*3,'#b98b52')+rect(x+2,46-i*3,8,2,'#dfbd80')+rect(x+5,44-i*3,2,14+i*3,'#6c5c41')).join('');
    case 'comms':return rect(69,4,3,25,'#d4d7bf')+`<path d="M58 9 L81 9 L72 20 Z" fill="#afc7c7"/><path d="M70 9 L73 3" stroke="#4c676b" stroke-width="2"/>`;
    case 'operations':return rect(38,9,22,14,'#344e53')+windows(40,11,1)+rect(60,4,2,20,'#d0c9a6')+rect(62,5,13,7,'#c49c54')+rect(32,42,26,3,'#decd92')+rect(38,38,3,11,'#decd92')+rect(49,38,3,11,'#decd92');
    default:return '';
  }
}
const path=(d,color)=>`<path d="${d}" fill="${color}"/>`;
const group=(name,body)=>`<g data-structure="${name}">${body}</g>`;
const repeat=(count,draw)=>Array.from({length:count},(_,i)=>draw(i)).join('');
function tree(x,y) {
  return rect(x+3,y+6,2,8,'#625640')+rect(x,y+2,8,7,'#3b6c55')+rect(x+2,y,5,7,'#66936a')+rect(x+2,y+1,3,2,'#8bab76');
}
function lamp(x,y) {
  return rect(x,y,2,15,'#435964')+rect(x-2,y-2,6,3,'#e4e8c4')+rect(x-1,y-1,4,1,'#fff5ce');
}
function crest(x,y) {
  return path(`M${x} ${y+3}h3v-3h2v3h3v2h-3v3h-2v-3h-3z`,'#efd38a')+rect(x+3,y+3,2,2,'#fff3c4');
}

function specialistExpansion(id,level,top) {
  if(level<5)return '';
  switch(id) {
    case 'kitchen':return rect(17,51,40,5,'#884b3e')+repeat(10,i=>rect(17+i*4,51,2,5,'#e4c790'))+
      (level>=10?rect(20,57,14,3,'#68564a')+rect(22,60,2,3,'#524b40')+rect(31,60,2,3,'#524b40'):'');
    case 'gym':return rect(4,45,10,15,'#466e79')+rect(6,47,6,3,'#b3d4d0')+rect(6,54,6,3,'#b3d4d0')+
      (level>=15?path(`M24 ${top+1}l6-5h31l6 5z`,'#c5d5cc'):'');
    case 'pcRoom':return rect(18,34,47,2,'#9c90df')+(level>=10?rect(80,32,3,23,'#81e2df'):'')+
      (level>=15?rect(33,top-5,27,6,'#2c354f')+rect(36,top-3,21,2,'#afabff'):'');
    case 'infirmary':return rect(4,50,15,9,'#e0e5d7')+rect(6,48,9,4,'#e0e5d7')+rect(6,50,5,3,'#7daab2')+
      rect(7,58,3,3,'#2b454b')+rect(14,58,3,3,'#2b454b')+(level>=15?rect(39,top-5,13,5,'#edf0df')+rect(44,top-5,3,5,'#4b9c82'):'');
    case 'range':return rect(20,56,53,3,'#756c55')+(level>=10?rect(20,30,53,2,'#334c50')+repeat(3,i=>rect(21+i*20,28,9,2,'#d6be76')):'');
    case 'workshop':return rect(5,29,3,31,'#c3a565')+rect(5,27,28,3,'#ddc384')+rect(31,30,1,9,'#51616a')+path('M29 38h4v5h-4v-2h2v-2h-2z','#c6d0bd');
    case 'depot':return rect(3,48,13,13,'#708b86')+repeat(4,i=>rect(4+i*3,49,1,11,'#a3b5a5'))+
      (level>=15?rect(30,top-4,34,4,'#b7c5af')+repeat(7,i=>rect(32+i*4,top-3,2,2,'#4d675d')):'');
    case 'comms':return rect(18,44,36,10,'#324e60')+repeat(6,i=>rect(20+i*5,45,3,7,'#82c1c7'))+
      (level>=10?rect(6,17,2,33,'#c0cfc8')+rect(3,17,8,3,'#8bb3c4')+rect(4,23,6,2,'#8bb3c4'):'')+
      (level>=15?rect(80,6,2,22,'#b9c7c1')+path('M75 10h12l-5 7z','#d0ded1'):'');
    case 'operations':return rect(27,38,32,14,'#344e5a')+rect(29,40,28,10,'#6c9eaa')+
      path('M32 47h5v-3h9v-2h7v2h-5v4H35v1h-3z','#c5d9c6')+(level>=15?crest(68,30):'');
    default:return '';
  }
}

function building(id,level) {
  const facility=FACILITY_BY_ID[id],tier=Math.floor(level/5),top=26-tier*3;
  let body=rect(6,60,86,7,'#233b3866')+rect(8,58,80,7,'#758779')+rect(11,57,76,2,'#a5af90');
  if(level>=5)body+=group('annex',rect(6,38,15,22,facility.color)+rect(5,36,17,3,'#c0c7a9')+windows(8,42,1));
  if(level>=10)body+=rect(80,30,10,31,'#3d5c61')+rect(80,28,11,3,'#b4c5b6')+rect(83,33,4,22,'#9bbac0');
  body+=rect(14,top,66,59-top,facility.color)+rect(80,top+2,7,57-top,'#415c58')+rect(14,54,66,5,'#61786b')+
    path(`M10 ${top+1}l13-11h54l11 11z`,'#354e4a')+rect(10,top+1,78,4,'#263f3c')+rect(23,top-10,54,2,'#aabca0');
  if(level>=10)body+=windows(21,top+7,4);
  if(level<10&&id!=='workshop')body+=windows(20,31,3);
  body+=rect(68,40,10,19,'#263e42')+rect(69,41,7,9,'#8fb8bc')+rect(69,51,2,2,'#eed799')+rect(64,59,18,3,'#cfccaa')+
    repeat(6,i=>rect(17+i*10,56,6,1,'#bfc9ad'));
  if(level>=2)body+=rect(16,62,21,3,'#536c4d')+repeat(5,i=>rect(17+i*4,61,2,2,'#a9bc76'));
  if(level>=3)body+=lamp(85,44);
  if(level>=4)body+=repeat(5,i=>rect(39+i*8,64,5,2,'#bdc5b3'));
  if(level>=6)body+=rect(63,38,17,2,'#d6c287')+path('M63 40h17l-2 3H65z','#536d65');
  if(level>=7)body+=rect(48,top-7,17,4,'#bcc4b1')+repeat(5,i=>rect(49+i*3,top-6,1,2,'#6c8580'));
  if(level>=8)body+=rect(16,28,2,28,'#c3c6a6')+rect(61,28,2,28,'#c3c6a6');
  if(level>=9)body+=rect(26,top-7,18,6,'#23475b')+repeat(4,i=>rect(27+i*4,top-6,3,4,'#709cac'));
  if(level>=11)body+=rect(80,30,2,27,'#dcc993')+rect(85,30,1,27,'#c6dbce');
  if(level>=12)body+=tree(2,47)+tree(87,48);
  if(level>=13)body+=rect(19,32,43,1,'#eee0af')+rect(19,52,43,1,'#d5c393');
  if(level>=14)body+=rect(48,top-12,16,5,'#617e7b')+rect(49,top-12,14,1,'#cbd7bd')+rect(50,top-10,12,1,'#d5e0c8');
  if(level>=15)body+=group('upper-gallery',rect(29,top-8,36,9,'#385961')+windows(31,top-7,3)+rect(27,top-10,40,2,'#c9c8a4'));
  if(level>=16)body+=rect(12,top+5,3,34,'#d7cca0')+rect(77,top+5,3,34,'#d7cca0');
  if(level>=17)body+=rect(30,59,28,3,'#d4bc7e')+rect(32,62,24,2,'#efe1ba');
  if(level>=18)body+=lamp(8,42)+rect(19,top+5,43,1,'#e5e7c4');
  if(level>=19)body+=rect(14,top+5,66,1,'#d9ba70')+rect(17,top+7,1,27,'#f2dea6')+rect(75,top+7,1,27,'#f2dea6');
  if(level>=20)body+=group('landmark',rect(35,top-14,24,5,'#536e72')+rect(34,top-14,26,2,'#dfc78d')+crest(43,top-12));
  return body+details(id)+specialistExpansion(id,level,top);
}

function stands(x,y,width,rows) {
  return rect(x,y,width,rows*3+2,'#344d5b')+repeat(rows,row=>rect(x+1,y+row*3,width-2,2,'#719cae')+
    repeat(Math.floor((width-4)/4),col=>rect(x+2+col*4,y+row*3,2,1,row%2?'#b0ccd2':'#d3dcc8')));
}
function floodlight(x,y) {
  return rect(x+4,y+4,2,23,'#435b69')+rect(x+5,y+4,1,23,'#a3bbc0')+rect(x,y,10,6,'#314651')+
    repeat(4,i=>rect(x+1+i%2*4,y+1+Math.floor(i/2)*2,3,1,'#f2efd0'));
}
function futsal(level) {
  const tier=Math.floor(level/5);
  let body=rect(4,60,88,7,'#233b3866')+rect(7,18,82,46,'#667f75')+rect(9,19,78,43,'#adbaa0');
  if(level>=5)body+=group('stand',stands(13,14,70,2+(tier>=2?1:0)));
  if(level>=10)body+=group('side-stands',stands(4,26,10,9)+stands(82,26,10,9));
  // Preserve a readable pitch while the stands, lights and roof grow around it.
  body+=rect(12,24,72,33,'#326f4d')+rect(14,26,68,29,'#6ca16b');
  if(level>=4)body+=repeat(6,i=>rect(15+i*11,26,5,29,i%2?'#72ac73':'#5d9962'));
  body+=`<path d="M16 28H80V53H16Z M48 28V53 M16 34H24V47H16 M80 34H72V47H80" stroke="#e8efcd" stroke-width="1" fill="none"/><circle cx="48" cy="40.5" r="6" stroke="#e8efcd" fill="none"/>`+
    rect(47,40,2,1,'#eff3d5')+rect(11,35,5,12,'#e6e9d3')+rect(12,36,3,10,'#7e9e93')+rect(80,35,5,12,'#e6e9d3')+rect(81,36,3,10,'#7e9e93');
  if(level>=2)body+=rect(23,59,17,3,'#345362')+rect(55,59,17,3,'#345362')+rect(24,59,15,1,'#c2d1c2')+rect(56,59,15,1,'#c2d1c2');
  if(level>=3)body+=repeat(8,i=>rect(13+i*10,20,1,5,'#425f58'))+rect(13,21,71,1,'#729589');
  if(level>=6)body+=repeat(7,i=>rect(16+i*9,56,8,2,i%2?'#ddd9b8':'#6a95a8'));
  if(level>=7)body+=rect(40,10,17,7,'#213c4c')+rect(42,11,5,3,'#a3d8c6')+rect(51,11,4,3,'#a3d8c6');
  if(level>=8)body+=repeat(4,i=>rect(43,58+i*2,10,1,'#cad1be'));
  if(level>=9)body+=[16,79].map(x=>rect(x,25,1,5,'#e2ddc0')+rect(x+1,25,3,2,'#d1b368')).join('');
  if(level>=10)body+=group('floodlights',floodlight(3,12)+floodlight(83,12));
  if(level>=11)body+=floodlight(3,39)+floodlight(83,39);
  if(level>=12)body+=rect(25,22,14,2,'#4b7391')+rect(56,22,14,2,'#4b7391')+rect(25,23,14,1,'#b1cbcc')+rect(56,23,14,1,'#b1cbcc');
  if(level>=13)body+=rect(17,54,61,2,'#254f5c')+repeat(10,i=>rect(19+i*6,54,3,1,'#b4dbd3'));
  if(level>=14)body+=rect(40,59,16,7,'#667f88')+rect(43,59,10,7,'#273f4a')+rect(44,60,8,1,'#a4c7c7');
  if(level>=15)body+=group('canopy',path('M11 13l8-7h58l8 7-7 3H18z','#b0c6c4')+path('M19 6h58l-3 3H22z','#e4e7d6')+
    rect(12,13,72,2,'#4e7480')+repeat(6,i=>rect(20+i*11,9,1,6,'#678d96')));
  if(level>=16)body+=rect(32,14,32,6,'#274657')+repeat(5,i=>rect(34+i*6,15,4,3,'#96c9d5'));
  if(level>=17)body+=rect(19,5,1,7,'#ced6c3')+rect(20,5,7,3,'#7596c1')+rect(74,5,1,7,'#ced6c3')+rect(67,5,7,3,'#c4b170');
  if(level>=18)body+=path('M5 25l7-6v35l-7 4z','#b7cbcb')+path('M91 25l-7-6v35l7 4z','#d5dfd3')+rect(7,26,2,24,'#6a939e')+rect(87,26,2,24,'#7299a2');
  if(level>=19)body+=rect(17,60,22,5,'#5e8394')+rect(57,60,22,5,'#5e8394')+repeat(3,i=>rect(19+i*7,61,4,3,'#b1d4d7')+rect(59+i*7,61,4,3,'#b1d4d7'));
  if(level>=20)body+=group('stadium',path('M10 58h29v3H17l-7-3zM57 58h29l-7 3H57z','#e4e6d2')+rect(17,65,63,2,'#bdcaba')+
    rect(36,4,24,7,'#395a69')+rect(38,5,20,4,'#8dc3c8')+rect(39,6,6,2,'#e3ecd2')+rect(51,6,6,2,'#e3ecd2')+rect(13,15,1,9,'#d7ca8b')+rect(81,15,1,9,'#d7ca8b'));
  return body;
}

// Keep the existing public name for all callers. Only valid IDs reach SVG markup.
export function facilityIcon(id,level=1) {
  if(!Object.hasOwn(FACILITY_BY_ID,id))throw new RangeError('Unknown facility art');
  const normalized=Number.isFinite(level)?Math.max(1,Math.min(MAX_FACILITY_LEVEL,Math.floor(level))):1;
  const key=`${id}:${normalized}`;
  if(cache.has(key))return cache.get(key);
  const body=id==='futsal'?futsal(normalized):building(id,normalized);
  const svg=`<svg class="facility-art" viewBox="0 0 96 72" aria-hidden="true" shape-rendering="crispEdges">${body}</svg>`;
  cache.set(key,svg);return svg;
}
export const facilityArt=facilityIcon;
