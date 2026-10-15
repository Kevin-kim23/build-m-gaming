// Display-only menu composition: no session, persistence, purchases or rewards.
import '../src/style.css';
import '../src/battle.css';
import '../src/home-actions.css';
import '../src/home-menu.css';
import '../src/ui-theme.css';
import '../src/touch.css';
import {homeMarkup} from '../src/home-view.js';
if(!['http://127.0.0.1:4217','http://127.0.0.1:4225'].includes(location.origin))throw Error('Separate QA origin required');
const p=new URLSearchParams(location.search),width=['320','360','390','412'].includes(p.get('width'))?p.get('width'):'390';
const t=document.createElement('template');t.innerHTML=homeMarkup({});
const dock=t.content.querySelector('.home-dock');
dock.querySelector('#open-battle').hidden=false;
if(p.get('locked')==='1')dock.querySelector('#battle-lock-label').textContent='대위 해금 · 장비 필요';
const preview=document.createElement('main');preview.className='menu-preview';
preview.style.cssText='width:calc(100% - 24px);max-width:'+width+'px;margin:50px auto;border:1px solid #526976;border-radius:12px;overflow:hidden;background:#192a33;';
preview.innerHTML='<p style="padding:12px 16px;color:#c4d0d6;font:12px/1.6 system-ui;margin:0">하단 메뉴 미리보기 · 배치 확인용<br>게임 기록·구매에 영향 없음</p>';
preview.append(dock);document.body.append(preview);
for(const button of dock.querySelectorAll('button'))button.addEventListener('click',e=>e.preventDefault());
