import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/anthropic/',
  plugins: [
    react(),
    {
      name: 'inject-build-time',
      transformIndexHtml(html) {
        const ts = Date.now()
        let out = html.replace('</head>', `<meta name="build-time" content="${ts}"/>\n</head>`)
        out = out.replace(/((?:src|href)=")([^"]+\.(?:js|css))(")/g, `$1$2?v=${ts}$3`)
        return out
      },
    },
  ],
  assetsInclude: ['**/*.glb', '**/*.gltf'],
})
