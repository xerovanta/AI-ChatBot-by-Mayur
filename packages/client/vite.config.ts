import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'; // 1. Import the plugin

export default defineConfig({
   plugins: [
      react(),
      tailwindcss(), // 2. Add the plugin here
   ],
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './src'),
      },
   },
   server: {
      proxy: {
         '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false, // Add this if your backend is HTTP
         },
      },
   },
});
