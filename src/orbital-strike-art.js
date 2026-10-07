// Original energy strike: descend from the sky onto the opposing headquarters.
// This draws the existing strike event only; damage and timing remain in battle.js.
export function drawOrbitalStrike(c,age,width,height,side='player') {
  if(age<0||age>600)return;
  const x=width/2,target=side==='enemy'?height-52:56;
  const progress=Math.min(1,age/180),head=Math.max(1,Math.round(target*progress));
  const glow=side==='enemy'?'#f6b4cb':'#82eaff',core='#edffff';
  const rect=(a,b,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(a),Math.round(b),Math.round(w),Math.round(h));};
  c.globalAlpha=Math.max(0,1-age/600);
  if(age<410) {
    rect(x-8,0,16,head,side==='enemy'?'#734765':'#255b91');
    rect(x-4,0,8,head,glow);rect(x-1,0,2,head,core);
    rect(x-7,Math.max(0,head-3),14,4,core);
  }
  if(age<180)return;
  const impact=(age-180)/420,radius=12+impact*40;
  // Pixel ellipse follows the ground plane rather than a flat screen flash.
  for(let n=0;n<24;n++) {
    const angle=n*Math.PI/12;
    rect(x+Math.cos(angle)*radius-1,target+Math.sin(angle)*radius*.45-1,3,2,n%3?glow:core);
  }
  const flash=Math.max(2,Math.round(12*(1-impact)));
  rect(x-flash/2,target-flash/2,flash,flash,core);
  for(let n=0;n<10;n++) {
    const angle=n*Math.PI/5,distance=8+impact*35;
    rect(x+Math.cos(angle)*distance,target+Math.sin(angle)*distance*.5,2,3,n%2?glow:core);
  }
}
