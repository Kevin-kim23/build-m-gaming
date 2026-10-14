import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

test('native launch hides the legacy icon and matches the studio video background', () => {
  const styles = read('android/app/src/main/res/values/styles.xml');
  assert.match(styles, /windowSplashScreenAnimatedIcon">@drawable\/launch_empty/);
  assert.match(styles, /windowSplashScreenBackground">#F5F6F2/);
  assert.doesNotMatch(styles, /@drawable\/app_icon/);
  const empty = read('android/app/src/main/res/drawable/launch_empty.xml');
  assert.match(empty, /#00000000/);
  const activity = read('android/app/src/main/java/com/dongramco/budaekiugi/MainActivity.java');
  assert.match(activity, /SDK_INT >= 31/);
  assert.match(activity, /setOnExitAnimationListener\(view -> view.remove\(\)\)/);
});

test('beta welcome sits with the title above the separate start prompt', () => {
  const html = read('index.html');
  assert.match(html, /opening-lockup[\s\S]*opening-heading" aria-label="부대 키우기"><span>부대<\/span><span>키우기<\/span><\/span>\s*<img class="opening-lettering"[^>]*>\s*<span class="opening-welcome">- 베타테스터 여러분을 환영합니다 -<\/span>/);
  assert.ok(html.indexOf('opening-welcome') < html.indexOf('opening-prompt'));
  assert.match(html, /id="opening-title" type="button"/);
});

test('launch gestures are scoped to opening without disabling browser zoom globally',()=>{
 const css=read('src/opening.css'),html=read('index.html');
 assert.match(css,/#opening\s*\{[^}]*touch-action: none;/);
 assert.match(html,/id="opening-art" draggable="false"/);
 assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
});
