// Display-only fixture. No billing bridge, transaction handler, account or save writes.
import '../src/style.css';
import '../src/home-auto-tap.css';
import '../src/store.css';
import '../src/touch.css';
import {freshState} from '../src/state.js';
import {storeMarkup,renderStore} from '../src/store-panels.js';
import {STARTER_PACK} from '../src/starter-pack.js';
import {HOME_AUTO_TAP} from '../src/home-auto-tap-rules.js';
if(location.origin!=='http://127.0.0.1:4217')throw Error('Separate QA origin required');
const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','상점 판매 화면 미리보기');
dialog.innerHTML='<p style="color:#b7c7c5;font:11px system-ui">판매 화면 미리보기 · 예시 가격 · 결제 불가</p><h2>상점</h2>'+storeMarkup();document.body.append(dialog);
const price=won=>({configured:true,price:won.toLocaleString('ko-KR')+'원'});
renderStore(freshState(),dialog,{allowTestGrant:false,billing:price(HOME_AUTO_TAP.priceWon),starterBilling:price(STARTER_PACK.priceWon)});
for(const b of dialog.querySelectorAll('button')){b.setAttribute('aria-label',b.textContent+' · 미리보기에서는 결제 불가');b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();});}
dialog.style.cssText='width:calc(100% - 24px);max-width:390px;max-height:calc(100dvh - 24px);padding:16px;border:1px solid #718477;border-radius:12px;background:#26352f;color:#eee8d8;';dialog.showModal();
