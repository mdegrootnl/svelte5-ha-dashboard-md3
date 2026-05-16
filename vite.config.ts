import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), Icons({ compiler: 'svelte' })],
	optimizeDeps: {
		include: [
			'@internationalized/date',
			'@material/material-color-utilities',
			'bits-ui',
			'd3-scale',
			'd3-shape',
			'home-assistant-js-websocket',
			'leaflet',
			'zod'
		]
	},
	server: {
		watch: {
			ignored: ['**/build/**', '**/.svelte-kit/output/**', '**/coverage/**']
		}
	}
});
