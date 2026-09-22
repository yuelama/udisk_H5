import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  define: {
    'process.env': {
      VUE_APP_API_URL: JSON.stringify(process.env.VUE_APP_API_URL || ''),
      VUE_APP_USE_MOCK: JSON.stringify(process.env.VUE_APP_USE_MOCK || 'true')
    }
  }
})
