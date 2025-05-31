import {defineConfig, loadEnv} from "vite";
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/shared-video': {
          target: env.VITE_APP_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/shared-video/, '/shared-video/shared'),
        }
      },
      allowedHosts: true,
    },
  };
});
