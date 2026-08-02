import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/wordle-oyunu/', // Buraya GitHub repository ismini tam olarak bu formatta yazmalısın
});
