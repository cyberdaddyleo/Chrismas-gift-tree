// 礼物目录 + 自绘 SVG 插画 + 礼物吊牌贴图
import * as THREE from 'three';

const svg = (inner, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs>${defs}</defs>${inner}</svg>`;
const lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</linearGradient>`;
const rg = (id, stops, cx = 0.5, cy = 0.5, r = 0.5) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</radialGradient>`;
const shadow = (rx = 64, cy = 214) => `<ellipse cx="120" cy="${cy}" rx="${rx}" ry="8" fill="#000" opacity=".3"/>`;
const spark = (x, y, r, c = '#fff', o = 1) =>
  `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${c}" opacity="${o}"/>`;
const GOLD = lg('gold', [[0, '#a8741f'], [0.45, '#ffe39a'], [1, '#b8862b']], 0, 0, 1, 0);

const ICONS = {
  ps5: svg(
    `${shadow(56, 212)}
    <ellipse cx="120" cy="205" rx="42" ry="7" fill="#1a1c22"/>
    <rect x="103" y="32" width="34" height="170" rx="8" fill="url(#c)"/>
    <path d="M104 24 C86 26 66 34 62 56 L70 190 C71 200 88 206 104 202 Z" fill="url(#w)"/>
    <path d="M136 24 C154 26 174 34 178 56 L170 190 C169 200 152 206 136 202 Z" fill="url(#w2)"/>
    <path d="M106 36 L106 196 M134 36 L134 196" stroke="#5cb8ff" stroke-width="9" opacity=".25" stroke-linecap="round"/>
    <path d="M106 36 L106 196 M134 36 L134 196" stroke="#8fd0ff" stroke-width="3" stroke-linecap="round"/>
    <path d="M96 34 C84 38 72 44 70 60 L74 120" stroke="#fff" stroke-width="4" fill="none" opacity=".9" stroke-linecap="round"/>
    <rect x="112" y="150" width="16" height="3" rx="1.5" fill="#3a3f4c"/>
    <circle cx="120" cy="164" r="3" fill="#3a3f4c"/>
    ${spark(190, 40, 9)}${spark(50, 70, 6, '#bfe6ff')}`,
    lg('w', [[0, '#ffffff'], [1, '#cfd6e4']], 0, 0, 1, 0) + lg('w2', [[0, '#cfd6e4'], [1, '#ffffff']], 0, 0, 1, 0) +
      lg('c', [[0, '#2b2f3a'], [1, '#0e1016']])
  ),
  controller: svg(
    `${shadow(70, 206)}
    <path d="M62 92 C62 78 76 70 94 70 L146 70 C164 70 178 78 178 92 L198 152 C202 170 190 184 174 182 C162 181 156 172 150 162 L140 144 L100 144 L90 162 C84 172 78 181 66 182 C50 184 38 170 42 152 Z" fill="url(#b)"/>
    <path d="M58 96 C60 84 70 78 84 77" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
    <rect x="98" y="76" width="44" height="30" rx="7" fill="#232733"/>
    <path d="M104 79 L136 79" stroke="#5cb8ff" stroke-width="3" stroke-linecap="round"/>
    <rect x="72" y="92" width="12" height="30" rx="3" fill="#2a2e3a"/><rect x="63" y="101" width="30" height="12" rx="3" fill="#2a2e3a"/>
    <circle cx="162" cy="93" r="7" fill="#ffc24b"/><circle cx="175" cy="107" r="7" fill="#ff6b6b"/>
    <circle cx="162" cy="121" r="7" fill="#4fd1c5"/><circle cx="149" cy="107" r="7" fill="#6ea8ff"/>
    <circle cx="102" cy="130" r="13" fill="#2a2e3a"/><circle cx="102" cy="130" r="7" fill="#424a5c"/>
    <circle cx="138" cy="130" r="13" fill="#2a2e3a"/><circle cx="138" cy="130" r="7" fill="#424a5c"/>
    ${spark(196, 56, 9)}`,
    lg('b', [[0, '#ffffff'], [1, '#c9d0de']])
  ),
  skin: svg(
    `<path d="M120 18 L210 112 L120 206 L30 112 Z" fill="url(#bg)" stroke="url(#gold)" stroke-width="6"/>
    <path d="M120 40 L188 112 L120 184 L52 112 Z" fill="none" stroke="#ffe39a" stroke-width="1.5" opacity=".5"/>
    <path d="M122 68 C118 44 134 26 160 20 C148 34 142 48 140 72 Z" fill="url(#pl)"/>
    <path d="M80 160 C74 104 96 66 120 66 C144 66 166 104 160 160 L148 176 L92 176 Z" fill="url(#hm)"/>
    <path d="M120 66 L120 108" stroke="#fff3c4" stroke-width="5" stroke-linecap="round"/>
    <path d="M90 116 C104 106 136 106 150 116 L146 138 C132 146 108 146 94 138 Z" fill="url(#vi)"/>
    <path d="M90 116 C104 106 136 106 150 116" stroke="#e6fdff" stroke-width="3" fill="none"/>
    <path d="M92 152 L104 170 M148 152 L136 170" stroke="#7a4d14" stroke-width="4" stroke-linecap="round"/>
    <rect x="72" y="178" width="96" height="28" rx="7" fill="#c8322f" stroke="url(#gold)" stroke-width="3"/>
    <text x="120" y="198" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" font-family="PingFang SC,Microsoft YaHei,Noto Sans SC,sans-serif" letter-spacing="4">限定</text>
    ${spark(54, 46, 10, '#ffe39a')}${spark(192, 64, 7, '#bff5ff')}${spark(200, 170, 8, '#ffe39a')}`,
    GOLD + rg('bg', [[0, '#1d6f86'], [1, '#071a24']]) + lg('hm', [[0, '#fff0b8'], [0.5, '#e0a63c'], [1, '#86561a']], 0, 0, 1, 1) +
      lg('vi', [[0, '#b8f7ff'], [1, '#18a0c4']]) + lg('pl', [[0, '#ff6b5e'], [1, '#a3182a']])
  ),
  jersey: svg(
    `${shadow(62, 212)}
    <path d="M86 42 L104 42 C106 58 112 66 120 66 C128 66 134 58 136 42 L154 42 C156 60 166 74 182 80 L178 200 L62 200 L58 80 C74 74 84 60 86 42 Z" fill="url(#j)"/>
    <path d="M120 66 C128 66 134 58 136 42 L154 42 C156 60 166 74 182 80 L178 200 L140 200 C150 150 150 100 120 66 Z" fill="#000" opacity=".12"/>
    <path d="M104 42 C106 58 112 66 120 66 C128 66 134 58 136 42" stroke="#fff" stroke-width="6" fill="none"/>
    <path d="M86 42 C84 60 74 74 58 80 M154 42 C156 60 166 74 182 80" stroke="#fff" stroke-width="6" fill="none"/>
    <path d="M65 98 L63 196 M175 98 L177 196" stroke="#fff" stroke-width="5" opacity=".9"/>
    <text x="120" y="162" text-anchor="middle" font-size="66" font-weight="900" fill="#fff" stroke="#7a0f1a" stroke-width="4" paint-order="stroke" font-family="Arial Black,Arial,Helvetica,sans-serif">10</text>
    ${spark(200, 48, 9)}`,
    lg('j', [[0, '#f0544f'], [1, '#b31b2c']])
  ),
  sneakers: svg(
    `${shadow(80, 196)}
    <path d="M48 152 C46 116 56 90 76 78 L82 54 C84 47 90 44 97 46 L132 56 C138 58 141 64 139 70 L133 98 C151 112 173 120 195 126 C207 130 211 142 207 154 Z" fill="url(#u)"/>
    <path d="M60 152 C66 128 80 112 100 108 C118 106 128 118 138 126 C156 138 180 140 204 142 L207 154 Z" fill="#2ec4b6"/>
    <path d="M44 152 L209 154 C213 166 207 176 195 178 L60 180 C47 180 41 168 44 152 Z" fill="#f4f6fa" stroke="#c9ced8" stroke-width="2"/>
    <path d="M50 168 L205 168" stroke="#2ec4b6" stroke-width="4"/>
    <g stroke="#fff" stroke-width="4.5" stroke-linecap="round"><path d="M95 64 L125 72"/><path d="M99 78 L127 86"/><path d="M104 92 L130 98"/></g>
    <path d="M82 54 L97 46 L132 56" stroke="#fff" stroke-width="3" opacity=".55" fill="none"/>
    <path d="M168 132 l5 -12 l5 12 l-12 -7 h14 z" fill="#fff" opacity=".95"/>
    ${spark(204, 70, 9)}`,
    lg('u', [[0, '#363d50'], [1, '#141821']])
  ),
  headset: svg(
    `${shadow(66, 212)}
    <path d="M58 132 C56 60 184 60 182 132" fill="none" stroke="#20242f" stroke-width="18" stroke-linecap="round"/>
    <path d="M70 126 C70 80 170 80 170 126" fill="none" stroke="#3b4252" stroke-width="7" stroke-linecap="round"/>
    <rect x="38" y="108" width="46" height="76" rx="20" fill="url(#cup)"/>
    <rect x="156" y="108" width="46" height="76" rx="20" fill="url(#cup)"/>
    <rect x="45" y="117" width="32" height="58" rx="15" fill="none" stroke="url(#rgb)" stroke-width="5"/>
    <rect x="163" y="117" width="32" height="58" rx="15" fill="none" stroke="url(#rgb)" stroke-width="5"/>
    <path d="M62 182 C66 204 96 210 116 204" stroke="#20242f" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="118" cy="203" r="8" fill="#20242f"/><circle cx="118" cy="203" r="3" fill="#ff4d5a"/>
    ${spark(196, 50, 9)}`,
    lg('cup', [[0, '#3a4152'], [1, '#14171f']]) + lg('rgb', [[0, '#22d3ee'], [0.5, '#a3e635'], [1, '#fb923c']])
  ),
  keyboard: (() => {
    let keys = '';
    const cols = 12;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < cols; c++) {
        const x = 32 + c * 15 + (r % 2) * 4;
        if (x > 198) continue;
        keys += `<rect x="${x}" y="${92 + r * 16}" width="12.5" height="13" rx="2.5" fill="url(#rgb)" opacity="${0.75 + ((r + c) % 3) * 0.1}"/>`;
      }
    }
    keys += `<rect x="70" y="156" width="100" height="12" rx="3" fill="url(#rgb)" opacity=".9"/>`;
    return svg(
      `${shadow(92, 196)}
      <path d="M120 80 C120 56 92 60 96 40 C100 24 124 28 128 16" stroke="#2a2f3c" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="22" y="80" width="196" height="100" rx="14" fill="#1b1f2a" stroke="#353d50" stroke-width="3"/>
      <rect x="26" y="84" width="188" height="92" rx="11" fill="url(#rgb)" opacity=".18"/>
      ${keys}
      ${spark(206, 56, 9)}`,
      lg('rgb', [[0, '#22d3ee'], [0.35, '#34d399'], [0.7, '#facc15'], [1, '#fb7185']], 0, 0, 1, 0)
    );
  })(),
  handheld: svg(
    `${shadow(88, 200)}
    <rect x="30" y="70" width="52" height="112" rx="24" fill="#ff8a3d"/>
    <rect x="158" y="70" width="52" height="112" rx="24" fill="#2ec4b6"/>
    <rect x="64" y="72" width="112" height="108" rx="10" fill="#1d2230"/>
    <rect x="72" y="80" width="96" height="88" rx="6" fill="url(#scr)"/>
    <circle cx="146" cy="100" r="10" fill="#ffe08a"/>
    <path d="M72 150 C90 130 104 136 116 146 C130 128 150 132 168 148 L168 162 C168 165 165 168 162 168 L78 168 C75 168 72 165 72 162 Z" fill="#43c07a"/>
    <rect x="98" y="134" width="8" height="10" fill="#ff5d73"/><rect x="96" y="128" width="12" height="7" fill="#fff"/>
    <circle cx="54" cy="100" r="11" fill="#1d2230"/><circle cx="54" cy="100" r="6" fill="#3b4252"/>
    <rect x="49" y="130" width="10" height="26" rx="2" fill="#1d2230"/><rect x="41" y="138" width="26" height="10" rx="2" fill="#1d2230"/>
    <circle cx="186" cy="116" r="5.5" fill="#1d2230"/><circle cx="196" cy="128" r="5.5" fill="#1d2230"/><circle cx="176" cy="128" r="5.5" fill="#1d2230"/><circle cx="186" cy="140" r="5.5" fill="#1d2230"/>
    <circle cx="186" cy="160" r="9" fill="#1d2230"/>
    ${spark(206, 48, 9)}`,
    lg('scr', [[0, '#7cc8ff'], [1, '#c9ecff']])
  ),
  gamecoins: (() => {
    const stack = (cx, base, n) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const y = base - i * 10;
        s += `<ellipse cx="${cx}" cy="${y + 4}" rx="30" ry="10" fill="#a8741f"/><ellipse cx="${cx}" cy="${y}" rx="30" ry="10" fill="url(#coin)" stroke="#a8741f" stroke-width="1.5"/>`;
      }
      const top = base - (n - 1) * 10;
      s += `<ellipse cx="${cx}" cy="${top}" rx="20" ry="6" fill="none" stroke="#fff3c4" stroke-width="2" opacity=".8"/>`;
      return s;
    };
    return svg(
      `${shadow(92, 204)}
      ${stack(76, 192, 5)}${stack(170, 192, 3)}${stack(124, 196, 8)}
      <path d="M150 40 L176 40 L188 56 L163 86 L138 56 Z" fill="url(#gem)"/>
      <path d="M138 56 L188 56 M150 40 L157 56 L163 86 L169 56 L176 40" stroke="#e8fbff" stroke-width="1.6" fill="none" opacity=".85"/>
      ${spark(60, 64, 10, '#ffe39a')}${spark(200, 100, 7)}${spark(110, 60, 6, '#fff3c4')}`,
      lg('coin', [[0, '#ffe7a0'], [1, '#e0a63c']], 0, 0, 1, 0) + lg('gem', [[0, '#a7f3ff'], [1, '#1689c9']])
    );
  })(),
  basketball: svg(
    `${shadow(62, 208)}
    <circle cx="120" cy="114" r="80" fill="url(#ball)"/>
    <g stroke="#3a1a08" stroke-width="4.5" fill="none">
      <path d="M120 34 L120 194"/><path d="M40 114 L200 114"/>
      <path d="M64 58 C94 88 94 140 64 170"/><path d="M176 58 C146 88 146 140 176 170"/>
    </g>
    <ellipse cx="92" cy="76" rx="26" ry="16" fill="#fff" opacity=".22" transform="rotate(-30 92 76)"/>
    ${spark(204, 44, 9)}`,
    rg('ball', [[0, '#ffb067'], [1, '#cf5410']], 0.38, 0.32, 0.7)
  ),

  // ---------- 女生版 ----------
  lipstick: svg(
    `${shadow(56, 212)}
    <path d="M34 200 C52 184 74 182 92 190" stroke="#e0245e" stroke-width="12" fill="none" stroke-linecap="round" opacity=".8"/>
    <rect x="92" y="122" width="56" height="86" rx="8" fill="url(#gold)"/>
    <rect x="92" y="150" width="56" height="6" fill="#8a5d17" opacity=".45"/>
    <rect x="99" y="98" width="42" height="28" rx="3" fill="url(#in)"/>
    <path d="M102 100 L102 64 C102 50 114 40 138 32 L138 100 Z" fill="url(#lp)"/>
    <path d="M109 96 L109 66 C109 58 115 52 124 47" stroke="#fff" stroke-width="4" fill="none" opacity=".45" stroke-linecap="round"/>
    ${spark(180, 52, 10, '#ffd1df')}${spark(64, 90, 7)}`,
    GOLD + lg('in', [[0, '#d9b36a'], [0.5, '#fff1c9'], [1, '#c79a4a']], 0, 0, 1, 0) +
      lg('lp', [[0, '#ff5a86'], [1, '#a90f3d']], 0, 0, 1, 0)
  ),
  bag: svg(
    `${shadow(76, 214)}
    <defs><clipPath id="cb"><path d="M56 100 L184 100 L198 192 C199 200 194 206 186 206 L54 206 C46 206 41 200 42 192 Z"/></clipPath></defs>
    <path d="M88 104 C88 50 152 50 152 104" fill="none" stroke="#b9774a" stroke-width="9" stroke-linecap="round"/>
    <path d="M56 100 L184 100 L198 192 C199 200 194 206 186 206 L54 206 C46 206 41 200 42 192 Z" fill="url(#bd)"/>
    <g clip-path="url(#cb)" stroke="#fff" stroke-width="2" opacity=".28">
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${10 + i * 26} 100 L${110 + i * 26} 210"/><path d="M${230 - i * 26} 100 L${130 - i * 26} 210"/>`).join('')}
    </g>
    <path d="M56 100 L184 100 L180 142 C160 158 80 158 60 142 Z" fill="url(#fl)"/>
    <rect x="106" y="136" width="28" height="20" rx="5" fill="url(#gold)"/><rect x="113" y="142" width="14" height="8" rx="2" fill="#8a5d17" opacity=".6"/>
    <circle cx="88" cy="104" r="6" fill="url(#gold)"/><circle cx="152" cy="104" r="6" fill="url(#gold)"/>
    <path d="M64 108 L72 138" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/>
    ${spark(198, 60, 10, '#ffd1df')}`,
    GOLD + lg('bd', [[0, '#f7a8c0'], [1, '#d9607f']]) + lg('fl', [[0, '#ec93ae'], [1, '#c44d6f']])
  ),
  heels: svg(
    `${shadow(84, 212)}
    <path d="M172 148 L192 146 L186 208 L178 208 Z" fill="url(#gold)"/>
    <rect x="176" y="206" width="12" height="5" rx="1.5" fill="#3a2a20"/>
    <path d="M28 190 C28 178 46 172 76 166 C96 162 106 154 116 146 C136 150 168 132 188 108 C196 102 204 110 202 122 C200 140 192 150 178 154 C150 160 120 178 96 190 C70 202 28 202 28 190 Z" fill="url(#sh)"/>
    <path d="M116 146 C136 150 168 132 188 108 C182 128 162 146 132 154 Z" fill="#a9445f"/>
    <path d="M40 182 C58 175 80 170 98 164" stroke="#fff" stroke-width="4" fill="none" opacity=".55" stroke-linecap="round"/>
    ${spark(72, 120, 10, '#ffd1df')}${spark(204, 70, 7)}`,
    GOLD + lg('sh', [[0, '#ffc6d3'], [1, '#d9637f']])
  ),
  perfume: svg(
    `${shadow(62, 214)}
    <rect x="98" y="34" width="44" height="40" rx="6" fill="url(#gold)"/>
    <path d="M108 36 L108 72 M132 36 L132 72" stroke="#fff3c4" stroke-width="2" opacity=".6"/>
    <rect x="108" y="72" width="24" height="16" fill="#e9d3a0"/>
    <rect x="60" y="86" width="120" height="120" rx="28" fill="url(#gl)"/>
    <path d="M66 140 C100 130 140 150 174 140 L174 180 C174 194 164 200 150 200 L90 200 C76 200 66 194 66 180 Z" fill="#e4386f" opacity=".5"/>
    <rect x="72" y="96" width="14" height="94" rx="7" fill="#fff" opacity=".45"/>
    <rect x="98" y="120" width="44" height="28" rx="4" fill="#fff" opacity=".85"/>
    <path d="M108 134 L132 134" stroke="#c79a4a" stroke-width="3" stroke-linecap="round"/>
    <path d="M120 82 C98 62 82 76 98 88 Z M120 82 C142 62 158 76 142 88 Z" fill="#e0245e"/>
    <circle cx="120" cy="83" r="6" fill="#b3123f"/>
    ${spark(196, 56, 10, '#ffd1df')}${spark(44, 80, 7)}`,
    GOLD + lg('gl', [[0, '#ffe0ea', 0.95], [1, '#f283a6', 0.95]], 0, 0, 1, 1)
  ),
  necklace: svg(
    `<path d="M50 30 C46 116 90 156 120 160 C150 156 194 116 190 30" fill="none" stroke="#c99a43" stroke-width="2.5"/>
    <path d="M50 30 C46 116 90 156 120 160 C150 156 194 116 190 30" fill="none" stroke="url(#gold)" stroke-width="6" stroke-dasharray="2 7" stroke-linecap="round"/>
    <rect x="115" y="154" width="10" height="12" rx="3" fill="url(#gold)"/>
    <path d="M120 214 C92 194 80 180 84 166 C88 152 108 150 120 166 C132 150 152 152 156 166 C160 180 148 194 120 214 Z" fill="url(#hp)"/>
    <path d="M120 166 L120 214 M84 166 L120 186 L156 166 M96 196 L120 186 L144 196" stroke="#fff" stroke-width="1.6" opacity=".55" fill="none"/>
    <path d="M96 164 C100 158 108 158 112 164" stroke="#fff" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/>
    ${spark(172, 172, 11)}${spark(70, 120, 7, '#ffe39a')}${spark(186, 92, 6, '#ffd1df')}`,
    GOLD + lg('hp', [[0, '#ff8fb1'], [1, '#c2124a']], 0, 0, 1, 1)
  ),
  palette: (() => {
    const cols = ['#f3c7b0', '#e8a089', '#c56b5a', '#8a4b3f', '#f6d78b', '#e9b3c4', '#b56576', '#6d3b47'];
    let pans = '';
    cols.forEach((c, i) => {
      const x = 56 + (i % 4) * 34, y = 130 + Math.floor(i / 4) * 34;
      pans += `<rect x="${x}" y="${y}" width="28" height="28" rx="6" fill="${c}"/><rect x="${x + 4}" y="${y + 4}" width="10" height="5" rx="2.5" fill="#fff" opacity=".35"/>`;
    });
    return svg(
      `${shadow(84, 214)}
      <rect x="40" y="30" width="160" height="88" rx="14" fill="#3a2a33"/>
      <rect x="50" y="40" width="140" height="68" rx="8" fill="url(#mi)"/>
      <path d="M70 100 L110 44 M96 104 L134 50" stroke="#fff" stroke-width="7" opacity=".35"/>
      <rect x="40" y="118" width="160" height="88" rx="14" fill="url(#bs)"/>
      <rect x="48" y="124" width="144" height="76" rx="9" fill="#2e2127" opacity=".2"/>
      ${pans}
      <rect x="190" y="150" width="34" height="8" rx="4" fill="#3a2a33" transform="rotate(-30 207 154)"/>
      ${spark(206, 46, 9)}`,
      lg('mi', [[0, '#e9f1fb'], [1, '#a9bad1']], 0, 0, 1, 1) + lg('bs', [[0, '#f1c9b8'], [1, '#c98f7c']])
    );
  })(),
  flowers: (() => {
    const rose = (x, y, r) =>
      `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ro)"/>
       <path d="M${x - r * 0.45} ${y} C${x - r * 0.45} ${y - r * 0.5} ${x + r * 0.45} ${y - r * 0.5} ${x + r * 0.45} ${y} C${x + r * 0.45} ${y + r * 0.55} ${x - r * 0.6} ${y + r * 0.55} ${x - r * 0.7} ${y - r * 0.1}" stroke="#7d0f26" stroke-width="2.5" fill="none" opacity=".7"/>
       <path d="M${x - r * 0.15} ${y - r * 0.05} C${x - r * 0.1} ${y - r * 0.25} ${x + r * 0.2} ${y - r * 0.2} ${x + r * 0.15} ${y + r * 0.05}" stroke="#7d0f26" stroke-width="2" fill="none" opacity=".7"/>`;
    const leaf = (x, y, rot) => `<ellipse cx="${x}" cy="${y}" rx="18" ry="8" fill="#3f8f5a" transform="rotate(${rot} ${x} ${y})"/>`;
    return svg(
      `${shadow(48, 220)}
      ${leaf(62, 108, -30)}${leaf(178, 108, 30)}${leaf(72, 76, -60)}${leaf(168, 76, 60)}
      ${rose(86, 98, 24)}${rose(154, 98, 24)}${rose(120, 72, 25)}${rose(104, 120, 22)}${rose(138, 120, 22)}${rose(120, 98, 22)}
      <path d="M58 118 L182 118 L134 218 L106 218 Z" fill="url(#kr)"/>
      <path d="M58 118 L120 140 L106 218 Z" fill="#000" opacity=".08"/>
      <path d="M120 168 C98 150 84 164 102 174 Z M120 168 C142 150 156 164 138 174 Z" fill="#ff8fb1"/>
      <path d="M116 170 L104 198 M124 170 L136 198" stroke="#ff8fb1" stroke-width="6" stroke-linecap="round"/>
      <circle cx="120" cy="170" r="6" fill="#e0567f"/>
      ${spark(200, 52, 9)}${spark(40, 60, 7, '#ffd1df')}`,
      rg('ro', [[0, '#ff5a73'], [1, '#b3122f']], 0.4, 0.35, 0.65) + lg('kr', [[0, '#f7dccd'], [1, '#e0a68f']])
    );
  })(),
  ring: svg(
    `${shadow(76, 214)}
    <path d="M60 134 L72 64 C74 56 80 52 88 52 L152 52 C160 52 166 56 168 64 L180 134 Z" fill="#6e0d22"/>
    <path d="M70 128 L80 70 C81 64 86 62 92 62 L148 62 C154 62 159 64 160 70 L170 128 Z" fill="url(#sat)"/>
    <rect x="54" y="130" width="132" height="76" rx="10" fill="url(#vel)"/>
    <rect x="68" y="124" width="104" height="26" rx="13" fill="#7a0f24"/>
    <path d="M120 126 L120 148" stroke="#4d0815" stroke-width="3"/>
    <path d="M94 126 C94 110 146 110 146 126" fill="none" stroke="url(#gold)" stroke-width="7"/>
    <path d="M106 96 L134 96 L143 107 L120 130 L97 107 Z" fill="url(#dia)"/>
    <path d="M97 107 L143 107 M106 96 L113 107 L120 130 L127 107 L134 96" stroke="#fff" stroke-width="1.6" opacity=".8" fill="none"/>
    ${spark(160, 86, 12)}${spark(80, 92, 7, '#ffe39a')}${spark(196, 40, 8)}`,
    GOLD + lg('vel', [[0, '#c4213f'], [1, '#7d0f26']]) + lg('sat', [[0, '#fff5f0'], [1, '#e7c9c0']]) +
      lg('dia', [[0, '#ffffff'], [1, '#9fe3ff']], 0, 0, 1, 1)
  ),
  bear: svg(
    `${shadow(70, 220)}
    <circle cx="82" cy="58" r="21" fill="#a8693a"/><circle cx="82" cy="58" r="11" fill="#e8c39a"/>
    <circle cx="158" cy="58" r="21" fill="#a8693a"/><circle cx="158" cy="58" r="11" fill="#e8c39a"/>
    <ellipse cx="72" cy="156" rx="16" ry="28" fill="#a8693a" transform="rotate(30 72 156)"/>
    <ellipse cx="168" cy="156" rx="16" ry="28" fill="#a8693a" transform="rotate(-30 168 156)"/>
    <ellipse cx="120" cy="166" rx="50" ry="46" fill="url(#fur)"/>
    <ellipse cx="120" cy="174" rx="28" ry="26" fill="#ecd0ac"/>
    <ellipse cx="90" cy="208" rx="22" ry="14" fill="#a8693a"/><ellipse cx="150" cy="208" rx="22" ry="14" fill="#a8693a"/>
    <ellipse cx="90" cy="210" rx="11" ry="7" fill="#ecd0ac"/><ellipse cx="150" cy="210" rx="11" ry="7" fill="#ecd0ac"/>
    <circle cx="120" cy="92" r="46" fill="url(#fur)"/>
    <ellipse cx="120" cy="110" rx="21" ry="16" fill="#f0d6b4"/>
    <ellipse cx="120" cy="102" rx="7.5" ry="5.5" fill="#3a2214"/>
    <path d="M120 108 L120 116 M112 118 C116 122 124 122 128 118" stroke="#3a2214" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="103" cy="86" r="5.5" fill="#2a1a10"/><circle cx="137" cy="86" r="5.5" fill="#2a1a10"/>
    <circle cx="105" cy="84" r="1.8" fill="#fff"/><circle cx="139" cy="84" r="1.8" fill="#fff"/>
    <path d="M120 136 L100 126 L100 146 Z M120 136 L140 126 L140 146 Z" fill="#e0245e"/><circle cx="120" cy="136" r="6" fill="#b3123f"/>
    ${spark(196, 46, 9, '#ffd1df')}`,
    rg('fur', [[0, '#cf8f58'], [1, '#93562b']], 0.45, 0.4, 0.65)
  ),
  scarf: svg(
    `${shadow(66, 212)}
    <defs><pattern id="st" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#c62f3b"/><rect y="12" width="20" height="5" fill="#f5e6c8"/></pattern></defs>
    <path d="M80 82 L64 188 L102 194 L110 92 Z" fill="url(#st)"/>
    <path d="M140 84 L152 182 L188 172 L164 78 Z" fill="url(#st)"/>
    <ellipse cx="120" cy="72" rx="58" ry="26" fill="none" stroke="#c62f3b" stroke-width="28"/>
    <ellipse cx="120" cy="72" rx="58" ry="26" fill="none" stroke="#f5e6c8" stroke-width="4" stroke-dasharray="6 10" opacity=".6"/>
    <g stroke="#f5e6c8" stroke-width="3" stroke-linecap="round">
      ${Array.from({ length: 7 }, (_, i) => `<path d="M${66 + i * 5.6} ${189 + i * 0.8} l-1 12"/>`).join('')}
      ${Array.from({ length: 7 }, (_, i) => `<path d="M${154 + i * 5.4} ${181 - i * 1.4} l2 12"/>`).join('')}
    </g>
    <path d="M78 66 C92 54 112 50 132 52" stroke="#fff" stroke-width="4" fill="none" opacity=".35" stroke-linecap="round"/>
    ${spark(204, 50, 9)}`
  ),
  giftbox: svg(
    `${shadow(76, 214)}
    <rect x="54" y="104" width="132" height="102" rx="8" fill="url(#bx)"/>
    <rect x="46" y="86" width="148" height="30" rx="6" fill="#c42a38"/>
    <rect x="110" y="86" width="20" height="120" fill="url(#gold)"/>
    <path d="M120 86 C94 52 66 66 90 86 Z M120 86 C146 52 174 66 150 86 Z" fill="url(#gold)"/>
    <circle cx="120" cy="84" r="8" fill="#e0a63c"/>
    <rect x="58" y="120" width="10" height="80" rx="5" fill="#fff" opacity=".18"/>
    ${spark(200, 56, 10)}${spark(44, 80, 7, '#ffe39a')}`,
    GOLD + lg('bx', [[0, '#ef4a57'], [1, '#a5182a']])
  ),

  thanks: svg(
    `<g stroke="#8fc8ff" stroke-width="9" stroke-linecap="round" fill="none">
      ${[0, 60, 120].map((a) => `<path d="M120 36 L120 204" transform="rotate(${a} 120 120)"/><path d="M104 52 L120 68 L136 52 M104 188 L120 172 L136 188" transform="rotate(${a} 120 120)"/>`).join('')}
    </g>
    <circle cx="120" cy="120" r="42" fill="#fff8e6" stroke="#ffd36b" stroke-width="5"/>
    <circle cx="106" cy="114" r="5" fill="#3a2a20"/><circle cx="134" cy="114" r="5" fill="#3a2a20"/>
    <path d="M104 130 C112 140 128 140 136 130" stroke="#3a2a20" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="98" cy="126" rx="6" ry="3.5" fill="#ffb3c9"/><ellipse cx="142" cy="126" rx="6" ry="3.5" fill="#ffb3c9"/>
    ${spark(196, 48, 10, '#ffe39a')}${spark(44, 190, 8)}`
  ),
  // ---------- 宝宝版 ----------
  bottle: svg(
    `${shadow(50, 214)}
    <ellipse cx="120" cy="34" rx="10" ry="11" fill="#ffd2a8"/>
    <path d="M106 40 C106 30 134 30 134 40 L134 60 L106 60 Z" fill="#ffd9b6"/>
    <rect x="92" y="56" width="56" height="24" rx="7" fill="url(#cap)"/>
    <rect x="84" y="76" width="72" height="134" rx="24" fill="url(#gl)"/>
    <path d="M88 128 C104 120 136 134 152 124 L152 186 C152 198 144 206 132 206 L108 206 C96 206 88 198 88 186 Z" fill="#fffaf0"/>
    <g stroke="#9fb8d8" stroke-width="2.5" stroke-linecap="round"><path d="M128 98 h16 M134 113 h10 M128 128 h16 M134 143 h10 M128 158 h16"/></g>
    <rect x="94" y="86" width="9" height="106" rx="4.5" fill="#fff" opacity=".75"/>
    <path d="M110 176 C104 168 96 172 100 180 C102 184 110 190 110 190 C110 190 118 184 120 180 C124 172 116 168 110 176 Z" fill="#ff9fb8"/>
    ${spark(184, 52, 9, '#ffe39a')}${spark(54, 96, 6, '#bfe6ff')}`,
    lg('cap', [[0, '#9fd3ff'], [1, '#5fa8ea']]) + lg('gl', [[0, '#f2f9ff', 0.96], [1, '#cfe3f5', 0.96]], 0, 0, 1, 0)
  ),
  pacifier: svg(
    `${shadow(58, 212)}
    <circle cx="120" cy="66" r="30" fill="none" stroke="url(#rg)" stroke-width="13"/>
    <path d="M110 150 C108 178 113 200 120 200 C127 200 132 178 130 150 Z" fill="#ffe2b8"/>
    <path d="M120 100 C96 82 56 90 58 124 C60 154 96 162 120 150 C144 162 180 154 182 124 C184 90 144 82 120 100 Z" fill="url(#sh)"/>
    <circle cx="82" cy="122" r="6" fill="#fff" opacity=".7"/><circle cx="158" cy="122" r="6" fill="#fff" opacity=".7"/>
    <circle cx="120" cy="124" r="17" fill="#fff"/><circle cx="120" cy="124" r="9" fill="#ffd36b"/>
    <path d="M72 108 C82 98 96 98 104 104" stroke="#fff" stroke-width="4" fill="none" opacity=".6" stroke-linecap="round"/>
    ${spark(190, 60, 9, '#ffe39a')}`,
    lg('rg', [[0, '#a8ecd2'], [1, '#5cc9a2']]) + lg('sh', [[0, '#ffc6d9'], [1, '#ff8fb1']])
  ),
  rattle: svg(
    `${shadow(44, 216)}
    <rect x="112" y="118" width="16" height="84" rx="8" fill="url(#hd)"/>
    <circle cx="120" cy="204" r="15" fill="#ffd36b"/>
    <rect x="102" y="112" width="36" height="13" rx="6.5" fill="#ff9fb8"/>
    <circle cx="120" cy="72" r="46" fill="url(#hb)"/>
    <path d="M78 66 C100 54 140 54 162 66" stroke="#ff9fb8" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M80 88 C102 98 138 98 160 88" stroke="#8fd0ff" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M120 60 l4 9 10 1 -8 6 3 10 -9 -5 -9 5 3 -10 -8 -6 10 -1z" fill="#fff"/>
    <ellipse cx="102" cy="48" rx="13" ry="8" fill="#fff" opacity=".5" transform="rotate(-25 102 48)"/>
    ${spark(186, 40, 9, '#ffe39a')}${spark(60, 120, 7, '#ffd1df')}`,
    lg('hd', [[0, '#a8ecd2'], [1, '#62c9a6']], 0, 0, 1, 0) + rg('hb', [[0, '#fff6c8'], [1, '#ffd36b']], 0.4, 0.35, 0.7)
  ),
  duck: svg(
    `<ellipse cx="124" cy="204" rx="86" ry="10" fill="#8fd0ff" opacity=".45"/>
    <path d="M56 150 C56 122 84 112 112 120 C130 126 150 124 164 114 C180 104 198 118 188 142 C180 174 152 196 114 196 C78 196 56 178 56 150 Z" fill="url(#dk)"/>
    <circle cx="96" cy="86" r="38" fill="url(#dk)"/>
    <path d="M60 90 C46 90 40 102 50 108 C60 113 72 106 74 97 Z" fill="#ff8a3d"/>
    <circle cx="88" cy="78" r="6.5" fill="#2a1a10"/><circle cx="90" cy="76" r="2.2" fill="#fff"/>
    <ellipse cx="104" cy="98" rx="8" ry="5" fill="#ff9f7a" opacity=".55"/>
    <path d="M112 142 C132 134 154 140 160 158 C142 168 120 164 110 152 Z" fill="#f5b800" opacity=".75"/>
    <ellipse cx="82" cy="64" rx="12" ry="7" fill="#fff" opacity=".55" transform="rotate(-30 82 64)"/>
    ${spark(192, 60, 9, '#bfe6ff')}${spark(40, 150, 6)}`,
    rg('dk', [[0, '#fff09a'], [1, '#ffc21a']], 0.4, 0.35, 0.75)
  ),
  stroller: svg(
    `${shadow(84, 216)}
    <path d="M58 122 A64 64 0 0 1 122 58 L122 122 Z" fill="url(#hood)"/>
    <path d="M122 58 L72 92 M122 58 L62 112 M122 58 L96 66" stroke="#fff" stroke-width="3" opacity=".5"/>
    <path d="M58 122 L184 122 C184 158 158 174 122 174 C86 174 58 158 58 122 Z" fill="url(#bas)"/>
    <path d="M58 122 L184 122" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <path d="M184 122 L202 70 L216 70" stroke="#5a6b86" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M90 168 L84 194 M156 168 L162 194" stroke="#5a6b86" stroke-width="6" stroke-linecap="round"/>
    <circle cx="84" cy="198" r="18" fill="#3d4a63"/><circle cx="84" cy="198" r="7" fill="#c9d6ea"/>
    <circle cx="162" cy="198" r="18" fill="#3d4a63"/><circle cx="162" cy="198" r="7" fill="#c9d6ea"/>
    <circle cx="122" cy="58" r="8" fill="#ffd36b"/>
    <path d="M100 146 C96 140 88 142 90 150 C92 154 100 160 100 160 C100 160 108 154 110 150 C112 142 104 140 100 146 Z" fill="#ff9fb8"/>
    ${spark(200, 40, 9, '#ffe39a')}`,
    lg('hood', [[0, '#b8e2ff'], [1, '#6fb6ee']]) + lg('bas', [[0, '#fff8ec'], [1, '#f1dcc0']])
  ),
  blocks: (() => {
    const cube = (x, y, s, f, t, sd, letter) =>
      `<path d="M${x} ${y} L${x + s * 0.28} ${y - s * 0.24} L${x + s * 1.28} ${y - s * 0.24} L${x + s} ${y} Z" fill="${t}"/>
       <path d="M${x + s} ${y} L${x + s * 1.28} ${y - s * 0.24} L${x + s * 1.28} ${y + s * 0.76} L${x + s} ${y + s} Z" fill="${sd}"/>
       <rect x="${x}" y="${y}" width="${s}" height="${s}" rx="4" fill="${f}"/>
       <rect x="${x + 7}" y="${y + 7}" width="${s - 14}" height="${s - 14}" rx="6" fill="#fff" opacity=".9"/>
       <text x="${x + s / 2}" y="${y + s * 0.72}" text-anchor="middle" font-size="${s * 0.52}" font-weight="900" fill="${f}" font-family="Arial Rounded MT Bold,Arial Black,Arial,sans-serif">${letter}</text>`;
    return svg(
      `${shadow(84, 206)}
      ${cube(48, 136, 64, '#ff8fb1', '#ffc2d6', '#e06b92', 'A')}${cube(118, 136, 64, '#6fb6ee', '#b8e2ff', '#4b8fd0', 'B')}${cube(84, 72, 64, '#ffc93c', '#ffe39a', '#e0a81c', 'C')}
      ${spark(196, 56, 9)}${spark(44, 92, 7, '#ffe39a')}`
    );
  })(),
  car: svg(
    `${shadow(90, 204)}
    <path d="M38 150 C38 132 50 124 66 122 L86 92 C92 84 100 80 112 80 L150 80 C162 80 170 86 176 96 L192 122 C206 124 214 134 214 150 L214 166 C214 172 210 176 204 176 L48 176 C42 176 38 172 38 166 Z" fill="url(#car)"/>
    <path d="M92 120 L104 96 C106 92 110 90 114 90 L128 90 L128 120 Z" fill="#e6f6ff"/>
    <path d="M138 90 L150 90 C156 90 160 92 164 98 L178 120 L138 120 Z" fill="#e6f6ff"/>
    <path d="M46 148 L206 148" stroke="#fff" stroke-width="5" opacity=".6"/>
    <circle cx="80" cy="176" r="22" fill="#2f3a4f"/><circle cx="80" cy="176" r="9" fill="#d8e2f0"/>
    <circle cx="172" cy="176" r="22" fill="#2f3a4f"/><circle cx="172" cy="176" r="9" fill="#d8e2f0"/>
    <circle cx="206" cy="140" r="6" fill="#ffe08a"/>
    <path d="M126 132 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#ffd36b"/>
    ${spark(196, 56, 9, '#ffe39a')}${spark(48, 92, 7)}`,
    lg('car', [[0, '#8fd0ff'], [1, '#3a8ee6']])
  ),
  dino: svg(
    `${shadow(74, 214)}
    <path d="M150 168 C180 170 204 158 214 138 C206 168 186 190 150 192 Z" fill="url(#dn)"/>
    <g fill="#ffc93c"><path d="M92 62 L80 54 L90 72 Z"/><path d="M82 82 L66 78 L80 96 Z"/><path d="M78 106 L62 106 L78 120 Z"/><path d="M84 132 L68 136 L86 146 Z"/></g>
    <ellipse cx="124" cy="160" rx="50" ry="44" fill="url(#dn)"/>
    <ellipse cx="118" cy="170" rx="28" ry="28" fill="#e8f7c8"/>
    <path d="M86 142 C70 112 72 72 104 58 C136 46 162 66 154 92 C150 108 134 116 120 120 L120 142 Z" fill="url(#dn)"/>
    <circle cx="128" cy="78" r="6.5" fill="#20301a"/><circle cx="130" cy="76" r="2.2" fill="#fff"/>
    <ellipse cx="140" cy="94" rx="8" ry="4.5" fill="#ff9fb8" opacity=".7"/>
    <path d="M120 100 C128 106 138 106 146 100" stroke="#20301a" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="98" cy="200" rx="18" ry="11" fill="#5fb74a"/><ellipse cx="146" cy="200" rx="18" ry="11" fill="#5fb74a"/>
    <ellipse cx="150" cy="150" rx="9" ry="14" fill="#5fb74a" transform="rotate(-25 150 150)"/>
    ${spark(200, 56, 9, '#ffe39a')}`,
    lg('dn', [[0, '#a6e07e'], [1, '#4fa83f']], 0, 0, 1, 1)
  ),
  overalls: svg(
    `${shadow(66, 212)}
    <path d="M86 36 L98 104 M154 36 L142 104" stroke="#3d6fc0" stroke-width="15" stroke-linecap="round"/>
    <path d="M88 96 L152 96 L156 134 L174 200 L132 204 L120 160 L108 204 L66 200 L84 134 Z" fill="url(#den)"/>
    <rect x="104" y="104" width="32" height="26" rx="5" fill="#5f8fd4" stroke="#fff" stroke-dasharray="3 3" stroke-width="1.6"/>
    <path d="M114 117 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z" fill="#ffd36b"/>
    <circle cx="94" cy="100" r="6.5" fill="#ffd36b"/><circle cx="146" cy="100" r="6.5" fill="#ffd36b"/>
    <path d="M86 140 L72 196 M154 140 L168 196" stroke="#fff" stroke-dasharray="4 4" stroke-width="1.6" opacity=".7"/>
    <path d="M66 192 L108 196 L108 204 L66 200 Z M132 196 L174 192 L174 200 L132 204 Z" fill="#a8c8f5"/>
    ${spark(196, 54, 9, '#ffe39a')}`,
    lg('den', [[0, '#7aa8ee'], [1, '#3d6fc0']])
  ),
  dress: svg(
    `${shadow(76, 214)}
    <path d="M100 50 C100 38 106 32 112 32 M140 50 C140 38 134 32 128 32" stroke="#ffb3c9" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M96 50 L144 50 L152 104 L88 104 Z" fill="url(#bd)"/>
    <path d="M88 100 L152 100 C178 138 198 176 206 196 C172 208 68 208 34 196 C42 176 62 138 88 100 Z" fill="url(#sk)"/>
    <path d="M34 196 Q56 184 78 198 Q99 184 120 198 Q141 184 162 198 Q184 184 206 196" stroke="#fff" stroke-width="4" fill="none" opacity=".65"/>
    <path d="M60 160 Q90 150 120 162 Q150 150 180 160" stroke="#fff" stroke-width="3" fill="none" opacity=".4"/>
    <path d="M120 102 C102 86 88 98 98 110 C106 116 116 108 120 104 Z M120 102 C138 86 152 98 142 110 C134 116 124 108 120 104 Z" fill="#ff5c8d"/>
    <circle cx="120" cy="103" r="6" fill="#e0436f"/>
    <g fill="#fff">${[[80, 150], [112, 172], [150, 146], [170, 182], [70, 184], [132, 136]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g>
    ${spark(196, 50, 10, '#ffe39a')}`,
    lg('bd', [[0, '#ffe0ea'], [1, '#ffc2d6']]) + lg('sk', [[0, '#ffd0df'], [1, '#ff8fb8']])
  ),
  headband: svg(
    `<path d="M48 176 C46 82 194 82 192 176" stroke="url(#hbd)" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M114 100 L92 148 L108 142 L114 160 L124 104 Z M126 100 L148 148 L132 142 L126 160 L116 104 Z" fill="#ff5c8d"/>
    <path d="M120 96 C94 58 50 64 62 100 C70 126 104 114 120 100 Z" fill="url(#bw)"/>
    <path d="M120 96 C146 58 190 64 178 100 C170 126 136 114 120 100 Z" fill="url(#bw)"/>
    <g fill="#fff" opacity=".85">${[[80, 84], [96, 98], [74, 102], [160, 84], [144, 98], [166, 102], [92, 76], [148, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5"/>`).join('')}</g>
    <ellipse cx="120" cy="98" rx="13" ry="15" fill="#ff4f86"/>
    <ellipse cx="116" cy="92" rx="4" ry="5" fill="#fff" opacity=".5"/>
    ${spark(194, 40, 10, '#ffe39a')}${spark(46, 56, 7)}`,
    lg('hbd', [[0, '#ffd0df'], [1, '#ff9fb8']], 0, 0, 1, 0) + lg('bw', [[0, '#ffa8c4'], [1, '#ff5c8d']])
  ),
  bunny: svg(
    `${shadow(64, 214)}
    <ellipse cx="98" cy="58" rx="15" ry="42" fill="#fff6f8" transform="rotate(-10 98 58)"/>
    <ellipse cx="98" cy="62" rx="7" ry="30" fill="#ffc2d6" transform="rotate(-10 98 62)"/>
    <ellipse cx="142" cy="58" rx="15" ry="42" fill="#fff6f8" transform="rotate(10 142 58)"/>
    <ellipse cx="142" cy="62" rx="7" ry="30" fill="#ffc2d6" transform="rotate(10 142 62)"/>
    <ellipse cx="120" cy="170" rx="44" ry="40" fill="url(#bf)"/>
    <ellipse cx="120" cy="176" rx="24" ry="24" fill="#fff"/>
    <circle cx="120" cy="114" r="38" fill="url(#bf)"/>
    <circle cx="106" cy="110" r="4.5" fill="#3a2a30"/><circle cx="134" cy="110" r="4.5" fill="#3a2a30"/>
    <ellipse cx="98" cy="124" rx="7" ry="4" fill="#ffb3c9" opacity=".8"/><ellipse cx="142" cy="124" rx="7" ry="4" fill="#ffb3c9" opacity=".8"/>
    <path d="M115 120 L125 120 L120 126 Z" fill="#ff8fb1"/>
    <path d="M120 126 L120 131 M114 133 C117 135 123 135 126 133" stroke="#3a2a30" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="96" cy="206" rx="17" ry="10" fill="#fff"/><ellipse cx="144" cy="206" rx="17" ry="10" fill="#fff"/>
    <path d="M150 32 C138 22 132 34 142 38 Z M150 32 C162 22 168 34 158 38 Z" fill="#ff8fb1"/>
    ${spark(196, 76, 9, '#ffe39a')}`,
    rg('bf', [[0, '#ffffff'], [1, '#f1dde3']], 0.45, 0.4, 0.7)
  ),
  babyshoes: (() => {
    const shoe = (x, y) =>
      `<path d="M${x} ${y + 30} C${x} ${y + 10} ${x + 14} ${y - 2} ${x + 34} ${y} L${x + 52} ${y + 2} C${x + 70} ${y + 4} ${x + 86} ${y + 12} ${x + 88} ${y + 28} L${x + 88} ${y + 36} C${x + 88} ${y + 42} ${x + 84} ${y + 46} ${x + 78} ${y + 46} L${x + 8} ${y + 46} C${x + 3} ${y + 46} ${x} ${y + 42} ${x} ${y + 36} Z" fill="url(#sh)"/>
       <path d="M${x} ${y + 38} L${x + 88} ${y + 38} L${x + 88} ${y + 40} C${x + 88} ${y + 44} ${x + 84} ${y + 48} ${x + 78} ${y + 48} L${x + 8} ${y + 48} C${x + 3} ${y + 48} ${x} ${y + 44} ${x} ${y + 40} Z" fill="#fff"/>
       <path d="M${x + 22} ${y + 4} C${x + 34} ${y + 18} ${x + 54} ${y + 18} ${x + 66} ${y + 8}" stroke="#ffd36b" stroke-width="7" fill="none" stroke-linecap="round"/>
       <circle cx="${x + 64}" cy="${y + 10}" r="4.5" fill="#fff"/>
       <path d="M${x + 10} ${y + 22} C${x + 16} ${y + 14} ${x + 26} ${y + 10} ${x + 34} ${y + 10}" stroke="#fff" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>`;
    return svg(`${shadow(92, 196)}${shoe(22, 132)}${shoe(124, 120)}${spark(196, 64, 10, '#ffe39a')}${spark(54, 92, 7, '#bfe6ff')}`,
      lg('sh', [[0, '#b8f0da'], [1, '#6fd0aa']]));
  })(),
  mobile: svg(
    `<path d="M120 18 L120 46" stroke="#c9a46a" stroke-width="4"/>
    <path d="M52 64 Q120 34 188 64" stroke="#c9a46a" stroke-width="6" fill="none" stroke-linecap="round"/>
    <g stroke="#c9a46a" stroke-width="2"><path d="M60 60 L60 104"/><path d="M96 48 L96 150"/><path d="M144 48 L144 128"/><path d="M180 60 L180 100"/></g>
    <path d="M70 108 A22 22 0 1 0 70 148 A17 17 0 1 1 70 108 Z" fill="#ffd36b" transform="translate(-6 0)"/>
    <g fill="#fff"><circle cx="86" cy="168" r="14"/><circle cx="102" cy="160" r="17"/><circle cx="118" cy="170" r="13"/><rect x="82" y="168" width="40" height="14" rx="7"/></g>
    <path d="M144 132 l6 13 14 2 -10 10 3 14 -13 -7 -13 7 3 -14 -10 -10 14 -2z" fill="#ffd36b"/>
    <path d="M180 112 C174 104 164 108 168 118 C170 124 180 132 180 132 C180 132 190 124 192 118 C196 108 186 104 180 112 Z" fill="#ff9fb8"/>
    <circle cx="120" cy="46" r="8" fill="#e0b870"/>
    ${spark(206, 160, 9, '#bfe6ff')}${spark(34, 180, 7, '#ffe39a')}`
  ),
};

// 预设礼物：男生版 / 女生版 / 宝宝版（tag 标记男宝/女宝专属）
export const PRESETS = {
  boy: [
    { id: 'ps5', name: 'PS5 游戏机', line: '这个冬天的周末，交给你和手柄了。' },
    { id: 'skin', name: '限定游戏皮肤', line: '全服限定款，今晚上线就去炫。' },
    { id: 'jersey', name: '球衣 · 10 号', line: '主场客场都穿得上。' },
    { id: 'controller', name: '无线手柄', line: '双人模式已就绪，来一局？' },
    { id: 'sneakers', name: '实战球鞋', line: '下一场，起跳再高一点。' },
    { id: 'headset', name: '电竞耳机', line: '脚步声听得清清楚楚。' },
    { id: 'keyboard', name: '机械键盘', line: '每一下敲击都清脆。' },
    { id: 'handheld', name: '掌上游戏机', line: '通勤路上也能开一把。' },
    { id: 'gamecoins', name: '游戏点券', line: '想抽的卡池，这次抽到出。' },
    { id: 'basketball', name: '篮球', line: '周末球场见。' },
  ],
  girl: [
    { id: 'lipstick', name: '口红', line: '今天这支颜色，衬你。' },
    { id: 'bag', name: '包包', line: '装得下你的日常和小心思。' },
    { id: 'heels', name: '高跟鞋', line: '走到哪里都闪闪发光。' },
    { id: 'perfume', name: '香水', line: '把冬天的味道留在身边。' },
    { id: 'necklace', name: '项链', line: '离心口最近的那份礼物。' },
    { id: 'palette', name: '眼影盘', line: '每天换一种好心情。' },
    { id: 'flowers', name: '玫瑰花束', line: '冬天也要有花开。' },
    { id: 'ring', name: '戒指', line: '闪闪的，像你笑起来。' },
    { id: 'bear', name: '毛绒熊', line: '冬天抱着刚刚好。' },
    { id: 'scarf', name: '羊绒围巾', line: '冬天的风，交给它挡。' },
  ],
  baby: [
    { id: 'bottle', name: '奶瓶', line: '喝饱饱，睡香香。' },
    { id: 'rattle', name: '摇铃', line: '叮叮当当，是你的第一首歌。' },
    { id: 'duck', name: '小黄鸭', line: '洗澡时间到啦。' },
    { id: 'blocks', name: '字母积木', line: '一块一块，搭出你的小世界。' },
    { id: 'car', name: '玩具小汽车', line: '嘀嘀，小司机出发！', tag: '男宝' },
    { id: 'dino', name: '恐龙玩偶', line: '嗷呜，最勇敢的小怪兽。', tag: '男宝' },
    { id: 'dress', name: '公主裙', line: '今天也是小公主。', tag: '女宝' },
    { id: 'bunny', name: '小兔玩偶', line: '软软的，像你一样。', tag: '女宝' },
    { id: 'babyshoes', name: '学步鞋', line: '迈出第一步，我们都在。' },
    { id: 'mobile', name: '床铃', line: '转呀转，陪你做个好梦。' },
    { id: 'pacifier', name: '安抚奶嘴', line: '哭鼻子的时候，有它陪着。' },
    { id: 'stroller', name: '婴儿推车', line: '带你去看更大的世界。' },
    { id: 'overalls', name: '背带裤', line: '穿上就是小帅哥。', tag: '男宝' },
    { id: 'headband', name: '蝴蝶结发箍', line: '戴上它，全家最可爱。', tag: '女宝' },
  ],
};
export const ALL_PRESETS = [...PRESETS.boy, ...PRESETS.girl, ...PRESETS.baby];
export const presetById = (id) => ALL_PRESETS.find((g) => g.id === id);

export const iconDataUri = (id) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONS[id] || ICONS.giftbox);

const imgCache = new Map();
export function loadImage(src) {
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((res) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
  imgCache.set(src, p);
  return p;
}

// 三个版本的配色：卡片背景、相框金属色、彩灯和点缀色
export const THEMES = {
  boy: { bgIn: '#f4f8ff', bgOut: '#a9c0e2', frame: '#c9d4e4', frameEmissive: '#10213a', accent: '#6cc4ff', name: '男生版' },
  girl: { bgIn: '#fff6f8', bgOut: '#efbccd', frame: '#e9b9a2', frameEmissive: '#2a1018', accent: '#ff8fb1', name: '女生版' },
  baby: { bgIn: '#fffdf2', bgOut: '#cfeadf', frame: '#ead29c', frameEmissive: '#2a2210', accent: '#8fe0c4', name: '宝宝版' },
};

// 生成礼物相框里的画面（512x512）
export async function makeCardTexture(gift, themeKey) {
  const th = THEMES[themeKey];
  const W = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = W;
  const g = c.getContext('2d');
  if (gift.photo) {
    const im = await loadImage(gift.photo);
    g.fillStyle = th.bgOut; g.fillRect(0, 0, W, W);
    if (im) {
      const sc = Math.max(W / im.width, W / im.height);
      g.drawImage(im, (W - im.width * sc) / 2, (W - im.height * sc) / 2, im.width * sc, im.height * sc);
    }
  } else {
    const bg = g.createRadialGradient(W / 2, W * 0.42, 20, W / 2, W / 2, W * 0.72);
    bg.addColorStop(0, th.bgIn); bg.addColorStop(1, th.bgOut);
    g.fillStyle = bg; g.fillRect(0, 0, W, W);
    // 细雪花点缀
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 46; i++) { g.beginPath(); g.arc(rnd() * W, rnd() * W, 1.2 + rnd() * 2.6, 0, 7); g.fill(); }
    // 地面反光
    const fl = g.createRadialGradient(W / 2, W * 0.86, 10, W / 2, W * 0.86, W * 0.42);
    fl.addColorStop(0, 'rgba(255,255,255,0.65)'); fl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = fl; g.fillRect(0, 0, W, W);
    const im = await loadImage(iconDataUri(gift.icon || gift.id));
    if (im) g.drawImage(im, W / 2 - 205, W / 2 - 200, 410, 410);
  }
  // 内阴影，让画面像嵌在相框里
  const v = g.createRadialGradient(W / 2, W / 2, W * 0.42, W / 2, W / 2, W * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = v; g.fillRect(0, 0, W, W);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// 盲盒挂饰面：看不到里面是什么，只有一个大问号
const MYSTERY = {
  boy: ['#2f6fd0', '#0f2a5c', '#7cc8ff'],
  girl: ['#e8578a', '#7a1a3e', '#ffc2d6'],
  baby: ['#3fbf9a', '#16564a', '#ffe08a'],
};
export function makeMysteryTexture(themeKey) {
  const [a, b, dot] = MYSTERY[themeKey] || MYSTERY.girl;
  const W = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = W;
  const g = c.getContext('2d');
  const bg = g.createRadialGradient(W * 0.42, W * 0.38, 20, W / 2, W / 2, W * 0.7);
  bg.addColorStop(0, a); bg.addColorStop(1, b);
  g.fillStyle = bg; g.fillRect(0, 0, W, W);
  // 包装纸斜纹 + 小点
  g.save(); g.globalAlpha = 0.12; g.strokeStyle = '#fff'; g.lineWidth = 18;
  for (let i = -W; i < W * 2; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i - W, W); g.stroke(); }
  g.restore();
  g.fillStyle = dot; g.globalAlpha = 0.55;
  for (let y = 24; y < W; y += 64) for (let x = 24 + ((y / 64) % 2) * 32; x < W; x += 64) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  // 中间大问号
  const halo = g.createRadialGradient(W / 2, W / 2, 20, W / 2, W / 2, 230);
  halo.addColorStop(0, 'rgba(255,240,200,0.35)'); halo.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, W);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 500 360px "PF", "Playfair Display", Georgia, serif';
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillText('?', W / 2 + 8, W / 2 + 34);
  const gold = g.createLinearGradient(0, W * 0.3, 0, W * 0.72);
  gold.addColorStop(0, '#fff3c8'); gold.addColorStop(0.5, '#f2c45c'); gold.addColorStop(1, '#b07c26');
  g.lineWidth = 10; g.strokeStyle = 'rgba(80,40,0,0.5)'; g.strokeText('?', W / 2, W / 2 + 22);
  g.fillStyle = gold; g.fillText('?', W / 2, W / 2 + 22);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
