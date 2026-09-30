import { FORMATIONS, groupArmy } from "./formations.js";
import { UNITS } from "./units.js";

// Presentation only: saves, promotion strength and income always use the full army.
export function fieldArmy(army) {
  const all = groupArmy(army);
  const hierarchy = [...FORMATIONS].reverse();
  const largest = all[0];
  const tier = largest ? hierarchy.findIndex((f) => f.id === largest.id) : 0;
  const minimum = hierarchy[Math.max(0, tier - 2)];
  const groups = all.filter((g) => g.size >= minimum.size);
  return {
    groups,
    minimum,
    largest,
    hiddenPower: all
      .filter((g) => g.size < minimum.size)
      .reduce((n, g) => n + g.size * g.count, 0),
  };
}

export function fieldSummary(army) {
  const view = fieldArmy(army);
  return view.groups
    .map((g) => `${g.name} ${g.count}${UNITS[g.id] ? "명" : "개"}`)
    .join(" · ");
}

function pack(items, area, factor) {
  let x = area.x,
    y = area.y,
    rowHeight = 0;
  const placed = [];
  for (const item of items) {
    const width = Math.max(1, Math.round(item.preferredWidth * factor));
    const height = Math.max(1, Math.round(item.preferredHeight * factor));
    const label = !UNITS[item.id] || item.count > 1 ? 9 : 0;
    const labelText = item.name + (item.count > 1 ? " ×" + item.count : "");
    const boxWidth = Math.max(width, label ? Math.max(30, labelText.length * 6) : width);
    if (x > area.x && x + boxWidth > area.x + area.width) {
      x = area.x;
      y += rowHeight + 5;
      rowHeight = 0;
    }
    if (boxWidth > area.width || y + height + label > area.y + area.height)
      return null;
    placed.push({
      ...item,
      x,
      y,
      width,
      height,
      boxWidth,
      boxHeight: height + label,
      label: !!label,
    });
    x += boxWidth + 6;
    rowHeight = Math.max(rowHeight, height + label);
  }
  return placed;
}

export function layoutFieldArmy(army, area) {
  const { groups, largest } = fieldArmy(army);
  if (!groups.length) return [];
  const hierarchy = [...FORMATIONS].reverse();
  const largestTier = Math.max(
    0,
    hierarchy.findIndex((f) => f.id === largest.id),
  );
  const scale = UNITS[largest.id] ? 1 : Math.min(1.35, 56 / largest.width);
  const makeItems = (compact) =>
    groups.flatMap((g) => {
      const tier = Math.max(
        0,
        hierarchy.findIndex((f) => f.id === g.id),
      );
      const relative = scale * 0.86 ** (largestTier - tier);
      const merged = compact || (!UNITS[g.id] && g.count > 3);
      return Array.from({ length: merged ? 1 : g.count }, () => ({
        ...g,
        count: merged ? g.count : 1,
        preferredWidth: g.width * relative,
        preferredHeight: g.height * relative,
      }));
    });
  // Prefer separate icons. When crowded, use one icon and a count per type before shrinking further.
  for (const compact of [false, true]) {
    const items = makeItems(compact);
    for (let factor = 1; factor >= (compact ? 0.1 : 0.65); factor -= 0.05) {
      const result = pack(items, area, factor);
      if (result) return result;
    }
  }
  return [];
}

export function layoutFieldEquipment(items, width, height) {
  const gap = 5,
    w = Math.min(
      66,
      (width - 24 - gap * Math.max(0, items.length - 1)) /
        Math.max(1, items.length),
    ),
    h = (w * 35) / 66;
  return items.map((item, i) => ({
    ...item,
    x: Math.round(12 + i * (w + gap)),
    y: Math.round(height - (items.length > 1 ? 23 : 12) - h),
    width: Math.floor(w),
    height: Math.floor(h),
  }));
}
