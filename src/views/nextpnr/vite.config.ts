import {defineConfig} from 'vite';

export default defineConfig({
    build: {
        target: 'es2020',
        outDir: 'dist',
        rollupOptions: {
            output: {
                entryFileNames: 'assets/[name].js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name].[ext]'
            }
        }
    },
    define: {
        /* eslint-disable-next-line @typescript-eslint/naming-convention */
        'process.env': {}
    }
});
