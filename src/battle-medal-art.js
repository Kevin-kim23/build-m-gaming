// Original 96 x 112 campaign decorations; cached by medalSvg alongside formation medals.
const palettes = [
  ['#653c32','#d79665','#ac7549','#ffe0a6'],
  ['#355549','#9cba82','#bba16b','#fff0c0'],
  ['#334f65','#93bed0','#a2b9bb','#f2fbeb'],
  ['#36553e','#b6cb78','#b99a4b','#fff0ae'],
  ['#30475e','#7faec7','#adbec4','#f0ffff'],
  ['#65445b','#c999b6','#d0a356','#fff1ba'],
  ['#344e65','#c4e7ee','#dfbc61','#fff8cc'],
];
export function battleMedalSvg(tier) {
  const [cloth, thread, metal, light] = palettes[tier];
  const parts = [], shadow = '#182827', shade = '#716044';
  const r = (x,y,w,h,c) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  const p = (points,c) => parts.push(`<polygon points="${points}" fill="${c}"/>`);
  const star = (x,y,size,c) => p(`${x},${y-size} ${x+size*.3},${y-size*.3} ${x+size},${y} ${x+size*.3},${y+size*.3} ${x},${y+size} ${x-size*.3},${y+size*.3} ${x-size},${y} ${x-size*.3},${y-size*.3}`,c);
  // Woven ribbon, cut tails, inset clasp and gold/silver suspension loop.
  r(25,2,46,31,shadow);r(27,4,42,28,cloth);
  p('27,30 69,30 63,42 48,35 33,42',cloth);
  for(let x=29;x<68;x+=3)r(x,5,1,25,thread);
  r(33,4,5,29,thread);r(58,4,5,29,thread);
  r(42,4,12,27,cloth);r(44,5,2,24,thread);
  r(25,1,46,4,metal);r(27,1,42,1,light);r(27,4,42,1,shade);
  for(let i=0;i<=tier;i++)r(30+i*5,28,3,2,light);
  r(41,35,14,13,shadow);r(43,36,10,11,metal);r(46,39,4,6,cloth);r(43,36,2,8,light);
  // Tiered star rays, a shaded shield and individually veined laurel leaves.
  if(tier>=2){star(48,76,34+tier,shade);star(48,74,32+tier,metal);}
  if(tier>=3)for(let n=0;n<6;n++){
    const y=59+n*7,x=11+Math.abs(2-n)*3;
    for(const lx of [x,88-x]){r(lx,y,7,6,metal);r(lx,y,5,2,light);r(lx+2,y+2,1,3,shade);}
  }
  p('48,44 76,54 73,87 64,99 48,108 32,99 23,87 20,54',shadow);
  p('48,46 73,55 70,86 61,97 48,104 35,97 26,86 23,55',metal);
  p('48,48 70,57 67,85 59,94 48,100 37,94 29,85 26,57',light);
  p('48,52 66,59 64,84 57,91 48,97 39,91 32,84 30,59',shade);
  p('48,54 64,61 62,83 55,89 48,94 41,89 34,83 32,61',cloth);
  r(34,63,2,17,thread);r(59,69,2,15,shadow);
  for(let i=0;i<5;i++){r(33+i*7,54+Math.abs(2-i)*2,2,2,light);r(35+i*6,91+Math.min(i,4-i)*3,2,2,metal);}
  const sword = (x,y) => {p(`${x},${y} ${x+3},${y+5} ${x+2},${y+22} ${x-2},${y+22} ${x-3},${y+5}`,light);r(x, y+5,1,16,metal);r(x-6,y+22,12,3,metal);r(x-1,y+25,3,6,light);r(x-3,y+31,7,2,metal);};
  if(tier===0)sword(48,58);
  if(tier===1){r(41,59,3,31,metal);r(41,59,1,30,light);p('44,60 61,63 56,70 62,76 44,73',light);p('46,63 57,65 52,70 46,69',thread);r(38,88,12,2,metal);}
  if(tier===2){
    p('37,59 40,59 59,85 56,88 35,63',light);p('59,59 62,63 40,88 37,85 56,59',metal);
    r(35,78,11,3,light);r(51,78,11,3,light);star(48,69,6,light);r(47,68,2,2,thread);
  }
  if(tier===3){
    r(37,65,22,22,metal);r(39,64,18,2,light);r(35,60,7,20,light);r(54,60,7,20,light);
    for(const x of [35,39,54,58])r(x,57,3,5,metal);
    r(39,71,2,4,cloth);r(55,71,2,4,cloth);r(45,78,6,10,cloth);r(46,78,4,2,shade);r(34,87,28,3,light);
  }
  if(tier===4){
    for(let i=0;i<4;i++){r(34+i*3,63+i*4,9,3,light);r(53-i*3,63+i*4,9,3,light);}
    p('48,61 53,68 51,82 48,88 45,82 43,68',metal);r(47,64,4,3,light);r(51,65,4,2,light);r(48,66,1,1,shadow);star(48,76,5,light);
  }
  if(tier===5){
    star(48,74,16,metal);star(48,74,12,light);star(48,74,7,cloth);
    r(38,62,20,3,metal);r(38,58,3,6,light);r(47,56,3,8,light);r(55,58,3,6,light);r(47,72,3,4,thread);
  }
  if(tier===6){
    p('37,69 42,71 48,63 54,71 59,69 56,85 40,85',light);
    r(41,83,14,3,metal);r(43,75,2,6,thread);r(48,72,2,8,cloth);r(53,75,2,6,thread);
    for(const [x,y] of [[36,67],[47,61],[58,67]])star(x+1,y+1,3,light);
    for(const x of [8,84]){star(x,48,5,light);r(x-1,57,2,8,metal);}
    r(38,103,20,4,metal);r(40,103,16,1,light);star(48,106,4,light);
  }
  return `<svg class="achievement-medal-svg" viewBox="0 0 96 112" aria-hidden="true" focusable="false" shape-rendering="crispEdges">${parts.join('')}</svg>`;
}
