
// One shared "상세" popup for shop, equipment, schools and the rank guide.
// The dialog is created once; callers pass trusted, game-generated markup only.
let dialog = null;
const actionHandlers = [];

// Buttons inside the popup may carry data-detail-action. Each screen registers its handler once
// at startup and ignores actions that are not its own.
export function onDetailAction(handler) { actionHandlers.push(handler); }

function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'detail-modal';
  dialog.setAttribute('aria-labelledby', 'detail-title');
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-detail-close]')) return dialog.close();
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)
        dialog.close();
      return;
    }
    const action = event.target.closest('[data-detail-action]');
    if (action) for (const handle of actionHandlers) handle(action.dataset.detailAction, action.dataset, dialog);
  });
  document.body.append(dialog);
  return dialog;
}

export function detailMarkup({ kicker = '', title, body }) {
  return `<div class="detail-head"><div>${kicker ? `<small>${kicker}</small>` : ''}<h2 id="detail-title">${title}</h2></div>
    <button type="button" class="detail-close" data-detail-close aria-label="상세 닫기">×</button></div>
    <div class="detail-body">${body}</div>`;
}

// Returns the dialog so callers can draw canvases inside it after opening.
export function openDetail(content) {
  const node = ensureDialog();
  node.innerHTML = detailMarkup(content);
  if (!node.open) node.showModal();
  node.scrollTop = 0;
  return node;
}

export const closeDetail = () => dialog?.open && dialog.close();
