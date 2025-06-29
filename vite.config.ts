import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep XML files with their original names and extensions
          if (assetInfo.name?.endsWith('.xml')) {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  publicDir: 'public',
  assetsInclude: ['**/*.xml']
});