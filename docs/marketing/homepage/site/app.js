const menu = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { menu?.setAttribute('aria-expanded', 'false'); navigation?.classList.remove('is-open'); }
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open)); navigation?.classList.toggle('is-open', open);
});
navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); if (navigation?.contains(document.activeElement)) menu?.focus(); } });
const company = window.DONGRAMCO_COMPANY || {};
document.querySelectorAll('[data-company]').forEach(node => {
  const value = company[node.dataset.company];
  if (typeof value !== 'string' || !value.trim()) return;
  node.textContent = value; node.classList.remove('blank'); node.removeAttribute('aria-label');
});
document.querySelectorAll('[data-company-link]').forEach(link => {
  const key = link.dataset.companyLink, value = company[key];
  if (typeof value !== 'string' || !value.trim()) return;
  link.textContent = value;
  link.href = key === 'publicEmail' ? `mailto:${value}` : `tel:${value.replace(/[^+\d]/g, '')}`;
  link.hidden = false;
  const placeholder = link.parentElement.querySelector('[data-company]'); if (placeholder) placeholder.hidden = true;
});
const year = document.querySelector('#year'); if (year) year.textContent = new Date().getFullYear();
