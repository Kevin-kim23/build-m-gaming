import { CONSTELLATION_POWERS } from './constellation-officers.js';

export const CONSTELLATION_FORMATIONS = Object.freeze(
  ['Regiment','Division','Corps','FieldArmy','ArmyGroup'].map((id,i)=>Object.freeze({
    id:'constellation'+id, name:'은하단 '+['연대','사단','군단','야전군','집단군'][i],
    size:CONSTELLATION_POWERS[i], width:340+i*22, height:258+i*16,
  })),
);
