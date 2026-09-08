import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		{
			name: 'configure response headers',
			configureServer: (server) => {
				server.middlewares.use((_req, res, next) => {
					res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
					res.setHeader(
						'Cross-Origin-Embedder-Policy',
						'credentialless',
					);
					next();
				});
			},
		},
		{
			name: 'shader-hmr',
			handleHotUpdate: ({ file, server }) => {
				if (file.endsWith('.wgsl')) {
					server.ws.send({
						type: 'custom',
						event: 'shader-update',
						data: { file },
					});
					return [];
				}

				return;
			},
		},
	],
	build: {
		modulePreload: { polyfill: false },
		target: 'esnext',
	},
});
