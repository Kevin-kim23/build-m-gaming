const LOCAL_PROJECT='demo-budae-kiugi';
const MARKERS=['FUNCTIONS_EMULATOR','FIREBASE_AUTH_EMULATOR_HOST','FIRESTORE_EMULATOR_HOST',
  'FIREBASE_DEBUG_MODE','FIREBASE_DEBUG_FEATURES'];

// Firebase Functions 7.4 also honors FIREBASE_DEBUG_MODE/FIREBASE_DEBUG_FEATURES
// independently of our own emulator flag. Never let these reach a real project.
export function isLocalEmulator({projectId,env=process.env}) {
  const local=projectId===LOCAL_PROJECT&&env.FUNCTIONS_EMULATOR==='true'
    &&env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099'
    &&env.FIRESTORE_EMULATOR_HOST==='127.0.0.1:8080';
  if(local)return true;
  if(projectId===LOCAL_PROJECT||MARKERS.some(key=>env[key]!==undefined)){
    // Do not include environment values: they may contain addresses or credentials.
    throw Object.assign(new Error('unsafe-server-environment'),{code:'unsafe-server-environment'});
  }
  return false;
}
