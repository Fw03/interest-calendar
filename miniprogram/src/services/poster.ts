declare function require(path: string): unknown;
import { PublicCard, templateNames } from './share';
import { themes } from '../themes/tokens';
const { apiBase } = require('./config') as { apiBase: string };

export function downloadCode(id: string, bearer: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: apiBase + '/shares/' + id + '/code', timeout: 18000, header: { Authorization: 'Bearer ' + bearer },
      success(result) { result.statusCode === 200 ? resolve(result.tempFilePath) : reject(new Error('小程序码暂不可用')); },
      fail() { reject(new Error('小程序码下载失败')); },
    });
  });
}

type Canvas = WechatMiniprogram.Canvas;

function loadCode(canvas: Canvas, code: string) {
  return new Promise<WechatMiniprogram.Image>((resolve, reject) => {
    const image = canvas.createImage();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('小程序码无法显示'));
    image.src = code;
  });
}

export async function drawPoster(canvas: Canvas, card: PublicCard, code: string) {
  const palette = themes[card.themeId];
  canvas.width = 630;
  canvas.height = 880;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, 630, 880);
  ctx.fillStyle = palette.card;
  ctx.fillRect(36, 36, 558, 808);
  ctx.fillStyle = palette.brand;
  ctx.fillRect(72, 86, 38, 4);
  ctx.font = '26px sans-serif';
  ctx.fillText('日有所喜  ·  ' + templateNames[card.templateId], 72, 134);
  ctx.fillStyle = palette.text;
  ctx.font = 'bold 48px serif';
  ctx.fillText(card.date.replace(/-/g, ' / '), 72, 226);
  let y = 310;
  for (const item of card.contents) {
    ctx.fillStyle = palette.muted;
    ctx.font = '21px sans-serif';
    ctx.fillText(item.title, 72, y);
    ctx.fillStyle = palette.text;
    ctx.font = card.templateId === 'quote' ? '34px serif' : '28px sans-serif';
    const lines: string[] = [];
    let line = '';
    for (const char of Array.from(item.payload.text)) {
      if (line && ctx.measureText(line + char).width > 486) { lines.push(line); line = ''; }
      line += char;
    }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((text, index) => {
      const shown = index === 2 && lines.length > 3 ? Array.from(text).slice(0, -1).join('') + '…' : text;
      ctx.fillText(shown, 72, y + 45 + index * 42, 486);
    });
    y += 70 + 42 * Math.min(3, lines.length);
  }
  ctx.fillStyle = palette.soft;
  ctx.fillRect(72, 665, 486, 2);
  if (code) {
    const image = await loadCode(canvas, code);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(72, 695, 112, 112);
    ctx.drawImage(image, 76, 699, 104, 104);
    ctx.fillStyle = palette.muted;
    ctx.font = '23px sans-serif';
    ctx.fillText('微信扫码查看公开卡片', 207, 757);
  } else {
    ctx.fillStyle = palette.muted;
    ctx.font = '23px sans-serif';
    ctx.fillText('开发占位 · 暂无可扫码的小程序码', 72, 757);
  }
  return new Promise<string>((resolve, reject) => {
    wx.canvasToTempFilePath({ canvas, fileType: 'png', success: ({ tempFilePath }) => resolve(tempFilePath),
      fail: () => reject(new Error('海报导出失败，请重试')) });
  });
}
