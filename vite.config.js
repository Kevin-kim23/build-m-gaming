import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The app version shown on the info screen comes from package.json, so it cannot drift.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default defineConfig(({mode}) => ({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [{
    name: 'mark-firebase-environment',
    generateBundle() {
      const development = mode === 'development' || mode === 'firebase-dev';
      if (!development && mode !== 'production') throw new Error('Unsupported Firebase build mode: ' + mode);
      const environment = development ? 'development' : 'production';
      this.emitFile({type:'asset', fileName:'firebase-' + environment + '-build.json',
        source:JSON.stringify({environment, projectId:development ? 'budae-kiugi-dev' : 'budae-kiugi-prod', version})});
    },
  }],
}));
