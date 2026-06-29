import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'fix-ilib',
      transform(code: string, id: string) {
        if (id.replace(/\\/g, '/').includes('node_modules/ilib/index.js')) {
          return code.replace(
            /require\("\.\/lib\/ilib-(node|qt|rhino|ringo)\.js"\)/g,
            'require("./lib/ilib-webpack.js")'
          );
        }
      },
    },
    {
      name: 'fix-enyo-loader',
      transform(code: string, id: string) {
        if (id.replace(/\\/g, '/').includes('@enact/i18n/src/glue.js')) {
          return code.replace(
            `_ilib["default"].setLoaderCallback(new _Loader["default"]());`,
            [
              `_ilib["default"].setLoaderCallback({`,
              `  loadFiles: function(paths, sync, params, callback) {`,
              `    if (typeof callback === 'function') callback([]);`,
              `    return [];`,
              `  }`,
              `});`,
            ].join('\n')
          ).replace(
            [
              `if (typeof ILIB_ADDITIONAL_RESOURCES_PATH !== 'undefined') {`,
              `  _ilib["default"].getLoader().addPath(ILIB_ADDITIONAL_RESOURCES_PATH);`,
              `}`,
            ].join('\n'),
            ''
          );
        }
      },
    },
  ],
  base: './',
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  define: {
    global: 'globalThis',
  },
  build: {
    outDir: 'build',
    assetsDir: 'static',
    target: 'es2015',
  },
  server: {
    port: 3000,
  },
  optimizeDeps: {
    exclude: ['ilib'],
  },
});
