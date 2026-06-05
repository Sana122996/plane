const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "outputs", "2026_h1_market_flight.html");
const logoPath = "/Users/jin10/.codex/skills/j-design-system/assets/jinshi-data-logo.svg";
const homeBackgroundPath = "/Users/jin10/Desktop/画板 1 拷贝.png";
const logoSvg = fs
  .readFileSync(logoPath, "utf8")
  .replace(/#5A82E6/gi, "#FFFFFF")
  .replace(/#5A81E5/gi, "#FFFFFF");
const logoDataUri = "data:image/svg+xml;base64," + Buffer.from(logoSvg).toString("base64");
const homeBackgroundDataUri = "data:image/png;base64," + fs.readFileSync(homeBackgroundPath).toString("base64");

const sources = {
  gold: {
    file: "/Users/jin10/Downloads/XAU_USD历史数据.csv",
    name: "现货黄金",
    shortName: "黄金",
    code: "XAU/USD",
    unit: "美元/盎司",
    accent: "#D6AC52",
    accentSoft: "rgba(214,172,82,.16)",
    description: "避险资产与真实利率预期",
  },
  wti: {
    file: "/Users/jin10/Downloads/WTI_USD历史数据.csv",
    name: "WTI原油",
    shortName: "原油",
    code: "WTI/USD",
    unit: "美元/桶",
    accent: "#DA8C38",
    accentSoft: "rgba(218,140,56,.16)",
    description: "能源价格与供需预期",
  },
  nasdaq: {
    file: "/Users/jin10/Downloads/纳斯达克综合指数历史数据.csv",
    name: "纳斯达克指数",
    shortName: "纳指",
    code: "NASDAQ",
    unit: "点",
    accent: "#5A82E6",
    accentSoft: "rgba(90,130,230,.16)",
    description: "美股科技成长风格",
  },
  csi300: {
    file: "/Users/jin10/Downloads/沪深300指数历史数据.csv",
    name: "沪深300指数",
    shortName: "沪深300",
    code: "CSI 300",
    unit: "点",
    accent: "#5A82E6",
    accentSoft: "rgba(90,130,230,.16)",
    description: "A股核心资产表现",
  },
};

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.length && item.some(Boolean));
}

function normalizeDate(value) {
  const [year, month, day] = String(value).trim().split("-").map(Number);
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function numberValue(value) {
  return Number(String(value || "").replace(/,/g, ""));
}

function percentValue(value) {
  return Number(String(value || "").replace("%", ""));
}

function pct(value) {
  const sign = value > 0 ? "+" : "";
  return sign + value.toFixed(2) + "%";
}

function monthLabel(date) {
  return Number(date.slice(5, 7)) + "月";
}

function buildMarkets() {
  const result = {};
  for (const [id, source] of Object.entries(sources)) {
    const rows = parseCSV(fs.readFileSync(source.file, "utf8"));
    const header = rows[0];
    const data = rows
      .slice(1)
      .map((row) => Object.fromEntries(header.map((key, index) => [key, row[index] || ""])))
      .filter((row) => row["日期"])
      .map((row) => ({
        date: normalizeDate(row["日期"]),
        close: numberValue(row["收盘"]),
        open: numberValue(row["开盘"]),
        high: numberValue(row["高"]),
        low: numberValue(row["低"]),
        change: percentValue(row["涨跌幅"]),
      }))
      .filter((row) => row.date >= "2026-01-01" && row.date <= "2026-06-30")
      .sort((a, b) => a.date.localeCompare(b.date));

    data.forEach((row, index) => {
      row.index = index;
      row.month = monthLabel(row.date);
      row.cumulative = ((row.close / data[0].close) - 1) * 100;
    });

    const start = data[0];
    const end = data[data.length - 1];
    const changes = data.map((item) => item.change);
    const best = data.reduce((acc, item) => (item.change > acc.change ? item : acc), data[0]);
    const worst = data.reduce((acc, item) => (item.change < acc.change ? item : acc), data[0]);
    const returnPct = ((end.close / start.close) - 1) * 100;

    result[id] = {
      ...source,
      id,
      period: "2026-01-01 至 2026-06-30",
      dataStart: start.date,
      dataEnd: end.date,
      count: data.length,
      startClose: start.close,
      endClose: end.close,
      returnPct,
      returnText: pct(returnPct),
      bestDay: best,
      worstDay: worst,
      upDays: data.filter((item) => item.change > 0).length,
      downDays: data.filter((item) => item.change < 0).length,
      flatDays: data.filter((item) => item.change === 0).length,
      maxAbsChange: Math.max(...changes.map(Math.abs), 1),
      data,
    };
  }
  return result;
}

const marketJson = JSON.stringify(buildMarkets()).replace(/</g, "\\u003c");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>2026上半年资产飞行图</title>
  <style>
    :root {
      --bg: #080b12;
      --bg-2: #0d1320;
      --panel: #111827;
      --panel-2: #151f32;
      --line: rgba(255,255,255,.10);
      --line-strong: rgba(255,255,255,.18);
      --text: rgba(255,255,255,.92);
      --muted: rgba(255,255,255,.62);
      --faint: rgba(255,255,255,.40);
      --primary: #5a82e6;
      --primary-soft: rgba(90,130,230,.16);
      --red: #e95a52;
      --green: #24b47e;
      --amber: #d6ac52;
      --radius: 2px;
      --font-display: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      --font-heavy: "Aa厚底黑", "Aa HouDiHei", "AaHouDiHei", "HYQiHei", "PingFang SC", "Microsoft YaHei", sans-serif;
      --font-number: "D-DIN-PRO", "D-DIN", "DIN Pro", "DIN Alternate", "Arial Narrow", sans-serif;
      --font-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    }

    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-ui);
    }
    body {
      display: flex;
      justify-content: center;
      background:
        radial-gradient(circle at 30% -10%, rgba(90,130,230,.18), transparent 34%),
        linear-gradient(180deg, #070a10 0%, #0a0f19 48%, #070a10 100%);
      letter-spacing: 0;
    }

    button { font: inherit; color: inherit; -webkit-tap-highlight-color: transparent; }
    .num { font-family: var(--font-number); font-variant-numeric: tabular-nums; letter-spacing: 0; }
    .pos { color: var(--red); }
    .neg { color: var(--green); }
    .flat { color: var(--muted); }

    .app {
      width: 100%;
      max-width: 430px;
      height: 100vh;
      height: 100dvh;
      min-height: 0;
      position: relative;
      overflow: hidden;
      background: linear-gradient(180deg, rgba(16,23,36,.96) 0%, #080b12 100%);
      box-shadow: 0 0 0 1px rgba(255,255,255,.06);
    }

    .view {
      display: none;
      height: 100%;
      min-height: 0;
      overflow: hidden;
      padding: max(14px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom));
    }
    .view.active { display: flex; flex-direction: column; }

    .nav {
      height: 38px;
      display: grid;
      grid-template-columns: 44px 1fr 44px;
      align-items: center;
      color: rgba(255,255,255,.78);
      font-size: 14px;
    }
    .nav-title { text-align: center; font-weight: 650; }
    .icon-btn {
      width: 36px;
      height: 36px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(255,255,255,.04);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .icon-btn:active, .asset-card:active, .control-btn:active { transform: translateY(1px); }

    .home {
      position: relative;
      padding: 0 24px max(64px, env(safe-area-inset-bottom));
      background:
        linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.02) 58%, rgba(0,0,0,.12)),
        url("${homeBackgroundDataUri}") center top / auto 100% no-repeat;
      overflow: hidden;
    }
    .home .nav { display: none; }
    .home-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: clamp(24px, 5.4vh, 42px) 0 10px;
    }
    .brand-logo {
      display: block;
      width: 108px;
      height: auto;
      margin: 0 auto 12px;
      filter: drop-shadow(0 8px 16px rgba(0,0,0,.30));
    }
    .kicker {
      color: var(--primary);
      font-size: 12px;
      line-height: 20px;
      font-weight: 650;
      display: none;
    }
    h1 {
      margin: 0 0 12px;
      font-family: var(--font-heavy);
      font-size: clamp(32px, 8.8vw, 40px);
      line-height: .98;
      font-weight: 780;
      color: rgba(255,255,255,.94);
      white-space: nowrap;
      text-shadow: 0 2px 6px rgba(0,0,0,.36);
      -webkit-font-smoothing: antialiased;
      font-synthesis-weight: none;
    }
    .title-gold {
      color: #ffc15d;
    }
    .sub {
      margin: 0;
      color: rgba(255,255,255,.94);
      font-size: clamp(17px, 4.8vw, 22px);
      line-height: 1.16;
      font-weight: 500;
      max-width: 100%;
      text-shadow: 0 3px 8px rgba(0,0,0,.55);
    }
    .hero-visual {
      height: 128px;
      position: relative;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      overflow: hidden;
      background:
        linear-gradient(90deg, transparent 0 18%, rgba(255,255,255,.06) 18% 19%, transparent 19% 37%, rgba(255,255,255,.05) 37% 38%, transparent 38% 58%, rgba(255,255,255,.05) 58% 59%, transparent 59%),
        linear-gradient(180deg, rgba(90,130,230,.10), rgba(214,172,82,.08));
    }
    .hero-visual .mini-plane {
      position: absolute;
      left: 28px;
      top: 42px;
      width: 56px;
      height: 56px;
      color: rgba(255,255,255,.88);
      transform: rotate(16deg);
      animation: floatPlane 2.8s ease-in-out infinite;
    }
    .hero-visual .orbital {
      position: absolute;
      inset: 24px 12px;
      border: 1px dashed rgba(255,255,255,.20);
      border-radius: 50%;
      transform: rotate(-18deg);
    }
    @keyframes floatPlane {
      0%, 100% { transform: translateY(0) rotate(16deg); }
      50% { transform: translateY(-8px) rotate(10deg); }
    }

    .asset-grid {
      display: grid !important;
      grid-template-columns: 1fr;
      gap: 20px;
      width: min(100%, 268px);
      margin: 18px auto 0;
      position: relative;
      z-index: 20;
      visibility: visible;
      opacity: 1;
    }
    .asset-card {
      height: 46px;
      min-height: 0;
      text-align: center;
      padding: 0 16px;
      border: 0;
      border-radius: 4px;
      background: var(--home-btn, #ffc15d);
      position: relative;
      overflow: hidden;
      color: #20242c !important;
      font-family: var(--font-ui);
      font-size: clamp(22px, 6.1vw, 28px);
      line-height: 46px;
      font-weight: 800;
      box-shadow: 4px 5px 0 var(--home-btn-shadow), 0 9px 16px rgba(0,0,0,.30);
      text-shadow: 0 1px 0 rgba(255,255,255,.12);
      text-decoration: none;
      -webkit-tap-highlight-color: transparent;
    }
    .asset-card::before,
    .asset-card::after {
      content: "";
      position: absolute;
      pointer-events: none;
    }
    .asset-card::before {
      inset: 0 0 auto 0;
      height: 50%;
      background: rgba(255,255,255,.08);
    }
    .asset-card::after {
      right: 0;
      top: 0;
      bottom: 0;
      width: 8px;
      background: rgba(0,0,0,.10);
    }
    .asset-name {
      position: relative;
      z-index: 1;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .asset-code { color: var(--faint); font-size: 11px; line-height: 16px; }
    .asset-badge,
    .asset-return,
    .asset-meta,
    .mini-bars {
      display: none;
    }
    .asset-badge {
      height: 22px;
      padding: 0 7px;
      border-radius: var(--radius);
      display: inline-flex;
      align-items: center;
      color: var(--accent);
      background: var(--accent-soft);
      font-size: 11px;
      white-space: nowrap;
    }
    .asset-return { margin-top: 15px; align-items: baseline; gap: 4px; }
    .asset-return .num { font-size: 31px; line-height: 34px; font-weight: 800; }
    .asset-return span:last-child { color: var(--muted); font-size: 12px; }
    .asset-meta {
      margin-top: 8px;
      color: var(--muted);
      font-size: 12px;
      line-height: 18px;
    }
    .mini-bars {
      height: 28px;
      display: flex;
      align-items: center;
      gap: 2px;
      margin-top: 10px;
      opacity: .95;
    }
    .mini-bars i {
      width: 3px;
      height: var(--h);
      background: var(--c);
      border-radius: 1px;
      display: block;
    }

    .notice {
      display: none;
      margin-top: 14px;
      padding: 10px 11px;
      border: 1px solid rgba(214,172,82,.20);
      border-radius: var(--radius);
      color: rgba(255,255,255,.70);
      background: rgba(214,172,82,.08);
      font-size: 12px;
      line-height: 18px;
    }
    .home-actions {
      position: absolute;
      z-index: 8;
      left: 16px;
      right: 16px;
      bottom: max(10px, env(safe-area-inset-bottom));
      margin-top: 0;
      padding-top: 0;
      display: grid;
      grid-template-columns: 1.28fr .72fr .72fr;
      gap: 8px;
    }
    .home-action {
      height: 44px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 4px;
      background: rgba(4,8,16,.72);
      color: rgba(255,255,255,.88);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 720;
      white-space: nowrap;
    }
    .home-action.primary {
      color: #dce7ff;
      background: linear-gradient(180deg, rgba(90,130,230,.62), rgba(31,67,146,.74));
      border-color: rgba(90,130,230,.36);
    }
    .home-action svg {
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
    }

    .flight {
      position: relative;
      padding-left: 0;
      padding-right: 0;
      gap: 0;
    }
    .flight .nav {
      position: absolute;
      z-index: 12;
      top: max(8px, env(safe-area-inset-top));
      left: 0;
      right: 0;
      height: 38px;
      padding: 0 16px;
      background: linear-gradient(180deg, rgba(8,11,18,.82), rgba(8,11,18,0));
    }
    .flight .icon-btn {
      width: 32px;
      height: 32px;
    }
    .flight-head {
      position: absolute;
      z-index: 12;
      top: calc(max(8px, env(safe-area-inset-top)) + 38px);
      left: 0;
      right: 0;
      padding: 0 14px 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
      align-items: end;
      pointer-events: none;
    }
    .flight-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 17px;
      line-height: 22px;
      font-weight: 800;
      color: rgba(255,255,255,.94);
    }
    .hud {
      position: absolute;
      z-index: 12;
      top: calc(max(8px, env(safe-area-inset-top)) + 64px);
      left: 12px;
      right: 12px;
      margin: 0;
      display: grid;
      grid-template-columns: 1.1fr .9fr .9fr;
      gap: 5px;
      pointer-events: none;
    }
    .hud-card {
      min-height: 38px;
      padding: 5px 7px;
      border-radius: var(--radius);
      background: rgba(8,11,18,.42);
      border: 1px solid var(--line);
      backdrop-filter: blur(8px);
    }
    .hud-card label {
      display: block;
      color: var(--faint);
      font-size: 9px;
      line-height: 11px;
      margin-bottom: 1px;
    }
    .hud-card strong {
      font-size: 13px;
      line-height: 16px;
      font-weight: 750;
    }
    .hud-card .big {
      font-size: 16px;
      line-height: 18px;
      font-weight: 820;
    }
    .progress-wrap {
      position: absolute;
      z-index: 12;
      top: calc(max(8px, env(safe-area-inset-top)) + 107px);
      left: 12px;
      right: 12px;
      margin: 0;
      height: 3px;
      border-radius: var(--radius);
      background: rgba(255,255,255,.07);
      overflow: hidden;
      pointer-events: none;
    }
    .progress-bar {
      height: 100%;
      width: 0%;
      border-radius: var(--radius);
      background: linear-gradient(90deg, var(--primary), var(--asset-accent, var(--amber)));
      transition: width .25s ease;
    }

    .stage {
      flex: 1 1 auto;
      width: 100%;
      height: 100%;
      min-height: 0;
      max-height: none;
      margin: 0 0 0;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(ellipse at 52% 0%, rgba(90,130,230,.16), transparent 44%),
        linear-gradient(180deg, rgba(90,130,230,.08), transparent 42%),
        linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.015));
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      touch-action: none;
      perspective: 780px;
      perspective-origin: 48% 40%;
    }
    .scene-canvas {
      position: absolute;
      inset: 0;
      z-index: 3;
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }
    .stage::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.22), transparent);
      z-index: 1;
      opacity: .55;
    }
    .stage::after {
      content: "";
      display: none;
      position: absolute;
      z-index: 0;
      left: -18%;
      right: -18%;
      bottom: -28px;
      height: 58%;
      transform: rotateX(62deg);
      transform-origin: center bottom;
      background:
        repeating-linear-gradient(90deg, rgba(255,255,255,.075) 0 1px, transparent 1px 42px),
        repeating-linear-gradient(0deg, rgba(255,255,255,.055) 0 1px, transparent 1px 34px),
        linear-gradient(180deg, rgba(90,130,230,.07), rgba(0,0,0,0));
      opacity: .72;
      pointer-events: none;
    }
    .track {
      position: absolute;
      inset: 0 auto 0 0;
      width: var(--track-width);
      transform: translateX(var(--offset, 0px));
      transition: transform .42s cubic-bezier(.2,.8,.2,1);
      z-index: 2;
      transform-style: preserve-3d;
    }
    .month-band {
      position: absolute;
      top: 0;
      bottom: 0;
      width: var(--w);
      left: var(--x);
      border-left: 1px solid rgba(255,255,255,.10);
      background: linear-gradient(180deg, rgba(255,255,255,.030), rgba(255,255,255,.010));
    }
    .month-band:nth-child(odd) { background: rgba(90,130,230,.035); }
    .month-label {
      position: absolute;
      top: 12px;
      left: 10px;
      color: rgba(255,255,255,.72);
      font-size: 13px;
      font-weight: 680;
    }
    .bar {
      position: absolute;
      left: var(--x);
      top: var(--y);
      width: 21px;
      height: var(--h);
      border: 0;
      padding: 0;
      background: transparent;
      opacity: .98;
      cursor: pointer;
      transform: translateZ(var(--z, 0px));
      transform-style: preserve-3d;
      filter: drop-shadow(9px 11px 8px rgba(0,0,0,.34));
      z-index: var(--zi);
    }
    .bar::after {
      content: "";
      position: absolute;
      left: 7px;
      bottom: -11px;
      width: 22px;
      height: 9px;
      transform: skewX(-42deg);
      background: rgba(0,0,0,.34);
      filter: blur(2px);
      opacity: .78;
      pointer-events: none;
    }
    .bar-face {
      position: absolute;
      display: block;
      pointer-events: none;
    }
    .bar-front {
      left: 0;
      top: 0;
      width: 14px;
      height: 100%;
      border-radius: 2px 2px 1px 1px;
      background:
        linear-gradient(90deg, rgba(255,255,255,.24), transparent 30%),
        linear-gradient(180deg, var(--bar-hi), var(--bar));
      box-shadow: inset -1px 0 0 rgba(0,0,0,.18), inset 1px 0 0 rgba(255,255,255,.16);
    }
    .bar-side {
      left: 14px;
      top: -7px;
      width: 8px;
      height: 100%;
      transform: skewY(-42deg);
      transform-origin: left top;
      border-radius: 0 2px 2px 0;
      background: linear-gradient(180deg, var(--bar), var(--bar-side));
      box-shadow: inset -1px 0 0 rgba(0,0,0,.24);
    }
    .bar-cap {
      left: 0;
      top: -7px;
      width: 14px;
      height: 8px;
      transform: skewX(-48deg);
      transform-origin: left bottom;
      border-radius: 2px 2px 0 0;
      background: linear-gradient(135deg, var(--bar-cap), var(--bar-hi));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.32);
    }
    .bar.neg-bar .bar-front {
      border-radius: 1px 1px 2px 2px;
      background:
        linear-gradient(90deg, rgba(255,255,255,.20), transparent 32%),
        linear-gradient(180deg, var(--bar), var(--bar-hi));
    }
    .bar.neg-bar .bar-side {
      top: 0;
      transform: skewY(42deg);
      transform-origin: left top;
    }
    .bar.neg-bar .bar-cap {
      top: auto;
      bottom: -7px;
      transform-origin: left top;
      background: linear-gradient(135deg, var(--bar-side), var(--bar));
    }
    .bar.is-current {
      opacity: 1;
      filter: drop-shadow(0 0 14px rgba(255,255,255,.22)) drop-shadow(9px 11px 8px rgba(0,0,0,.34));
    }
    .bar.is-current .bar-front {
      box-shadow: inset -1px 0 0 rgba(0,0,0,.18), inset 1px 0 0 rgba(255,255,255,.16), 0 0 0 1px rgba(255,255,255,.88);
    }
    .bar.is-current .bar-cap,
    .bar.is-current .bar-side {
      box-shadow: inset 0 1px 0 rgba(255,255,255,.34), 0 0 0 1px rgba(255,255,255,.42);
    }
    .date-tick {
      position: absolute;
      top: calc(var(--baseline) + 118px);
      left: calc(var(--x) - 8px);
      color: rgba(255,255,255,.34);
      font-size: 10px;
      line-height: 14px;
      transform: rotate(-62deg);
      transform-origin: left top;
      white-space: nowrap;
    }
    .plane {
      position: absolute;
      z-index: 5;
      left: 74px;
      top: var(--plane-y, 128px);
      width: 54px;
      height: 54px;
      color: rgba(255,255,255,.96);
      filter: drop-shadow(0 8px 18px rgba(90,130,230,.38));
      transition: top .18s ease, transform .18s ease;
    }
    .plane.playing {
      animation: planePulse .78s ease-in-out infinite;
    }
    @keyframes planePulse {
      0%, 100% { transform: translateY(0) rotate(7deg); }
      50% { transform: translateY(-3px) rotate(2deg); }
    }
    .speed-lines {
      position: absolute;
      z-index: 4;
      left: 12px;
      top: calc(var(--plane-y, 128px) + 20px);
      width: 58px;
      height: 18px;
      opacity: .7;
      transition: top .18s ease, opacity .2s ease;
    }
    .speed-lines i {
      display: block;
      height: 1px;
      margin: 5px 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.62));
      animation: speedLine .5s linear infinite;
    }
    .speed-lines i:nth-child(2) { width: 42px; animation-delay: .12s; }
    .speed-lines i:nth-child(3) { width: 30px; animation-delay: .22s; }
    @keyframes speedLine {
      from { transform: translateX(18px); opacity: .2; }
      to { transform: translateX(-18px); opacity: .8; }
    }
    .pause-hint {
      position: absolute;
      z-index: 7;
      left: 16px;
      right: 16px;
      bottom: 14px;
      padding: 9px 10px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(8,11,18,.72);
      color: var(--muted);
      font-size: 12px;
      line-height: 18px;
      opacity: 0;
      transform: translateY(8px);
      pointer-events: none;
      transition: opacity .2s ease, transform .2s ease;
    }
    .pause-hint.show {
      opacity: 1;
      transform: translateY(0);
    }

    .detail-sheet {
      position: absolute;
      z-index: 8;
      left: 16px;
      right: 16px;
      bottom: 94px;
      margin: 0;
      border-radius: var(--radius);
      border: 1px solid var(--line-strong);
      background: rgba(17,24,39,.94);
      padding: 8px 10px;
      display: none;
      grid-template-columns: 1fr auto;
      gap: 6px 12px;
      align-items: center;
    }
    .detail-sheet.show { display: grid; }
    .detail-date { color: var(--muted); font-size: 13px; line-height: 18px; }
    .detail-change { font-size: 23px; line-height: 27px; font-weight: 820; }
    .detail-meta { color: var(--muted); font-size: 11px; line-height: 16px; }

    .controls {
      position: absolute;
      z-index: 9;
      left: 0;
      right: 0;
      bottom: max(10px, env(safe-area-inset-bottom));
      padding: 0 12px;
      display: grid;
      grid-template-columns: 78px 1fr;
      gap: 8px;
      align-items: center;
      pointer-events: auto;
    }
    .dpad {
      width: 78px;
      height: 78px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 5px;
    }
    .control-btn {
      border: 1px solid var(--line);
      background: rgba(255,255,255,.055);
      border-radius: var(--radius);
      min-width: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,.82);
      padding: 0;
    }
    .control-btn.active,
    .control-btn:active {
      background: rgba(90,130,230,.28);
      border-color: rgba(90,130,230,.58);
      color: #fff;
      box-shadow: 0 0 18px rgba(90,130,230,.24);
    }
    .control-btn svg { width: 17px; height: 17px; }
    .up { grid-column: 2; grid-row: 1; }
    .left { grid-column: 1; grid-row: 2; }
    .right { grid-column: 3; grid-row: 2; }
    .down { grid-column: 2; grid-row: 3; }
    .center {
      grid-column: 2;
      grid-row: 2;
      background: var(--primary-soft);
      border-color: rgba(90,130,230,.28);
      color: var(--primary);
    }
    .action-panel {
      display: grid;
      grid-template-columns: 1fr 72px;
      gap: 8px;
      align-items: stretch;
    }
    .play-btn {
      height: 36px;
      border: 1px solid rgba(90,130,230,.32);
      border-radius: var(--radius);
      background: linear-gradient(180deg, rgba(90,130,230,.25), rgba(90,130,230,.14));
      color: rgba(255,255,255,.92);
      font-size: 13px;
      font-weight: 750;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .reset-btn {
      height: 36px;
      border: 1px solid var(--line);
      border-radius: var(--radius);
      background: rgba(255,255,255,.045);
      color: var(--muted);
      font-size: 12px;
    }
    .control-note {
      grid-column: 1 / -1;
      color: var(--faint);
      font-size: 9px;
      line-height: 12px;
    }

    .summary-mask {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: none;
      align-items: flex-end;
      background: rgba(0,0,0,.56);
      padding: 16px;
    }
    .summary-mask.show { display: flex; }
    .summary-panel {
      width: 100%;
      border-radius: var(--radius);
      border: 1px solid var(--line-strong);
      background: linear-gradient(180deg, rgba(21,31,50,.98), rgba(13,19,32,.98));
      padding: 18px 16px 16px;
      box-shadow: 0 -20px 40px rgba(0,0,0,.30);
    }
    .summary-title {
      margin: 0 0 3px;
      font-family: var(--font-display);
      font-size: 24px;
      line-height: 32px;
      font-weight: 800;
    }
    .summary-sub {
      margin: 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 20px;
    }
    .summary-return {
      margin: 14px 0 12px;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .summary-return .num {
      font-size: 48px;
      line-height: 52px;
      font-weight: 850;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 14px;
    }
    .summary-cell {
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 9px 10px;
      background: rgba(255,255,255,.035);
    }
    .summary-cell label {
      display: block;
      color: var(--faint);
      font-size: 11px;
      line-height: 16px;
      margin-bottom: 4px;
    }
    .summary-cell strong {
      font-size: 14px;
      line-height: 20px;
      font-weight: 720;
    }
    .summary-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .summary-actions button {
      height: 44px;
      border-radius: var(--radius);
      border: 1px solid var(--line);
      background: rgba(255,255,255,.045);
      color: rgba(255,255,255,.82);
      font-weight: 700;
    }
    .summary-actions .primary {
      border-color: rgba(90,130,230,.32);
      background: var(--primary-soft);
      color: #dce7ff;
    }
    .toast {
      position: absolute;
      z-index: 30;
      left: 50%;
      bottom: max(22px, env(safe-area-inset-bottom));
      transform: translate(-50%, 12px);
      max-width: calc(100% - 48px);
      padding: 9px 12px;
      border-radius: var(--radius);
      background: rgba(255,255,255,.92);
      color: #111827;
      font-size: 13px;
      line-height: 18px;
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease, transform .2s ease;
      box-shadow: 0 12px 28px rgba(0,0,0,.30);
    }
    .toast.show {
      opacity: 1;
      transform: translate(-50%, 0);
    }

    @media (max-height: 740px) {
      .home-hero { padding-top: 20px; }
      .brand-logo { width: 96px; margin-bottom: 10px; }
      h1 { font-size: clamp(29px, 8vw, 36px); margin-bottom: 8px; }
      .sub { font-size: clamp(16px, 4.6vw, 20px); }
      .asset-grid { gap: 14px; margin-top: 12px; }
      .asset-card { height: 40px; line-height: 40px; font-size: clamp(20px, 5.8vw, 25px); }
      .home-action { height: 34px; }
      .hud { top: calc(max(8px, env(safe-area-inset-top)) + 60px); }
      .hud-card { min-height: 34px; padding: 4px 6px; }
      .progress-wrap { top: calc(max(8px, env(safe-area-inset-top)) + 103px); }
      .controls { padding-top: 0; grid-template-columns: 74px 1fr; }
      .dpad { width: 74px; height: 74px; }
      .play-btn,
      .reset-btn { height: 34px; }
    }
    @media (max-width: 360px) {
      .home-actions { grid-template-columns: 1fr 64px 64px; }
      .home-action.primary { font-size: 12px; gap: 4px; }
      .home-action svg { width: 15px; height: 15px; }
      .asset-card { padding: 0 11px; }
      .asset-return .num { font-size: 28px; }
    }
  </style>
</head>
<body>
  <main class="app" id="app">
    <section class="view home active" id="homeView">
      <div class="nav">
        <div></div>
        <div class="nav-title">市场飞行舱</div>
        <div></div>
      </div>
      <div class="home-hero">
        <img class="brand-logo" src="${logoDataUri}" alt="金十数据">
        <div class="kicker">2026 H1 · 日涨跌幅</div>
        <h1><span class="title-gold">开飞机</span><span>穿越行情</span></h1>
        <p class="sub">2026上半年四大资产热力图</p>
      </div>
      <div class="asset-grid" id="assetGrid">
        <a class="asset-card" href="?market=gold" data-id="gold" onclick="try{return enterMarket('gold')}catch(e){return true}" style="--home-btn:#ffc15d;--home-btn-shadow:#df7f3f"><span class="asset-name">现货黄金</span></a>
        <a class="asset-card" href="?market=wti" data-id="wti" onclick="try{return enterMarket('wti')}catch(e){return true}" style="--home-btn:#2eaac1;--home-btn-shadow:#1f7f9a"><span class="asset-name">WTI原油</span></a>
        <a class="asset-card" href="?market=nasdaq" data-id="nasdaq" onclick="try{return enterMarket('nasdaq')}catch(e){return true}" style="--home-btn:#ca76bd;--home-btn-shadow:#aa509d"><span class="asset-name">纳斯达克指数</span></a>
        <a class="asset-card" href="?market=csi300" data-id="csi300" onclick="try{return enterMarket('csi300')}catch(e){return true}" style="--home-btn:#e3a4cf;--home-btn-shadow:#c678ad"><span class="asset-name">沪深300指数</span></a>
      </div>
      <div class="notice" id="dataNotice"></div>
      <div class="home-actions">
        <button class="home-action primary" id="downloadBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>
          下载金十数据APP
        </button>
        <button class="home-action" id="commentBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>
          评论
        </button>
        <button class="home-action" id="shareBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v14"/></svg>
          分享
        </button>
      </div>
    </section>

    <section class="view flight" id="flightView">
      <div class="nav">
        <button class="icon-btn" id="backBtn" aria-label="返回首页">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div class="nav-title">飞行模式</div>
        <button class="icon-btn" id="homeBtn" aria-label="回到首页">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>
        </button>
      </div>

      <div class="flight-head">
        <div>
          <h2 class="flight-title" id="flightTitle">现货黄金</h2>
        </div>
      </div>

      <div class="hud">
        <div class="hud-card">
          <label>当前日期</label>
          <strong id="currentDate">--</strong>
        </div>
        <div class="hud-card">
          <label>日涨跌幅</label>
          <strong class="num big" id="currentChange">--</strong>
        </div>
        <div class="hud-card">
          <label>收盘</label>
          <strong class="num" id="currentClose">--</strong>
        </div>
      </div>
      <div class="progress-wrap" aria-label="飞行进度">
        <div class="progress-bar" id="progressBar"></div>
      </div>

      <div class="stage" id="stage">
        <canvas class="scene-canvas" id="sceneCanvas" aria-label="3D 月度行情飞行图"></canvas>
        <div class="pause-hint" id="pauseHint">暂停后可以点击任意柱子查看详细日期、当日涨跌幅与收盘价。</div>
      </div>

      <div class="detail-sheet" id="detailSheet">
        <div>
          <div class="detail-date" id="detailDate">--</div>
          <div class="detail-meta" id="detailMeta">--</div>
        </div>
        <div class="detail-change num" id="detailChange">--</div>
      </div>

      <div class="controls">
        <div class="dpad">
          <button class="control-btn up" id="upBtn" aria-label="向上">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>
          </button>
          <button class="control-btn left" id="leftBtn" aria-label="向左">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button class="control-btn center" id="centerBtn" aria-label="定位当前柱">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          </button>
          <button class="control-btn right" id="rightBtn" aria-label="向右">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <button class="control-btn down" id="downBtn" aria-label="向下">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
        <div class="action-panel">
          <button class="play-btn" id="playBtn"><span id="playIcon">Ⅱ</span><span id="playText">暂停</span></button>
          <button class="reset-btn" id="resetBtn">重飞</button>
          <div class="control-note" id="controlNote">上下左右控制飞机飞行。暂停后点击柱子看详情。</div>
        </div>
      </div>
    </section>

    <div class="summary-mask" id="summaryMask">
      <div class="summary-panel">
        <h3 class="summary-title" id="summaryTitle">飞行完成</h3>
        <p class="summary-sub" id="summarySub">--</p>
        <div class="summary-return">
          <div class="num" id="summaryReturn">--</div>
          <div>累计涨跌幅</div>
        </div>
        <div class="summary-grid">
          <div class="summary-cell"><label>最佳单日</label><strong id="summaryBest">--</strong></div>
          <div class="summary-cell"><label>最弱单日</label><strong id="summaryWorst">--</strong></div>
          <div class="summary-cell"><label>上涨 / 下跌</label><strong id="summaryDays">--</strong></div>
          <div class="summary-cell"><label>收盘区间</label><strong id="summaryClose">--</strong></div>
        </div>
        <div class="summary-actions">
          <button id="summaryHomeBtn">回首页</button>
          <button class="primary" id="summaryReplayBtn">再飞一次</button>
        </div>
      </div>
    </div>
    <div class="toast" id="toast"></div>
  </main>

  <script src="https://unpkg.com/three@0.128.0/build/three.min.js"></script>
  <script>
    const MARKETS = ${marketJson};
    const order = ["gold", "wti", "nasdaq", "csi300"];
    const NUMBER_FONT = '"D-DIN-PRO", "D-DIN", "DIN Pro", "DIN Alternate", "Arial Narrow", sans-serif';
    const $ = (id) => document.getElementById(id);
    const state = {
      activeId: null,
      market: null,
      index: 0,
      playing: false,
      timer: null,
      planeY: 0,
      controls: { left: false, right: false, up: false, down: false },
      plane: { x: 0, y: 24, z: 0, vx: 0, vy: 0, speed: 1.85 },
      scene: null,
      touchStart: null,
    };
    const CAMERA_BACK = 260;
    const CAMERA_HEIGHT = 145;
    const CAMERA_PITCH = 0.36;
    const PLANE_DEFAULT_Y = 24;
    const PLANE_MIN_Y = 12;
    const PLANE_MAX_Y = 58;
    const PLANE_LIMIT_X = 42;

    function formatPct(value) {
      const sign = value > 0 ? "+" : "";
      return sign + Number(value).toFixed(2) + "%";
    }

    function formatPrice(value) {
      if (value >= 1000) return Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return Number(value).toFixed(2);
    }

    function toneClass(value) {
      if (value > 0) return "pos";
      if (value < 0) return "neg";
      return "flat";
    }

    function miniBars(data, maxAbs) {
      const sample = data.filter((_, i) => i % Math.ceil(data.length / 28) === 0).slice(0, 28);
      return sample.map((item) => {
        const h = Math.max(5, Math.round(Math.abs(item.change) / maxAbs * 26));
        const c = item.change >= 0 ? "var(--red)" : "var(--green)";
        return '<i style="--h:' + h + 'px;--c:' + c + '"></i>';
      }).join("");
    }

    function renderHome() {
      const sortedEnds = order.map((id) => MARKETS[id].dataEnd).sort();
      const latest = sortedEnds[sortedEnds.length - 1];
      if ($("dataNotice")) $("dataNotice").textContent = "范围按 2026-01-01 至 2026-06-30 设置；当前 CSV 最新数据到 " + latest + "，累计涨跌幅按已提供数据的首末收盘价计算。";
      [...document.querySelectorAll(".asset-card")].forEach((card) => {
        card.addEventListener("click", (event) => { event.preventDefault(); enterMarket(card.dataset.id); });
      });
    }

    function groupedMonths(data) {
      const groups = [];
      data.forEach((item, index) => {
        const key = item.date.slice(0, 7);
        let group = groups[groups.length - 1];
        if (!group || group.key !== key) {
          group = { key, label: Number(item.date.slice(5, 7)) + "月", start: index, end: index };
          groups.push(group);
        }
        group.end = index;
      });
      return groups;
    }

    function createScene() {
      if (state.scene?.animationId) cancelAnimationFrame(state.scene.animationId);
      const canvas = $("sceneCanvas");
      const ctx = canvas.getContext("2d");
      state.scene = {
        canvas,
        ctx,
        dpr: 1,
        width: 0,
        height: 0,
        camera: 0,
        targetCamera: 0,
        layout: null,
        hitBoxes: [],
        animationId: null,
        startedAt: performance.now(),
      };
      resizeScene();
      buildSceneLayout();
      startRenderLoop();
    }

    function resizeScene() {
      if (!state.scene) return;
      const canvas = state.scene.canvas;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.scene.dpr = dpr;
      state.scene.width = Math.max(1, rect.width);
      state.scene.height = Math.max(1, rect.height);
      const nextWidth = Math.round(state.scene.width * dpr);
      const nextHeight = Math.round(state.scene.height * dpr);
      if (canvas.width !== nextWidth) canvas.width = nextWidth;
      if (canvas.height !== nextHeight) canvas.height = nextHeight;
      state.scene.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildSceneLayout() {
      const data = state.market.data;
      const groups = groupedMonths(data);
      const bars = [];
      let zCursor = 120;
      groups.forEach((group, monthIndex) => {
        const items = data.slice(group.start, group.end + 1);
        const cols = 5;
        const colGap = 32;
        const dayDepth = 18;
        const baseDepth = items.length * dayDepth + 110;
        const zStart = zCursor + 34;
        const bestLocalIndex = items.reduce((best, item, index) => item.change > items[best].change ? index : best, 0);
        const worstLocalIndex = items.reduce((worst, item, index) => item.change < items[worst].change ? index : worst, 0);
        const base = {
          ...group,
          monthIndex,
          zStart: zCursor,
          zEnd: zCursor + baseDepth,
          width: 208,
          depth: baseDepth,
        };
        items.forEach((item, localIndex) => {
          const col = localIndex % cols;
          const x = (col - (cols - 1) / 2) * colGap;
          const z = zStart + localIndex * dayDepth;
          bars.push({
            ...item,
            index: group.start + localIndex,
            monthLabel: group.label,
            monthIndex,
            x,
            z,
            w: 17,
            d: 21,
            h: Math.max(16, Math.abs(item.change) / state.market.maxAbsChange * 102),
            isUp: item.change >= 0,
            showLabel: localIndex === bestLocalIndex || localIndex === worstLocalIndex,
          });
        });
        zCursor += baseDepth + 168;
        base.bars = bars.slice(group.start, group.end + 1);
        group.base = base;
      });
      const firstZ = bars[0]?.z || 120;
      const lastZ = bars[bars.length - 1]?.z || firstZ;
      state.scene.layout = { groups: groups.map((group) => group.base), bars, firstZ, lastZ, endZ: lastZ + 170 };
      state.plane = { x: 0, y: PLANE_DEFAULT_Y, z: firstZ - 72, vx: 0, vy: 0, speed: 1.85 };
      state.scene.camera = state.plane.z - CAMERA_BACK;
      state.scene.targetCamera = state.scene.camera;
      state.completed = false;
    }

    function currentBar() {
      return state.scene?.layout?.bars?.[state.index] || null;
    }

    function cameraState() {
      const scene = state.scene;
      const lift = Math.max(0, (state.plane?.y || PLANE_DEFAULT_Y) - PLANE_DEFAULT_Y) * .2;
      return {
        x: (state.plane?.x || 0) * .32,
        y: CAMERA_HEIGHT + lift,
        z: scene.camera,
        pitch: CAMERA_PITCH,
      };
    }

    function projectPoint(x, y, z) {
      const scene = state.scene;
      const camera = cameraState();
      const relX = x - camera.x;
      const relY = y - camera.y;
      const relZ = z - camera.z;
      const cos = Math.cos(camera.pitch);
      const sin = Math.sin(camera.pitch);
      const depth = relZ * cos - relY * sin;
      const cameraY = relY * cos + relZ * sin;
      const focal = Math.max(500, Math.min(620, scene.width * 1.42));
      const safeDepth = Math.max(132, depth);
      const scale = Math.max(.18, Math.min(1.5, focal / safeDepth));
      return {
        x: scene.width / 2 + relX * scale,
        y: scene.height * 0.39 - cameraY * scale,
        scale,
        relZ,
        depth,
      };
    }

    function drawPoly(ctx, points, fill, stroke) {
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    function drawBackground(ctx, w, h) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#070a10");
      sky.addColorStop(.48, "#0d1320");
      sky.addColorStop(1, "#070a10");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * .52, h * .16, 0, w * .52, h * .16, w * .62);
      glow.addColorStop(0, "rgba(90,130,230,.22)");
      glow.addColorStop(.58, "rgba(90,130,230,.05)");
      glow.addColorStop(1, "rgba(90,130,230,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255,255,255,.06)";
      ctx.lineWidth = 1;
      for (let z = 80; z < 780; z += 70) {
        const left = projectPoint(-180, 0, state.scene.camera + z);
        const right = projectPoint(180, 0, state.scene.camera + z);
        ctx.beginPath();
        ctx.moveTo(left.x, left.y);
        ctx.lineTo(right.x, right.y);
        ctx.stroke();
      }
      for (let x = -180; x <= 180; x += 45) {
        const near = projectPoint(x, 0, state.scene.camera + 60);
        const far = projectPoint(x, 0, state.scene.camera + 760);
        ctx.beginPath();
        ctx.moveTo(near.x, near.y);
        ctx.lineTo(far.x, far.y);
        ctx.stroke();
      }
    }

    function isGroupVisible(base) {
      const camera = state.scene.camera;
      return base.zEnd >= camera + 90 && base.zStart <= camera + 920;
    }

    function drawBase(ctx, base) {
      if (!isGroupVisible(base)) return;
      const halfW = base.width / 2;
      const z0 = base.zStart;
      const z1 = base.zEnd;
      const top = [
        projectPoint(-halfW, 0, z0),
        projectPoint(halfW, 0, z0),
        projectPoint(halfW + 18, 0, z1),
        projectPoint(-halfW - 18, 0, z1),
      ];
      const lip = [
        projectPoint(-halfW, 0, z0),
        projectPoint(halfW, 0, z0),
        projectPoint(halfW, -10, z0 + 18),
        projectPoint(-halfW, -10, z0 + 18),
      ];
      drawPoly(ctx, top, "rgba(50,50,50,.86)", "rgba(255,255,255,.12)");
      drawPoly(ctx, lip, "rgba(28,28,28,.92)", "rgba(255,255,255,.08)");
      const label = projectPoint(-halfW + 18, 8, z0 + 22);
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(.28, label.scale * 1.2));
      ctx.fillStyle = "rgba(255,255,255,.82)";
      ctx.font = "800 " + Math.max(12, Math.min(18, 18 * label.scale)) + "px " + NUMBER_FONT;
      ctx.fillText(base.label, label.x, label.y);
      ctx.restore();
    }

    function shade(hex, amount) {
      const clean = hex.replace("#", "");
      const value = parseInt(clean, 16);
      const r = Math.max(0, Math.min(255, (value >> 16) + amount));
      const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
      const b = Math.max(0, Math.min(255, (value & 255) + amount));
      return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
    }

    function drawCuboid(ctx, bar) {
      const center = projectPoint(bar.x, 0, bar.z);
      if (center.depth < 116 || center.depth > 1180) return;
      const color = bar.isUp ? "#ff4f55" : "#00c89a";
      const front = color;
      const side = shade(color, -54);
      const top = shade(color, 34);
      const x0 = bar.x - bar.w / 2;
      const x1 = bar.x + bar.w / 2;
      const z0 = bar.z - bar.d / 2;
      const z1 = bar.z + bar.d / 2;
      const b0 = projectPoint(x0, 0, z0);
      const b1 = projectPoint(x1, 0, z0);
      const b2 = projectPoint(x1, 0, z1);
      const b3 = projectPoint(x0, 0, z1);
      const t0 = projectPoint(x0, bar.h, z0);
      const t1 = projectPoint(x1, bar.h, z0);
      const t2 = projectPoint(x1, bar.h, z1);
      const t3 = projectPoint(x0, bar.h, z1);
      const shadow = [
        projectPoint(x0 + 8, -3, z1 + 9),
        projectPoint(x1 + 22, -3, z1 + 9),
        projectPoint(x1 + 40, -3, z1 + 28),
        projectPoint(x0 + 22, -3, z1 + 28),
      ];
      drawPoly(ctx, shadow, "rgba(0,0,0,.24)");
      drawPoly(ctx, [b1, b2, t2, t1], side, "rgba(0,0,0,.18)");
      drawPoly(ctx, [b0, b1, t1, t0], front, "rgba(255,255,255,.14)");
      drawPoly(ctx, [t0, t1, t2, t3], top, "rgba(255,255,255,.18)");
      if (bar.index === state.index) {
        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,.55)";
        ctx.shadowBlur = 14;
        drawPoly(ctx, [b0, b1, t1, t0], "rgba(255,255,255,.08)", "rgba(255,255,255,.92)");
        ctx.restore();
      }
      const cx = (t0.x + t1.x + t2.x + t3.x) / 4;
      const cy = Math.min(t0.y, t1.y, t2.y, t3.y);
      const labelScale = Math.max(.52, Math.min(1, t0.scale));
      const pctSize = Math.round(Math.max(14, Math.min(24, 19 * labelScale)));
      const dateSize = Math.round(Math.max(11, Math.min(16, 13 * labelScale)));
      state.scene.hitBoxes.push({
        index: bar.index,
        x: Math.min(b0.x, b1.x, b2.x, b3.x, t0.x, t1.x, t2.x, t3.x) - 8,
        y: Math.min(b0.y, b1.y, b2.y, b3.y, t0.y, t1.y, t2.y, t3.y) - 8,
        w: Math.max(b0.x, b1.x, b2.x, b3.x, t0.x, t1.x, t2.x, t3.x) - Math.min(b0.x, b1.x, b2.x, b3.x, t0.x, t1.x, t2.x, t3.x) + 16,
        h: Math.max(b0.y, b1.y, b2.y, b3.y, t0.y, t1.y, t2.y, t3.y) - Math.min(b0.y, b1.y, b2.y, b3.y, t0.y, t1.y, t2.y, t3.y) + 16,
      });
      if (bar.showLabel && t0.depth > 220 && t0.depth < 980) {
        ctx.save();
        ctx.textAlign = "center";
        ctx.globalAlpha = Math.max(.42, Math.min(.92, labelScale));
        ctx.font = "800 " + pctSize + "px " + NUMBER_FONT;
        ctx.fillStyle = bar.isUp ? "#ff4f55" : "#00c89a";
        ctx.shadowColor = "rgba(0,0,0,.55)";
        ctx.shadowBlur = 5;
        ctx.fillText(formatPct(bar.change), cx, cy - (14 + 8 * labelScale));
        ctx.font = "800 " + dateSize + "px " + NUMBER_FONT;
        ctx.fillStyle = "rgba(255,255,255,.72)";
        ctx.fillText(bar.date.slice(5), cx, cy - (32 + 10 * labelScale));
        ctx.restore();
      }
    }

    function drawJet(ctx, time) {
      const elapsed = time - state.scene.startedAt;
      const phase = state.playing ? (elapsed % 900) / 900 : .28;
      const thrust = state.playing ? .55 + Math.sin(phase * Math.PI) * .45 : .22;
      const bank = Math.max(-8, Math.min(8, state.plane.vx * 5.5));
      const bob = state.playing ? Math.sin(elapsed / 260) * 1.8 : 0;
      const jp = (x, y, z) => projectPoint(state.plane.x + x, state.plane.y + y + bob, state.plane.z + z);

      const nose = jp(0, 32, 86);
      const bodyLeft = jp(-13, 20, 24);
      const bodyRight = jp(13, 20, 24);
      const tailLeft = jp(-10, 10, -58);
      const tailRight = jp(10, 10, -58);
      const tail = jp(0, 8, -66);
      const cockpit = jp(0, 31, 30);
      const wingRootL = jp(-9, 17, 20);
      const wingRootR = jp(9, 17, 20);
      const wingTipL = jp(-72, 7 + bank, -12);
      const wingTipR = jp(72, 7 - bank, -12);
      const wingBackL = jp(-22, 11, -36);
      const wingBackR = jp(22, 11, -36);

      ctx.save();
      ctx.shadowColor = "rgba(90,130,230,.42)";
      ctx.shadowBlur = 18;

      const shadow = [jp(-58, -2, -38), jp(58, -2, -38), jp(22, -2, 58), jp(-22, -2, 58)];
      drawPoly(ctx, shadow, "rgba(0,0,0,.22)");

      if (state.playing) {
        ctx.save();
        ctx.strokeStyle = "rgba(220,231,255,.23)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        [-30, 0, 30].forEach((offset, index) => {
          const from = jp(offset, 3, -62);
          const to = jp(offset - state.plane.vx * 18, -4, -150 - index * 18 - thrust * 34);
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
        });
        ctx.restore();
      }

      const flameTip = jp(0, 2, -112 - thrust * 34);
      const flameGradient = ctx.createLinearGradient(tail.x, tail.y, flameTip.x, flameTip.y);
      flameGradient.addColorStop(0, "rgba(90,130,230,.95)");
      flameGradient.addColorStop(.38, "rgba(255,197,89,.76)");
      flameGradient.addColorStop(1, "rgba(255,197,89,0)");
      drawPoly(ctx, [tailLeft, flameTip, tailRight], flameGradient);

      drawPoly(ctx, [wingRootL, wingTipL, wingBackL], "#8ea7f0", "rgba(255,255,255,.2)");
      drawPoly(ctx, [wingRootR, wingTipR, wingBackR], "#8ea7f0", "rgba(255,255,255,.2)");
      drawPoly(ctx, [jp(-9, 14, -42), jp(-32, 24 + bank * .35, -70), jp(-7, 10, -62)], "#5a82e6", "rgba(255,255,255,.16)");
      drawPoly(ctx, [jp(9, 14, -42), jp(32, 24 - bank * .35, -70), jp(7, 10, -62)], "#5a82e6", "rgba(255,255,255,.16)");

      const bodyGradient = ctx.createLinearGradient(nose.x, nose.y, tail.x, tail.y);
      bodyGradient.addColorStop(0, "#f4f8ff");
      bodyGradient.addColorStop(.45, "#dce7ff");
      bodyGradient.addColorStop(1, "#8ea7f0");
      drawPoly(ctx, [nose, bodyRight, tailRight, tailLeft, bodyLeft], bodyGradient, "rgba(255,255,255,.3)");

      ctx.save();
      const axis = Math.atan2(tail.y - nose.y, tail.x - nose.x);
      const glassScale = Math.max(.65, cockpit.scale);
      ctx.translate(cockpit.x, cockpit.y);
      ctx.rotate(axis);
      ctx.fillStyle = "rgba(8,11,18,.58)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5 * glassScale, 15 * glassScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    function drawScene(time) {
      if (!state.scene || !state.scene.ctx || !state.scene.layout) return;
      resizeScene();
      const scene = state.scene;
      const ctx = scene.ctx;
      const now = time || performance.now();
      const rawDt = scene.lastTime ? now - scene.lastTime : 16.67;
      scene.lastTime = now;
      const dt = Math.max(.35, Math.min(2.2, rawDt / 16.67));

      const controlActive = state.controls.left || state.controls.right || state.controls.up || state.controls.down;
      if (!state.completed) {
        const accel = .18 * dt;
        if (state.controls.left) state.plane.vx -= accel;
        if (state.controls.right) state.plane.vx += accel;
        if (state.controls.up) state.plane.vy += accel;
        if (state.controls.down) state.plane.vy -= accel;
        state.plane.vx *= state.controls.left || state.controls.right ? .95 : .82;
        state.plane.vy *= state.controls.up || state.controls.down ? .95 : .82;
        state.plane.vx = Math.max(-2.25, Math.min(2.25, state.plane.vx));
        state.plane.vy = Math.max(-1.75, Math.min(1.75, state.plane.vy));
        if (controlActive || Math.abs(state.plane.vx) > .01 || Math.abs(state.plane.vy) > .01) {
          state.plane.x = Math.max(-PLANE_LIMIT_X, Math.min(PLANE_LIMIT_X, state.plane.x + state.plane.vx * dt));
          state.plane.y = Math.max(PLANE_MIN_Y, Math.min(PLANE_MAX_Y, state.plane.y + state.plane.vy * dt));
        }
      }

      if (state.playing && !state.completed) {
        state.plane.z += state.plane.speed * dt;
        if (state.plane.z >= scene.layout.endZ) {
          state.plane.z = scene.layout.endZ;
          state.completed = true;
          syncCurrentFromPlane();
          pauseFlight();
          showSummary();
        }
      }

      scene.targetCamera = state.plane.z - CAMERA_BACK;
      scene.camera += (scene.targetCamera - scene.camera) * .16;
      syncCurrentFromPlane();
      scene.hitBoxes = [];
      drawBackground(ctx, scene.width, scene.height);
      const visibleGroups = scene.layout.groups.filter((base) => isGroupVisible(base));
      const visibleMonths = new Set(visibleGroups.map((base) => base.monthIndex));
      visibleGroups.forEach((base) => drawBase(ctx, base));
      scene.layout.bars
        .filter((bar) => visibleMonths.has(bar.monthIndex))
        .sort((a, b) => b.z - a.z)
        .forEach((bar) => drawCuboid(ctx, bar));
      drawJet(ctx, now);
    }

    function startRenderLoop() {
      if (!state.scene || state.scene.animationId) return;
      const loop = (time) => {
        drawScene(time);
        state.scene.animationId = requestAnimationFrame(loop);
      };
      state.scene.animationId = requestAnimationFrame(loop);
    }

    function makeTextSprite(lines, colors, scale = 1) {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,.82)";
      ctx.shadowBlur = 10;
      ctx.font = "800 56px " + NUMBER_FONT;
      ctx.fillStyle = colors[0] || "rgba(255,255,255,.78)";
      ctx.fillText(lines[0], 256, 74);
      ctx.font = "900 76px " + NUMBER_FONT;
      ctx.fillStyle = colors[1] || "#fff";
      ctx.fillText(lines[1], 256, 160);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(24 * scale, 12 * scale, 1);
      return sprite;
    }

    function createPlaneGroup() {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdce7ff, roughness: .35, metalness: .35 });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x8ea7f0, roughness: .45, metalness: .12, emissive: 0x101a44 });
      const tailMat = new THREE.MeshStandardMaterial({ color: 0x5a82e6, roughness: .48, metalness: .16, emissive: 0x081a55 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: .18, metalness: .2, transparent: true, opacity: .72 });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xd6ac52, transparent: true, opacity: .72 });

      const body = new THREE.Mesh(new THREE.ConeGeometry(3.2, 24, 28), bodyMat);
      body.rotation.x = -Math.PI / 2;
      body.position.z = -2;
      group.add(body);

      const noseLight = new THREE.PointLight(0xdce7ff, .38, 48);
      noseLight.position.set(0, 1.8, -16);
      group.add(noseLight);

      const cockpit = new THREE.Mesh(new THREE.SphereGeometry(2.1, 18, 12), glassMat);
      cockpit.scale.set(1, .72, 1.9);
      cockpit.position.set(0, 2.5, -7);
      group.add(cockpit);

      const wings = new THREE.Mesh(new THREE.BoxGeometry(34, .9, 8), wingMat);
      wings.position.set(0, .6, 2);
      group.add(wings);

      const leftTail = new THREE.Mesh(new THREE.BoxGeometry(12, .75, 4.2), tailMat);
      leftTail.position.set(-6.6, 1.2, 11);
      leftTail.rotation.z = .2;
      group.add(leftTail);

      const rightTail = new THREE.Mesh(new THREE.BoxGeometry(12, .75, 4.2), tailMat);
      rightTail.position.set(6.6, 1.2, 11);
      rightTail.rotation.z = -.2;
      group.add(rightTail);

      const verticalTail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 8, 4.5), tailMat);
      verticalTail.position.set(0, 4.2, 10.2);
      verticalTail.rotation.x = -.16;
      group.add(verticalTail);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(2.2, 14, 18, 1, true), flameMat);
      flame.rotation.x = Math.PI / 2;
      flame.position.set(0, -.4, 18);
      group.add(flame);
      group.userData.flame = flame;
      group.scale.set(.34, .34, .34);
      return group;
    }

    function buildThreeLayout() {
      const data = state.market.data;
      const groups = groupedMonths(data);
      const bars = [];
      const monthObjects = [];
      const clickable = [];
      let zCursor = 90;
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: .82, metalness: .05 });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x555b66, transparent: true, opacity: .34 });

      groups.forEach((group, monthIndex) => {
        const items = data.slice(group.start, group.end + 1);
        const cols = 5;
        const colGap = 7.2;
        const rowGap = 6.8;
        const baseWidth = 46;
        const baseDepth = 43;
        const zStart = zCursor;
        const zEnd = zCursor + baseDepth;
        const baseCenterZ = -(zStart + baseDepth / 2);
        const bestLocalIndex = items.reduce((best, item, index) => item.change > items[best].change ? index : best, 0);
        const worstLocalIndex = items.reduce((worst, item, index) => item.change < items[worst].change ? index : worst, 0);

        const base = new THREE.Mesh(new THREE.BoxGeometry(baseWidth, 1.2, baseDepth), baseMat);
        base.position.set(0, -.7, baseCenterZ);
        base.receiveShadow = true;
        state.scene.world.add(base);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry), edgeMat);
        edges.position.copy(base.position);
        state.scene.world.add(edges);

        const monthSprite = makeTextSprite([group.label, ""], ["rgba(255,255,255,.72)", "rgba(255,255,255,.72)"], .62);
        monthSprite.position.set(-baseWidth / 2 + 5, 3.2, -zStart - 4);
        monthSprite.scale.set(11, 5.5, 1);
        state.scene.world.add(monthSprite);

        const baseInfo = { ...group, monthIndex, zStart, zEnd, width: baseWidth, depth: baseDepth };
        items.forEach((item, localIndex) => {
          const col = localIndex % cols;
          const row = Math.floor(localIndex / cols);
          const x = (col - (cols - 1) / 2) * colGap;
          const z = zStart + 9 + row * rowGap;
          const h = Math.max(2.5, Math.abs(item.change) / state.market.maxAbsChange * 26);
          const material = new THREE.MeshStandardMaterial({
            color: item.change >= 0 ? 0xff4f55 : 0x00c89a,
            roughness: .34,
            metalness: .05,
            emissive: 0x000000,
          });
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(4.2, h, 4.6), material);
          mesh.position.set(x, h / 2, -z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.index = group.start + localIndex;
          state.scene.world.add(mesh);
          clickable.push(mesh);
          const bar = {
            ...item,
            index: group.start + localIndex,
            monthLabel: group.label,
            monthIndex,
            x,
            z,
            h,
            mesh,
            isUp: item.change >= 0,
            showLabel: localIndex === bestLocalIndex || localIndex === worstLocalIndex,
          };
          bars.push(bar);

          if (bar.showLabel) {
            const label = makeTextSprite(
              [item.date.slice(5), formatPct(item.change)],
              ["rgba(255,255,255,.76)", item.change >= 0 ? "#ff4f55" : "#00c89a"],
              .78
            );
            label.position.set(x, h + 7, -z);
            state.scene.world.add(label);
          }
        });
        monthObjects.push(baseInfo);
        zCursor += baseDepth + 39;
      });
      const firstZ = bars[0]?.z || 90;
      const lastZ = bars[bars.length - 1]?.z || firstZ;
      state.scene.layout = { groups: monthObjects, bars, firstZ, lastZ, endZ: lastZ + 64 };
      state.scene.clickable = clickable;
    }

    function createScene() {
      if (!window.THREE) {
        showToast("3D 引擎加载中，请稍后再点一次");
        throw new Error("THREE is not loaded");
      }
      if (state.scene?.animationId) cancelAnimationFrame(state.scene.animationId);
      if (state.scene?.renderer) state.scene.renderer.dispose();
      const canvas = $("sceneCanvas");
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setClearColor(0x070a10, 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      const world = new THREE.Scene();
      world.fog = new THREE.Fog(0x070a10, 120, 520);
      const camera = new THREE.PerspectiveCamera(58, 1, .1, 1800);
      const hemi = new THREE.HemisphereLight(0xffffff, 0x101827, .88);
      world.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, .86);
      key.position.set(44, 86, 70);
      key.castShadow = true;
      world.add(key);
      const grid = new THREE.GridHelper(760, 30, 0x354052, 0x252c3a);
      grid.position.set(0, -.05, -310);
      world.add(grid);

      state.scene = {
        canvas,
        renderer,
        world,
        camera,
        raycaster: new THREE.Raycaster(),
        pointer: new THREE.Vector2(),
        layout: null,
        clickable: [],
        animationId: null,
        startedAt: performance.now(),
        cameraZ: 0,
        lastHighlighted: null,
      };
      buildThreeLayout();
      state.plane = { x: 0, y: PLANE_DEFAULT_Y, z: state.scene.layout.firstZ - 34, vx: 0, vy: 0, speed: .42 };
      state.scene.cameraZ = state.plane.z;
      state.scene.planeGroup = createPlaneGroup();
      state.scene.world.add(state.scene.planeGroup);
      state.completed = false;
      resizeScene();
      startRenderLoop();
    }

    function resizeScene() {
      if (!state.scene?.renderer) return;
      const rect = state.scene.canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.scene.renderer.setPixelRatio(dpr);
      state.scene.renderer.setSize(width, height, false);
      state.scene.camera.aspect = width / height;
      state.scene.camera.updateProjectionMatrix();
    }

    function updateThreeHighlight() {
      const bar = state.scene?.layout?.bars?.[state.index];
      if (!bar || !bar.mesh) return;
      if (state.scene.lastHighlighted && state.scene.lastHighlighted !== bar.mesh) {
        state.scene.lastHighlighted.material.emissive.setHex(0x000000);
      }
      bar.mesh.material.emissive.setHex(0x333333);
      state.scene.lastHighlighted = bar.mesh;
    }

    function drawScene(time) {
      if (!state.scene?.renderer || !state.scene.layout) return;
      resizeScene();
      const now = time || performance.now();
      const rawDt = state.scene.lastTime ? now - state.scene.lastTime : 16.67;
      state.scene.lastTime = now;
      const dt = Math.max(.35, Math.min(2.2, rawDt / 16.67));
      const active = state.controls.left || state.controls.right || state.controls.up || state.controls.down;
      if (!state.completed) {
        const accel = .08 * dt;
        if (state.controls.left) state.plane.vx -= accel;
        if (state.controls.right) state.plane.vx += accel;
        if (state.controls.up) state.plane.vy += accel;
        if (state.controls.down) state.plane.vy -= accel;
        state.plane.vx *= state.controls.left || state.controls.right ? .94 : .82;
        state.plane.vy *= state.controls.up || state.controls.down ? .94 : .82;
        state.plane.vx = Math.max(-.82, Math.min(.82, state.plane.vx));
        state.plane.vy = Math.max(-.56, Math.min(.56, state.plane.vy));
        if (active || Math.abs(state.plane.vx) > .01 || Math.abs(state.plane.vy) > .01) {
          state.plane.x = Math.max(-PLANE_LIMIT_X, Math.min(PLANE_LIMIT_X, state.plane.x + state.plane.vx * dt));
          state.plane.y = Math.max(PLANE_MIN_Y, Math.min(PLANE_MAX_Y, state.plane.y + state.plane.vy * dt));
        }
      }
      if (state.playing && !state.completed) {
        state.plane.z += state.plane.speed * dt;
        if (state.plane.z >= state.scene.layout.endZ) {
          state.plane.z = state.scene.layout.endZ;
          state.completed = true;
          syncCurrentFromPlane();
          pauseFlight();
          showSummary();
        }
      }

      const planeWorldZ = -state.plane.z;
      const plane = state.scene.planeGroup;
      plane.position.set(state.plane.x, state.plane.y, planeWorldZ);
      plane.rotation.z = -state.plane.vx * .5;
      plane.rotation.x = state.plane.vy * .22;
      if (plane.userData.flame) {
        plane.userData.flame.scale.set(1, 1 + (state.playing ? Math.sin(now / 70) * .18 + .18 : 0), 1);
        plane.userData.flame.visible = state.playing;
      }

      const camera = state.scene.camera;
      const targetCamera = new THREE.Vector3(state.plane.x * .32, state.plane.y + 48, planeWorldZ + 118);
      if (!state.scene.cameraReady) {
        camera.position.copy(targetCamera);
        state.scene.cameraReady = true;
      } else {
        camera.position.lerp(targetCamera, .14);
      }
      camera.lookAt(new THREE.Vector3(state.plane.x * .25, 7, planeWorldZ - 96));
      syncCurrentFromPlane();
      updateThreeHighlight();
      state.scene.renderer.render(state.scene.world, camera);
    }

    function startRenderLoop() {
      if (!state.scene || state.scene.animationId) return;
      const loop = (time) => {
        drawScene(time);
        state.scene.animationId = requestAnimationFrame(loop);
      };
      state.scene.animationId = requestAnimationFrame(loop);
    }

    function hitTestBar(point) {
      if (!state.scene?.raycaster || !state.scene.camera) return null;
      const rect = state.scene.canvas.getBoundingClientRect();
      state.scene.pointer.x = (point.x / rect.width) * 2 - 1;
      state.scene.pointer.y = -(point.y / rect.height) * 2 + 1;
      state.scene.raycaster.setFromCamera(state.scene.pointer, state.scene.camera);
      const hits = state.scene.raycaster.intersectObjects(state.scene.clickable || [], false);
      return hits.length ? hits[0].object.userData.index : null;
    }

    function selectMarket(id) {
      if (!MARKETS[id]) return;
      clearInterval(state.timer);
      state.activeId = id;
      state.market = MARKETS[id];
      state.index = 0;
      state.playing = true;
      state.completed = false;
      state.controls = { left: false, right: false, up: false, down: false };
      state.planeY = 0;
      document.documentElement.style.setProperty("--asset-accent", state.market.accent);
      $("homeView").classList.remove("active");
      $("flightView").classList.add("active");
      $("summaryMask").classList.remove("show");
      $("detailSheet").classList.remove("show");
      $("flightTitle").textContent = state.market.name;
      createScene();
      setPlaneY(0);
      applyCurrent(false);
      startFlight();
    }

    function forceFlightShell(id) {
      if (!MARKETS[id]) return;
      state.activeId = id;
      state.market = MARKETS[id];
      state.index = 0;
      document.documentElement.style.setProperty("--asset-accent", state.market.accent);
      $("homeView").classList.remove("active");
      $("flightView").classList.add("active");
      $("summaryMask").classList.remove("show");
      $("detailSheet").classList.remove("show");
      $("flightTitle").textContent = state.market.name;
      updateHud();
    }

    function enterMarket(id) {
      try {
        selectMarket(id);
      } catch (error) {
        console.error("进入飞行页失败", error);
        forceFlightShell(id);
      }
      return false;
    }

    function updateHud() {
      if (!state.market) return;
      const item = state.market.data[state.index];
      const market = state.market;
      $("currentDate").textContent = item.date;
      $("currentChange").textContent = formatPct(item.change);
      $("currentChange").className = "num big " + toneClass(item.change);
      $("currentClose").textContent = formatPrice(item.close);
      $("progressBar").style.width = ((state.index + 1) / market.data.length * 100).toFixed(2) + "%";
    }

    function syncCurrentFromPlane() {
      if (!state.scene?.layout?.bars?.length) return;
      const bars = state.scene.layout.bars;
      let nextIndex = 0;
      const z = state.plane.z + 18;
      for (let i = 0; i < bars.length; i += 1) {
        if (bars[i].z <= z) nextIndex = i;
        else break;
      }
      if (nextIndex !== state.index) {
        state.index = nextIndex;
        updateHud();
      }
    }

    function applyCurrent(movePlane = false) {
      updateHud();
      const bar = currentBar();
      if (bar && state.scene && movePlane) {
        state.plane.z = bar.z;
        state.plane.x = bar.x;
        state.plane.y = Math.max(PLANE_MIN_Y, Math.min(PLANE_MAX_Y, state.plane.y || PLANE_DEFAULT_Y));
        state.plane.vx = 0;
        state.plane.vy = 0;
        state.scene.camera = state.plane.z - CAMERA_BACK;
        state.scene.targetCamera = state.scene.camera;
      }
      drawScene(performance.now());
    }

    function startFlight() {
      if (!state.market) return;
      if (state.completed || state.plane.z >= state.scene.layout.endZ - 2) resetFlight(false);
      state.playing = true;
      state.completed = false;
      if (state.scene) state.scene.startedAt = performance.now();
      $("playIcon").textContent = "Ⅱ";
      $("playText").textContent = "暂停";
      $("detailSheet").classList.remove("show");
      clearInterval(state.timer);
    }

    function pauseFlight() {
      state.playing = false;
      $("playIcon").textContent = "▶";
      $("playText").textContent = "开始";
      clearInterval(state.timer);
    }

    function togglePlay() {
      if (!state.market) return;
      if (state.playing) pauseFlight();
      else startFlight();
    }

    function step(direction) {
      if (!state.market) return;
      const next = Math.max(0, Math.min(state.market.data.length - 1, state.index + direction));
      state.index = next;
      applyCurrent(true);
    }

    function goToIndex(index) {
      state.index = Math.max(0, Math.min(state.market.data.length - 1, index));
      applyCurrent(true);
    }

    function showDetail(index) {
      const item = state.market.data[index];
      $("detailDate").textContent = item.date + " · " + item.month;
      $("detailChange").textContent = formatPct(item.change);
      $("detailChange").className = "detail-change num " + toneClass(item.change);
      $("detailMeta").textContent = "收盘 " + formatPrice(item.close) + " " + state.market.unit + " · 累计 " + formatPct(item.cumulative);
      $("detailSheet").classList.add("show");
    }

    function showPauseHint() {
      $("pauseHint").classList.add("show");
      window.clearTimeout(showPauseHint.timer);
      showPauseHint.timer = window.setTimeout(() => $("pauseHint").classList.remove("show"), 1600);
    }

    function showToast(text) {
      $("toast").textContent = text;
      $("toast").classList.add("show");
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => $("toast").classList.remove("show"), 1800);
    }

    function setPlaneY(value) {
      state.planeY = Math.max(-24, Math.min(52, value));
      if (state.plane) state.plane.y = Math.max(PLANE_MIN_Y, Math.min(PLANE_MAX_Y, PLANE_DEFAULT_Y + state.planeY));
      drawScene(performance.now());
    }

    function resetFlight(autoPlay) {
      if (!state.market) return;
      $("summaryMask").classList.remove("show");
      $("detailSheet").classList.remove("show");
      state.index = 0;
      state.completed = false;
      state.controls = { left: false, right: false, up: false, down: false };
      if (state.scene?.layout) {
        state.plane = { x: 0, y: PLANE_DEFAULT_Y, z: state.scene.layout.firstZ - 34, vx: 0, vy: 0, speed: .42 };
        state.scene.camera = state.plane.z - CAMERA_BACK;
        state.scene.targetCamera = state.scene.camera;
        state.scene.cameraReady = false;
      }
      setPlaneY(0);
      applyCurrent(false);
      if (autoPlay) startFlight();
      else pauseFlight();
    }

    function showSummary() {
      const market = state.market;
      $("summaryTitle").textContent = market.shortName + "飞行完成";
      $("summarySub").textContent = market.dataStart + " 至 " + market.dataEnd + "，共 " + market.count + " 根日涨跌幅柱";
      $("summaryReturn").textContent = formatPct(market.returnPct);
      $("summaryReturn").className = "num " + toneClass(market.returnPct);
      $("summaryBest").textContent = market.bestDay.date + "  " + formatPct(market.bestDay.change);
      $("summaryBest").className = "pos";
      $("summaryWorst").textContent = market.worstDay.date + "  " + formatPct(market.worstDay.change);
      $("summaryWorst").className = "neg";
      $("summaryDays").textContent = market.upDays + " 天 / " + market.downDays + " 天";
      $("summaryClose").textContent = formatPrice(market.startClose) + " → " + formatPrice(market.endClose);
      $("summaryMask").classList.add("show");
    }

    function backHome() {
      clearInterval(state.timer);
      if (state.scene?.animationId) {
        cancelAnimationFrame(state.scene.animationId);
        state.scene.animationId = null;
      }
      state.playing = false;
      $("summaryMask").classList.remove("show");
      $("flightView").classList.remove("active");
      $("homeView").classList.add("active");
    }

    function getCanvasPoint(event) {
      const canvas = $("sceneCanvas");
      const rect = canvas.getBoundingClientRect();
      const point = event.changedTouches ? event.changedTouches[0] : event;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }

    function hitTestBar(point) {
      if (!state.scene) return null;
      for (let i = state.scene.hitBoxes.length - 1; i >= 0; i -= 1) {
        const box = state.scene.hitBoxes[i];
        if (point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h) {
          return box.index;
        }
      }
      return null;
    }

    function nudgePlane(key, amount = 16) {
      if (!state.plane) return;
      if (key === "left") state.plane.x -= amount;
      if (key === "right") state.plane.x += amount;
      if (key === "up") state.plane.y += amount * .78;
      if (key === "down") state.plane.y -= amount * .78;
      state.plane.x = Math.max(-PLANE_LIMIT_X, Math.min(PLANE_LIMIT_X, state.plane.x));
      state.plane.y = Math.max(PLANE_MIN_Y, Math.min(PLANE_MAX_Y, state.plane.y));
      if (state.scene) drawScene(performance.now());
    }

    function bindHoldButton(id, key) {
      const el = $(id);
      const set = (value) => {
        state.controls[key] = value;
        el.classList.toggle("active", value);
      };
      el.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        nudgePlane(key);
        set(true);
        if (el.setPointerCapture) el.setPointerCapture(event.pointerId);
      });
      ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
        el.addEventListener(type, () => set(false));
      });
    }

    function bindControls() {
      $("backBtn").addEventListener("click", backHome);
      $("homeBtn").addEventListener("click", backHome);
      $("playBtn").addEventListener("click", togglePlay);
      $("resetBtn").addEventListener("click", () => resetFlight(true));
      bindHoldButton("upBtn", "up");
      bindHoldButton("downBtn", "down");
      bindHoldButton("leftBtn", "left");
      bindHoldButton("rightBtn", "right");
      $("centerBtn").addEventListener("click", () => {
        state.plane.x = 0;
        state.plane.y = PLANE_DEFAULT_Y;
        state.plane.vx = 0;
        state.plane.vy = 0;
        if (state.scene) drawScene(performance.now());
        if (!state.playing) showDetail(state.index);
      });
      $("summaryHomeBtn").addEventListener("click", backHome);
      $("summaryReplayBtn").addEventListener("click", () => resetFlight(true));
      $("downloadBtn").addEventListener("click", () => showToast("下载金十数据APP入口已预留"));
      $("commentBtn").addEventListener("click", () => showToast("评论入口已预留"));
      $("shareBtn").addEventListener("click", async () => {
        if (navigator.share) {
          try {
            await navigator.share({ title: "开飞机穿越行情", text: "2026上半年四大资产热力图", url: location.href });
          } catch (error) {}
        } else {
          showToast("可通过浏览器菜单分享本页");
        }
      });
      $("stage").addEventListener("click", (event) => {
        if (state.playing) {
          showPauseHint();
          return;
        }
        const index = hitTestBar(getCanvasPoint(event));
        if (index !== null) {
          goToIndex(index);
          showDetail(index);
        }
      });
      $("stage").addEventListener("touchstart", (event) => {
        const touch = event.changedTouches[0];
        state.touchStart = { x: touch.clientX, y: touch.clientY };
      }, { passive: true });
      $("stage").addEventListener("touchend", (event) => {
        if (!state.touchStart) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - state.touchStart.x;
        const dy = touch.clientY - state.touchStart.y;
        if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          state.plane.x = Math.max(-PLANE_LIMIT_X, Math.min(PLANE_LIMIT_X, state.plane.x + (dx > 0 ? 24 : -24)));
        } else {
          state.plane.y = Math.max(PLANE_MIN_Y, Math.min(PLANE_MAX_Y, state.plane.y + (dy < 0 ? 18 : -18)));
        }
        if (state.scene) drawScene(performance.now());
        state.touchStart = null;
      }, { passive: true });
      window.addEventListener("resize", () => {
        if (state.scene) drawScene(performance.now());
      });
      window.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") state.controls.left = true;
        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") state.controls.right = true;
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") state.controls.up = true;
        if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") state.controls.down = true;
        if (event.code === "Space") { event.preventDefault(); togglePlay(); }
      });
      window.addEventListener("keyup", (event) => {
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") state.controls.left = false;
        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") state.controls.right = false;
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") state.controls.up = false;
        if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") state.controls.down = false;
      });
    }
    window.selectMarket = selectMarket;
    window.enterMarket = enterMarket;
    try { renderHome(); } catch (error) { console.error("首页初始化失败", error); }
    try { bindControls(); } catch (error) { console.error("控制按钮初始化失败", error); }
    const initialMarketMatch = String(location.search || "").match(/[?&]market=([^&]+)/);
    const initialMarket = initialMarketMatch ? decodeURIComponent(initialMarketMatch[1]) : "";
    if (MARKETS[initialMarket]) enterMarket(initialMarket);
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(outputPath);
