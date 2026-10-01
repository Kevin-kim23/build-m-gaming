import { brush } from './pixel-detail.js';

// Original dress-uniform details shared by recruitment/home portraits and battle sprites.
export function officerDetails(c, unit, overhead = false) {
  const r=brush(c), gold=unit.insigniaKind!=='officer', light=gold?'#edce80':'#ecf2e2';
  if(overhead) {
    r(4,3,5,2,unit.color);r(4,3,5,.5,light);r(4,5,5,1,'#192d3c');
    for(let i=0;i<unit.marks;i++)r(4+i*2,10,1,2,light);
    r(2,8,1,3,light);r(10,8,1,3,light);
    if(gold){r(4,8,4,.6,'#c7ab66');r(10,12,2,3,'#413c4e');}
    return;
  }
  // Peaked cap, polished visor, a shaded jacket and bright shoulder boards.
  r(3,2,13,3,unit.color);r(4,2,11,.5,'#9cacb6');r(3,4.5,13,1,'#1c2937');
  r(6,5.5,8,.5,'#85989f');r(8,2.5,3,1.5,light);r(9,2.5,1,.5,'#ffffff');
  r(4,11,3,7,unit.color);r(11,11,3,7,unit.color);r(4,11,.5,7,'#9cabb3');
  r(4,10,3,1.5,light);r(12,10,3,1.5,light);
  r(5,12,1,2,'#b1bec0');r(12,12,1,2,'#b1bec0');
  r(6,16,6,.6,'#e4ce86');r(8,16,2,1,'#a1823e');
  r(11,13,3,.8,'#973d38');r(11,14,1,.6,'#eed489');r(12,14,2,.6,'#6e9da6');
  for(let i=0;i<unit.marks;i++) {
    const x=7+i*2;
    if(unit.insigniaKind==='general'){r(x,12,.6,3,light);r(x-.7,13,2,1,light);r(x-.4,14,1.4,.5,'#fff5c8');}
    else if(gold){r(x,12,1,3,light);r(x-.5,13,2,1,light);r(x,13,.5,.5,'#fff1be');}
    else {r(x,12,.7,2.5,light);r(x-.5,13,1.7,.7,light);}
  }
  if(unit.schoolLevel>=3){r(3,13,.5,6,light);r(3.5,18,2,.5,light);}
  if(gold){r(13,19,3,3,'#322d3c');r(13,19,3,.5,'#b8aa8a');r(14,20,.5,.5,light);}
  if(unit.schoolLevel>=5){r(14.5,12,.5,6,'#d7b771');r(3,3,2,1,'#d7b771');}
}
