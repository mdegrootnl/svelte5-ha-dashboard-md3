import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), Icons({ compiler: 'svelte' })],
	server: {
		watch: {
			ignored: ['**/build/**', '**/.svelte-kit/output/**', '**/coverage/**']
		}
	}
});
