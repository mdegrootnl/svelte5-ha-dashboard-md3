import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	compilerOptions: {
		runes: true
	},

	kit: {
		adapter: adapter(),
		csrf: {
			checkOrigin: false
		},
		alias: {
			"$components": "src/lib/components",
			"$stores": "src/lib/stores",
			"$utils": "src/lib/utils",
			"$types": "src/lib/types"
		}
	}
};

export default config;
