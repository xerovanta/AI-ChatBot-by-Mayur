import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
   plugins: [react()],
   resolve: {
      alias: {
         // Enable '@' imports from the src directory
         '@': path.resolve(__dirname, './src'),
      },
   },
   server: {
      proxy: {
         // Proxy API requests to the backend server
         '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false, // Disable SSL verification for local development
         },
      },
   },
});
