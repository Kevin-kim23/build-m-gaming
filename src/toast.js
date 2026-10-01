import './toast.css';

// One short message at the bottom of the screen (the #toast element in index.html).
let timer = 0;
export function showToast(text, ms = 1800) {
  const node = document.querySelector('#toast');
  if (!node) return;
  node.textContent = text;
  node.classList.add('is-visible');
  clearTimeout(timer);
  timer = setTimeout(() => node.classList.remove('is-visible'), ms);
}
