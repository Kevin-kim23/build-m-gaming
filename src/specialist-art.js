import { brush } from './pixel-detail.js';

// Original pixel accessories on the shared shaded uniform. No third-party art or protected medical emblems.
export function specialistDetails(c, unit) {
  const r=brush(c), dark='#213b36', light='#cedacd';
  r(3,2,13,3,unit.color);r(4,2,10,.5,light);r(3,5,12,1,dark);
  r(4,11,3,7,unit.color);r(12,11,3,7,unit.color);
  if(unit.id==='administrator') {
    // Clipboard, paper lines, pen and a blue shoulder tab.
    r(9,12,7,10,'#394c4d');r(9.5,12.5,6,8.5,'#b59a6a');r(10,13,5,7,'#ece3bf');
    r(11,12,3,1,'#809995');for(let y=15;y<19;y+=1.5)r(10.5,y,3.5,.4,'#63766f');
    r(15,14,.7,6,'#7dbcc8');r(3,11,2,1,'#93bbd1');
  } else if(unit.id==='driver') {
    // Goggles, headset and a leather tool pouch.
    r(4,4,10,2.5,dark);r(5,4.5,3,1.3,'#a6c4ca');r(10,4.5,3,1.3,'#a6c4ca');
    r(14,5,1,4,'#a5aa8d');r(12,9,3,.6,'#d9c99c');
    r(10,15,6,5,'#60462f');r(10.5,15,5,.6,'#c5a66d');r(12,16,1,3,'#bdc4b1');
    r(2,12,1,6,'#bd9b63');
  } else if(unit.id==='medic') {
    // Teal kit with a heart-shaped mark rather than a red cross.
    r(3,3,12,1.5,'#b0d1c1');r(4,10,1,9,'#b5cbb5');
    r(10,15,7,7,'#285c56');r(10.5,15.5,6,5.5,'#6fae9b');r(11,16,5,.5,'#d9ece1');
    r(12,18,1.5,1,'#e2eee1');r(14,18,1.5,1,'#e2eee1');r(12.5,19,2.5,1,'#e2eee1');r(13.3,20,1,.5,'#e2eee1');
  } else if(unit.id==='warrantOfficer') {
    // Gold diamond, polished visor, technical insignia and bright shoulder boards.
    r(3,4.5,13,1,'#182b32');r(7,5.5,7,.4,'#adbbaf');
    r(3,10,3,1.5,'#d6b850');r(13,10,3,1.5,'#d6b850');
    r(7,12,6,7,dark);r(9.5,12.5,1,4,'#f3cc57');r(8.5,14,3,1,'#f3cc57');r(9.5,13,.5,2,'#fff2ae');
    r(11,17,3,.5,'#b8d2c5');r(11,18,3,.5,'#d4af67');r(3,12,.5,6,'#d2b867');
  }
}
