import {HOME_AUTO_TAP} from './home-auto-tap-rules.js';

// Original compact pixel pointer on a transparent background; no machine or backing plate.
// No SVG IDs, external references or animation: repeated HUD/store copies share safe static markup.
export const homeAutoTapIcon=`<svg viewBox="0 0 66 80" role="img" aria-label="자동터치 · 초당 ${HOME_AUTO_TAP.tapsPerSecond}회" shape-rendering="crispEdges">
  <path d="M18 9h4v3h3v3h3v3h3v3h3v3h3v3h3v3h3v3h3v3h4v6H37l8 15-11 6-9-18-7 7z" fill="#102128"/>
  <path d="M21 14l25 24H33l9 18-6 3-10-21-5 8z" fill="#a7a996"/>
  <path d="M21 14l22 21H30l10 20-4 2-11-23-4 8z" fill="#ecead5"/>
  <path d="M21 14l17 17H25v3l-4 8z" fill="#fffceb"/>
  <path d="M26 35h3l10 20-3 2z" fill="#d2c89c"/>
  <path d="M22 18h2v18l-2 4z" fill="#ffffff"/>
  <path d="M33 37h12v2H34zM38 56l3-1v2l-5 3-1-2z" fill="#737f7a"/>
  <text x="34" y="72" text-anchor="middle" font-family="monospace" font-size="13" font-weight="900" letter-spacing="1" fill="#fff0b2" shape-rendering="auto">×${HOME_AUTO_TAP.tapsPerSecond}</text>
</svg>`;
