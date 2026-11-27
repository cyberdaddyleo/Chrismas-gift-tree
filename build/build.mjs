// 把整个项目打成一个双击就能打开的 html：代码、字体、手势模型、wasm 全部内嵌
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || path.resolve(SRC, '圣诞礼物树.html');

const res = await esbuild.build({
  entryPoints: [path.join(SRC, 'js/main.js')],
  bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', charset: 'utf8',
  nodePaths: [path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules')],
  logLevel: 'warning', legalComments: 'none',
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const gzb64 = (file) => zlib.gzipSync(fs.readFileSync(file), { level: 9 }).toString('base64');
const wasm = gzb64(path.join(SRC, 'lib/mediapipe/wasm/vision_wasm_internal.wasm'));
const loader = gzb64(path.join(SRC, 'lib/mediapipe/wasm/vision_wasm_internal.js'));
const model = gzb64(path.join(SRC, 'models/hand_landmarker.task'));

const assetsBoot = `<script>
globalThis.__GT_ASSETS__ = (function () {
  var p = null;
  async function dec(id) {
    var b64 = document.getElementById(id).textContent.trim();
    var buf;
    try { buf = await (await fetch('data:application/octet-stream;base64,' + b64)).arrayBuffer(); }
    catch (e) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); buf = u.buffer; }
    return await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  return function () {
    return p || (p = (async function () {
      var w = await dec('gt-wasm'), l = await dec('gt-loader'), m = await dec('gt-model');
      return {
        wasm: URL.createObjectURL(new Blob([w], { type: 'application/wasm' })),
        loader: URL.createObjectURL(new Blob([l], { type: 'text/javascript' })),
        model: new Uint8Array(m),
      };
    })());
  };
})();
if (/Electron/.test(navigator.userAgent)) document.documentElement.classList.add('electron');
</script>`;

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\n?/, '');
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="gt-build" content="single">');
html = html.replace(/<script type="module" src="\.\/js\/main\.js"><\/script>/, '');
const tail = `
<script id="gt-wasm" type="application/octet-stream">${wasm}</script>
<script id="gt-loader" type="application/octet-stream">${loader}</script>
<script id="gt-model" type="application/octet-stream">${model}</script>
${assetsBoot}
<script>${js}</script>
</body>`;
html = html.replace(/<\/body>/, () => tail);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log('wrote', OUT, (fs.statSync(OUT).size / 1048576).toFixed(1) + 'MB', 'js', (js.length / 1024).toFixed(0) + 'KB');
