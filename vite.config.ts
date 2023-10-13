import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
    build: {
        outDir: 'build',
        minify: false,
        //cssMinify: 'esbuild',
        rollupOptions: {
            input: {
                background: 'src/background.js',
                popup: 'index.html',
            },
            output: {
                entryFileNames: 'src/[name].js',
                chunkFileNames: 'assets/[name].js',
            }
        }
    }
})
