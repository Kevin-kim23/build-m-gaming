// Browser text stays sharp independently of the pixel-art canvas scaling.
// Called only after the cached scene changes (army, equipment or dimensions).
import { schoolIcon } from './school-art.js';

export function renderFieldLabels(layer, army, equipment, width, height, schools = []) {
  if (!layer) return;
  const labels = army.filter(item => item.label).map(item => ({
    ...item,
    text: item.name + (item.count > 1 ? " ×" + item.count : ""),
    labelWidth: item.boxWidth,
  }));
  if (equipment.length > 1) labels.push(...equipment.map(item => ({
    ...item, text: item.name, labelWidth: item.width, centered: true,
  })));
  const elements = labels.map(item => {
    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = item.text;
    label.style.left = `${item.x / width * 100}%`;
    label.style.top = `${(item.y + item.height + 1) / height * 100}%`;
    label.style.width = `${item.labelWidth / width * 100}%`;
    label.style.textAlign = item.centered ? "center" : "left";
    return label;
  });
  for (const item of schools) {
    const campus = document.createElement('span');
    campus.className = 'field-school';
    campus.style.left = `${item.x / width * 100}%`;
    campus.style.top = `${item.y / height * 100}%`;
    campus.style.width = `${item.width / width * 100}%`;
    campus.style.height = `${item.height / height * 100}%`;
    // Only trusted, cached SVG geometry from our own school catalog.
    campus.innerHTML = schoolIcon(item.id,item.level);
    const name = document.createElement('span');
    name.className = 'field-school-name';
    name.textContent = `${item.name} Lv.${item.level}`;
    campus.append(name);
    elements.push(campus);
  }
  layer.replaceChildren(...elements);
}
