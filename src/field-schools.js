import { SCHOOLS } from './schools.js';

export function ownedSchools(state) {
  return Object.values(SCHOOLS)
    .filter(school => (state[school.field] ?? 0) > 0)
    .map(school => ({id:school.id, name:school.name, level:state[school.field]}));
}

// A single left-aligned campus row sits above the equipment and its labels.
export function layoutFieldSchools(schools, equipment, width, height) {
  const gap = 8;
  const w = Math.min(height < 150 ? (schools.length > 1 ? 24 : 36) : 50, (width - 24 - gap * Math.max(0, schools.length - 1)) / Math.max(1, schools.length));
  const h = w * 72 / 96;
  const bottom = equipment.length ? Math.min(...equipment.map(item => item.y)) - 14 : height - 26;
  return schools.map((school,i) => ({...school, x:12+i*(w+gap), y:bottom-h, width:w, height:h}));
}

export function fieldArmyArea(schools, equipment, width, height) {
  const equipmentTop = equipment.length ? Math.min(...equipment.map(item => item.y)) : height - 20;
  if (schools.length && schools[0].y < 60) {
    const x = Math.max(...schools.map(item => item.x + item.width)) + 6;
    return { x, y: 22, width: width - x - 8, height: Math.max(0, equipmentTop - 22 - 4) };
  }
  return { x: 13, y: 34, width: width - 26,
    height: Math.max(0, schools.length ? schools[0].y - 34 - 8 : equipmentTop - 34 - 8) };
}
