import {HOME_AUTO_TAP} from './home-auto-tap-rules.js';

// Original conventional pointer: one outline and a transparent square canvas.
// Repeated HUD/store copies have no SVG IDs, external references or tiny labels.
export const homeAutoTapIcon=`<svg viewBox="0 0 48 48" role="img" aria-label="자동터치 · 초당 ${HOME_AUTO_TAP.tapsPerSecond}회">
  <path d="M12 5v31l8-8 7 15 7-3-7-15h11z" fill="#f9f7ec" stroke="#13252e" stroke-width="3" stroke-linejoin="round"/>
  <path d="M15 12v17l5-5h12z" fill="#fff"/>
  <path d="m23 28 6 12 2-1-6-13z" fill="#b7c8ca"/>
</svg>`;
