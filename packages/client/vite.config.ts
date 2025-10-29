import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
   plugins: [react()],
   resolve: {
      alias: {
         '@': path.resolve(__dirname, './src'),
      },
   },
   server: {
      proxy: {
         '/api': {
            target: 'https://ai-chatbot-by-mayur.onrender.com',
            changeOrigin: true,
            secure: false,
         },
      },
   },
});
