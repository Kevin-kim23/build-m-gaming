import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// The app version shown on the info screen comes from package.json, so it cannot drift.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default defineConfig(({mode}) => ({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: mode === 'firebase-dev' ? [{
    name: 'mark-firebase-development-build',
    generateBundle() { this.emitFile({type: 'asset', fileName: 'firebase-development-build.json', source: '{"developmentOnly":true}'}); },
  }] : [],
}));
