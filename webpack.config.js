//@ts-check

'use strict';

const path = require('path');
const fs = require('fs');

class CopyShSyntaxWasmPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise('CopyShSyntaxWasmPlugin', async (compilation) => {
      const distDir = path.resolve(__dirname, 'dist');
      const srcDir = path.resolve(__dirname, 'node_modules', 'sh-syntax');
      // sh-syntax expects `../main.wasm` relative to its lib/, so layout must mirror that.
      const targetLibDir = path.join(distDir, 'sh-syntax', 'lib');
      fs.mkdirSync(targetLibDir, { recursive: true });
      // Copy wasm + lib + vendors so require('sh-syntax') resolves exactly like in node_modules.
      fs.copyFileSync(
        path.join(srcDir, 'main.wasm'),
        path.join(distDir, 'sh-syntax', 'main.wasm')
      );
      fs.copyFileSync(
        path.join(srcDir, 'package.json'),
        path.join(distDir, 'sh-syntax', 'package.json')
      );
      for (const file of fs.readdirSync(path.join(srcDir, 'lib'))) {
        fs.copyFileSync(
          path.join(srcDir, 'lib', file),
          path.join(targetLibDir, file)
        );
      }
      const targetVendorsDir = path.join(distDir, 'sh-syntax', 'vendors');
      fs.mkdirSync(targetVendorsDir, { recursive: true });
      for (const file of fs.readdirSync(path.join(srcDir, 'vendors'))) {
        fs.copyFileSync(
          path.join(srcDir, 'vendors', file),
          path.join(targetVendorsDir, file)
        );
      }
    });
  }
}

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // sh-syntax loads main.wasm via a relative fs.readFile, so it must stay as a real require()
    // pointing at node_modules layout (we copy that layout into dist/ via CopyShSyntaxWasmPlugin).
    // Resolve to the copy we place next to extension.js at dist/sh-syntax/lib/index.cjs,
    // so this works even though vsix does not ship node_modules/.
    'sh-syntax': 'commonjs ./sh-syntax/lib/index.cjs',
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
  },
  experiments: {
    asyncWebAssembly: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  plugins: [new CopyShSyntaxWasmPlugin()],
};

module.exports = config;
