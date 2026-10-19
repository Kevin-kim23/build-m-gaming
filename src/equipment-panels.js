import {personalMarkup,renderPersonalList} from './personal-panels.js';
import {equipmentStoreMarkup,renderEquipmentStore} from './equipment-tiles.js';
import {fmtGold} from './format.js';
import {panelHeaderMarkup} from './panel-header.js';
export {equipmentStoreMarkup,renderEquipmentStore} from './equipment-tiles.js';

// Both independent panels use the same list presentation. `id` is retained for
// existing open-panel callers; selection no longer replaces the visible list.
export function equipmentPanelMarkup(state,id,category='military') {
  const personal=category==='personal',title=personal?'개인장비':'군사 장비';
  return `<div class="sheet-grip"></div>${panelHeaderMarkup(state,{title,subtitle:personal?'PERSONAL EQUIPMENT':'MILITARY EQUIPMENT',closeId:'close-equipment',walletId:'equipment-gold'})}`+
    (personal?personalMarkup(state):equipmentStoreMarkup(state))+'<p id="equipment-message" role="status" aria-live="polite"></p>';
}
export function renderEquipmentPanel(state,root,id,{active=true}={}) {
  const wallet=root.querySelector('#equipment-gold'),gold=fmtGold(state.gold);
  if(wallet&&wallet.textContent!==gold)wallet.textContent=gold;
  renderEquipmentStore(state,root,{active});
  renderPersonalList(state,root,{active});
}
