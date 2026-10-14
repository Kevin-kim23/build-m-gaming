// CSS animates cached overlays; the pixel scene never redraws each frame.
const colors=Object.freeze({galacticCommand:'#79d2df',galacticGroupCommand:'#9b8bd6',
  galacticCorps:'#6bbdc9',galacticFieldArmy:'#a395d7',galacticArmyGroup:'#dfb369',
  galacticAlliedArmy:'#9ceff1',galacticGrandAlliedArmy:'#dfb864'});
export const buildingAura=id=>id.startsWith('constellation')?'#171425':colors[id]??null;
