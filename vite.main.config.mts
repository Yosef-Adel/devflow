import { defineConfig } from 'vite';
import { builtinModules } from 'module';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'electron',
        'better-sqlite3',
        'get-windows',
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
  },
  resolve: {
    // Ensure native modules are resolved correctly
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
});
