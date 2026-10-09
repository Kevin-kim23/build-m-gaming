// Separate, versioned preferences; never overwrite or migrate the army save.
export const ACCESS_KEY='budae-kiugi-access-v1';
export const ACCESS_SCHEMA=1;
export const TERMS_REVISION=3;
export const ACCESS_POLICY_REVISION=6;
export const AD_NOTICE_REVISION=2;
export const AGE_RECHECK_MS=365*24*60*60*1000;
export function ageBand(value){
  if(!/^\d{1,3}$/.test(String(value)))return null;
  const age=Number(value);
  if(age>120)return null;
  return age<14?'under14':age<19?'teen':'adult';
}
export function parseAccess(raw){
  try{
    const v=typeof raw==='string'?JSON.parse(raw):raw;
    if(!v||v.schema!==ACCESS_SCHEMA||!['under14','teen','adult'].includes(v.ageBand)
      ||!Number.isSafeInteger(v.ageCheckedAt)||v.ageCheckedAt<=0)return null;
    return {schema:ACCESS_SCHEMA,ageBand:v.ageBand,ageCheckedAt:v.ageCheckedAt,
      termsRevision:Number.isSafeInteger(v.termsRevision)?v.termsRevision:0,
      policyRevision:Number.isSafeInteger(v.policyRevision)?v.policyRevision:0,
      acceptedAt:Number.isSafeInteger(v.acceptedAt)?v.acceptedAt:0,
      adsConsent:v.adsConsent===true,adNoticeRevision:Number.isSafeInteger(v.adNoticeRevision)?v.adNoticeRevision:0};
  }catch{return null;}
}
export function accessAccepted(v,now=Date.now()){
  return !!v&&['teen','adult'].includes(v.ageBand)&&v.termsRevision===TERMS_REVISION
    &&v.policyRevision===ACCESS_POLICY_REVISION&&v.acceptedAt>0
    &&now>=v.ageCheckedAt&&now-v.ageCheckedAt<AGE_RECHECK_MS;
}
export function adsAllowed(v,now=Date.now()){
  return accessAccepted(v,now)&&v.adsConsent===true&&v.adNoticeRevision===AD_NOTICE_REVISION;
}
export function acceptAccess({age,terms,privacy},now=Date.now()){
  const band=ageBand(age);
  if(!band||band==='under14'||terms!==true||privacy!==true)return null;
  return {schema:ACCESS_SCHEMA,ageBand:band,ageCheckedAt:now,termsRevision:TERMS_REVISION,
    policyRevision:ACCESS_POLICY_REVISION,acceptedAt:now,adsConsent:false,adNoticeRevision:0};
}
export function createAccessStore({storage,now=Date.now,onError=()=>{}}){
  let record=null;
  try{record=parseAccess(storage.getItem(ACCESS_KEY));}catch(error){onError('access.read',error);}
  function write(next){
    // Deny in memory even if persistent storage fails.
    record=next;
    try{storage.setItem(ACCESS_KEY,JSON.stringify(next));return true;}
    catch(error){record=null;onError('access.save',error);return false;}
  }
  return {
    get record(){return record?{...record}:null;},
    get accepted(){return accessAccepted(record,now());},
    get adsAllowed(){return adsAllowed(record,now());},
    accept(input){const next=acceptAccess(input,now());return !!next&&write(next);},
    setAds(enabled){
      if(enabled&&!accessAccepted(record,now()))return false;
      if(!record)return !enabled;
      return write({...record,adsConsent:enabled===true,adNoticeRevision:enabled?AD_NOTICE_REVISION:0});
    },
    receive(raw){record=parseAccess(raw);},
  };
}
