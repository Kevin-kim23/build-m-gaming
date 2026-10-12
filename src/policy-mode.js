// Vite folds this at build time. Node document generation defaults to release.
const mode = import.meta.env?.MODE;
export const DEVELOPMENT_POLICY = mode === 'development' || mode === 'firebase-dev';
