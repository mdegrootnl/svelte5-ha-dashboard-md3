import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
    plugins: [
        sveltekit(),
        Icons({ compiler: 'svelte' })
    ],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/tests/setup.ts'],
        include: ['src/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/lib/**/*.{ts,svelte}'],
            exclude: ['src/lib/**/*.test.ts', 'src/lib/types/**']
        }
    },
    resolve: {
        conditions: ['browser', 'development']
    }
});
