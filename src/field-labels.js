import { facilityIcon } from './facility-art.js';
import { fmt } from "./format.js";
// Browser text stays sharp independently of the pixel-art canvas scaling.
// Called only after the cached scene changes (army, equipment or dimensions).
import { schoolIcon } from './school-art.js';

export function renderFieldLabels(layer, army, equipment, width, height, schools = [], facilities = [], pages = []) {
  if (!layer) return;
  const labels = army.filter(item => item.label).map(item => ({
    ...item,
    text: item.name + (item.count > 1 ? " ×" + item.count : ""),
    labelWidth: item.boxWidth,
  }));
  labels.push(...equipment.map(item => ({
    ...item, text: item.shortName??item.name, labelWidth: item.width, centered: true, gearCount: item.count ?? 1,
  })));
  const elements = labels.map(item => {
    const label = document.createElement("span");
    label.className = item.wrapLabel ? "field-label field-label-wrap" : "field-label";
    label.textContent = item.text;
    if (item.gearCount) {
      const count = document.createElement("span");
      count.className = "field-equipment-count"; count.textContent = `[${fmt(item.gearCount)}문]`;
      label.append(count);
    }
    label.style.left = `${item.x / width * 100}%`;
    label.style.top = `${(item.y + item.height + 1) / height * 100}%`;
    label.style.width = `${item.labelWidth / width * 100}%`;
    label.style.textAlign = item.centered ? "center" : "left";
    return label;
  });
  for (const item of [...schools,...facilities.map(f=>({...f,facility:true}))]) {
    const campus = document.createElement('span');
    campus.className = 'field-school';
    campus.style.left = `${item.x / width * 100}%`;
    campus.style.top = `${item.y / height * 100}%`;
    campus.style.width = `${item.width / width * 100}%`;
    campus.style.height = `${item.height / height * 100}%`;
    // Only trusted, cached SVG geometry from our own school catalog.
    campus.innerHTML = item.facility ? facilityIcon(item.id) : schoolIcon(item.id,item.level);
    const name = document.createElement('span');
    name.className = 'field-school-name';
    name.textContent = item.facility ? item.name : `${item.name} Lv.${item.level}`;
    campus.append(name);
    elements.push(campus);
  }
  pages.forEach((page,i)=>{
    if(!i)return;
    const title=document.createElement('span');title.className='field-page-title';title.textContent=page.name;
    title.style.left=`${i/pages.length*100}%`;title.style.width=`${100/pages.length}%`;elements.push(title);
  });
  layer.replaceChildren(...elements);
}
