import { RANKS } from './ranks.js';
import { generalEmblem, saluteCannon } from './general-promotion-art.js';

const captions=['새로운 별, 새로운 지휘의 시작','두 개의 별 아래, 더 넓은 전선으로','세 개의 별과 함께, 전군의 선봉으로','네 개의 별, 최고 지휘관의 영예','다섯 개의 별, 집단군의 준원수','백색 별 하나, 연합군의 소원수','백색 별 둘, 대연합군의 중원수','백색 별 셋, 총군사령부의 대원수','백색 별 넷, 은하사령부의 특전원수','백색 별 다섯, 은하단 사령부의 부사령관'];
export function generalPromotionMarkup(rank, profile) {
  const {generalTier:tier,salvos,salvoInterval,saluteDelay}=profile;
  const cannons=['left','right'].map((side,index)=>`<div class="general-salute ${side}" style="--salute-delay:${saluteDelay+index*140}ms" aria-hidden="true">
    ${saluteCannon}${Array.from({length:salvos},(_,shot)=>`<span class="salute-shot" style="--shot-delay:${saluteDelay+index*140+shot*salvoInterval}ms"><i class="salute-flash"></i><i class="salute-smoke"></i>${Array.from({length:6},(_,i)=>`<i class="salute-ember" style="--flight-x:${18+i*11}px;--flight-y:${-50-i*12}px;--spark-turn:${i*53}deg"></i>`).join('')}</span>`).join('')}</div>`).join('');
  return `<div class="general-promotion" data-rank="${rank}" data-general-tier="${tier}" style="--salvos:${salvos};--salvo-interval:${salvoInterval}ms">
    <div class="general-aura" aria-hidden="true"></div><div class="general-orbit" aria-hidden="true"></div>
    <p class="general-eyebrow">GENERAL OFFICER</p><p class="general-honor">장성 진급</p>
    ${generalEmblem(tier)}
    <div class="general-title"><p class="general-rule" aria-hidden="true"><i></i>✦<i></i></p><h2>${RANKS[rank]}<span>진급을 명합니다</span></h2><p class="general-caption">${captions[tier-1]}</p></div>
    ${cannons}<div class="general-dust" aria-hidden="true">${Array.from({length:12+tier*4},(_,i)=>`<i style="--dust-x:${5+(i*37)%90}%;--dust-delay:${500+(i%7)*230}ms;--dust-drift:${(i%2?1:-1)*(10+i%5*8)}px"></i>`).join('')}</div>
    <button class="general-continue" data-dismiss-promotion type="button">부대로 돌아가기 <span aria-hidden="true">›</span></button>
  </div>`;
}
