# 圣诞礼物树 · 源码说明（开发者看）

日常使用不需要这个包，直接用「圣诞礼物树.html」就行。这个包是给你改代码用的。

## 本地开发

```bash
python3 -m http.server 8000     # 然后用 Chrome 打开 http://localhost:8000
```

开发版是模块化的，必须走本地服务；改完 js 刷新就能看到。

## 打包成单文件（双击可用的那个 html）

```bash
cd build
npm install three@0.185.0 esbuild@0.25.10
node build.mjs          # 输出到上一级目录的 圣诞礼物树.html
```

它会把代码打包，把手势模型和 wasm 压缩后内嵌进 html，同时让页面在 `file://` 下用内嵌资源加载手势模型。

## 文件结构

```
index.html          界面和样式（Merry Christmas 字体已内嵌）
js/main.js          主逻辑：状态、相框礼物、交互、导出专属文件
js/tree.js          装饰圣诞树：针叶、灯串螺旋、彩球、星星、礼盒、顶星
js/scenes.js        4 个场景（雪原带雪地荧光）
js/fx.js            天空和银河、落雪、炉火、炊烟、流星
js/gifts.js         34 个礼物插画（男生/女生/宝宝）+ 相框画面
js/gesture.js       摄像头 + MediaPipe 手势识别
js/audio.js         八音盒背景音乐和音效
lib/ models/        three.js、MediaPipe、手部模型（本地化，不依赖外网）
```

## 常改的地方

- 加礼物：`gifts.js` 的 `ICONS` 加一张 SVG，`PRESETS` 里加一行
- 改默认名字/祝福：`main.js` 顶部的 `state`
- 手势灵敏度：`gesture.js` 的 `classify()`，`pinch < 0.3` 是捏合判定距离
- 散开速度：`main.js` 里 `dt * 0.72`
