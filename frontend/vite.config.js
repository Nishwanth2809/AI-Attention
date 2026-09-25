import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/video_feed': 'http://127.0.0.1:5000',
      '/upload_video': 'http://127.0.0.1:5000',
      '/stop_feed': 'http://127.0.0.1:5000',
      '/process_frame': 'http://127.0.0.1:5000',
    },
  },
});