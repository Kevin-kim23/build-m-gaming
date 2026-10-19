// Display-only fixture. No billing bridge, transaction handler, account or save writes.
import '../src/style.css';
import '../src/shop.css';
import '../src/home-auto-tap.css';
import '../src/home-actions.css';
import '../src/store.css';
import '../src/potions.css';
import '../src/ui-theme.css';
import '../src/touch.css';
import {freshState} from '../src/state.js';
import {renderStore} from '../src/store-panels.js';
import {shopMarkup} from '../src/shop.js';
import {STARTER_PACK} from '../src/starter-pack.js';
import {HOME_AUTO_TAP} from '../src/home-auto-tap-rules.js';
import {homeOfferMarkup} from '../src/home-offer-popup.js';
if(!['http://127.0.0.1:4217','http://127.0.0.1:4225','http://127.0.0.1:4233'].includes(location.origin))throw Error('Separate QA origin required');
const params=new URLSearchParams(location.search),width=['320','360','390','412'].includes(params.get('width'))?params.get('width'):'390';
const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','상점 판매 화면 미리보기');
const price=won=>({configured:true,price:won.toLocaleString('ko-KR')+'원'});
const offer=params.get('offer'),body=offer==='auto'||offer==='max'?'<h2>상점</h2>'+homeOfferMarkup(offer,{allowTestGrant:false,billing:price(offer==='auto'?HOME_AUTO_TAP.priceWon:STARTER_PACK.priceWon)}).body:shopMarkup(freshState(),'','','store');
dialog.innerHTML='<p style="color:#b7c7c5;font:11px system-ui">판매 화면 미리보기 · 예시 가격 · 결제 불가</p>'+body;document.body.append(dialog);
const state=freshState(),mode=params.get('case');
if(mode==='owned'){state.homeAutoTap={owned:true,enabled:true,source:'play'};state.starterPack={claimed:true,source:'play'};}
const billing=won=>mode==='test'?null:mode==='missing'?{configured:true,price:null}:price(won);
renderStore(state,dialog,{allowTestGrant:mode==='test',billing:billing(HOME_AUTO_TAP.priceWon),starterBilling:billing(STARTER_PACK.priceWon)});
for(const b of dialog.querySelectorAll('button')){b.setAttribute('aria-label',b.textContent+' · 미리보기에서는 결제 불가');b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();});}
dialog.style.cssText='width:calc(100% - 24px);max-width:'+width+'px;max-height:calc(100dvh - 24px);padding:16px;border:1px solid #526976;border-radius:12px;background:#17262e;color:#f2ede0;';dialog.showModal();
