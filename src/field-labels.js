// Browser text stays sharp independently of the pixel-art canvas scaling.
// Called only after the cached scene changes (army, equipment or dimensions).
export function renderFieldLabels(layer, army, equipment, width, height) {
  if (!layer) return;
  const labels = army.filter(item => item.label).map(item => ({
    ...item,
    text: item.name + (item.count > 1 ? " ×" + item.count : ""),
    labelWidth: item.boxWidth,
  }));
  if (equipment.length > 1) labels.push(...equipment.map(item => ({
    ...item, text: item.name, labelWidth: item.width, centered: true,
  })));
  layer.replaceChildren(...labels.map(item => {
    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = item.text;
    label.style.left = `${item.x / width * 100}%`;
    label.style.top = `${(item.y + item.height + 1) / height * 100}%`;
    label.style.width = `${item.labelWidth / width * 100}%`;
    label.style.textAlign = item.centered ? "center" : "left";
    return label;
  }));
}
