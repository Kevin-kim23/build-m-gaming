import { fmt } from "./format.js";
export function tapFeedback(zone, gold, event, amount) {
  const bounds = zone.getBoundingClientRect(),
    label = document.createElement("span");
  label.className = "gold-float";
  label.textContent = `+${fmt(amount)} G`;
  const x = event.detail === 0 ? bounds.width / 2 : event.clientX - bounds.left,
    y = event.detail === 0 ? bounds.height * 0.49 : event.clientY - bounds.top;
  label.style.left = `${Math.max(40, Math.min(bounds.width - 46, x))}px`;
  label.style.top = `${Math.max(48, Math.min(bounds.height - 25, y))}px`;
  if (zone.querySelectorAll(".gold-float").length >= 15)
    zone.querySelector(".gold-float").remove();
  zone.appendChild(label);
  setTimeout(() => label.remove(), 700);
  gold.classList.remove("pop");
  void gold.offsetWidth;
  gold.classList.add("pop");
}
