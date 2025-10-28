import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
   plugins: [react(), tailwindcss()],
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './src'),
      },
   },
   server: {
      proxy: {
         // Use the object syntax for more control
         '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true, // Recommended for avoiding CORS/origin issues
            // secure: false, // Use this if your backend is on https with self-signed cert
         },
      },
   },
});
