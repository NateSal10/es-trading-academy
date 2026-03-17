import { useEffect, useRef } from 'react';
import { CANDLES, KEY_LEVELS, SWINGS } from '../../data/simData';

export default function SimCanvas({ layers }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    draw();
  }, [layers]);

  useEffect(() => {
    function onResize() { draw(); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [layers]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 700;
    const H = 340;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#1e2235';
    ctx.fillRect(0, 0, W, H);

    const allP = CANDLES.flatMap(c => [c.h, c.l]);
    const minP = Math.min(...allP) - 6;
    const maxP = Math.max(...allP) + 6;
    const range = maxP - minP;
    const pad = { l: 52, r: 10, t: 22, b: 30 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const toY = p => pad.t + cH - (p - minP) / range * cH;
    const sp = cW / CANDLES.length;
    const bw = Math.max(6, sp - 3);

    const { liqLow, liqHigh, fvgTop, fvgBot, obHigh, obLow } = KEY_LEVELS;

    // Grid
    for (let i = 0; i <= 6; i++) {
      const y = pad.t + i * (cH / 6);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      const pr = maxP - i * (range / 6);
      ctx.fillStyle = '#5f6380';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(pr), pad.l - 4, y + 4);
    }

    // Liquidity
    if (layers.liq) {
      ctx.setLineDash([6, 4]); ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(186,117,23,0.7)';
      ctx.beginPath(); ctx.moveTo(pad.l, toY(liqLow)); ctx.lineTo(W - pad.r, toY(liqLow)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.l, toY(liqHigh)); ctx.lineTo(W - pad.r, toY(liqHigh)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(186,117,23,0.9)';
      ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('SELL-SIDE LIQUIDITY (swept)', pad.l + 4, toY(liqLow) - 4);
      ctx.fillText('BUY-SIDE LIQUIDITY (target)', pad.l + 4, toY(liqHigh) - 4);
    }

    // FVG zone
    if (layers.fvg) {
      ctx.fillStyle = 'rgba(29,158,117,0.1)';
      ctx.fillRect(pad.l, toY(fvgTop), cW, toY(fvgBot) - toY(fvgTop));
      ctx.setLineDash([5, 3]); ctx.strokeStyle = 'rgba(29,158,117,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, toY(fvgTop)); ctx.lineTo(W - pad.r, toY(fvgTop)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.l, toY(fvgBot)); ctx.lineTo(W - pad.r, toY(fvgBot)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(29,158,117,0.9)'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'right';
      ctx.fillText('FVG', W - pad.r - 2, (toY(fvgTop) + toY(fvgBot)) / 2 + 4);
    }

    // OB zone
    if (layers.ob) {
      ctx.fillStyle = 'rgba(186,117,23,0.1)';
      ctx.fillRect(pad.l, toY(obHigh), cW, toY(obLow) - toY(obHigh));
      ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(186,117,23,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(pad.l, toY(obHigh)); ctx.lineTo(W - pad.r, toY(obHigh)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pad.l, toY(obLow)); ctx.lineTo(W - pad.r, toY(obLow)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(186,117,23,0.9)'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'right';
      ctx.fillText('OB', W - pad.r - 2, (toY(obHigh) + toY(obLow)) / 2 + 4);
    }

    // Candles
    CANDLES.forEach((c, i) => {
      const x = pad.l + i * sp + sp / 2;
      const bull = c.c >= c.o;
      const col = bull ? '#1D9E75' : '#D85A30';
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x, toY(c.h)); ctx.lineTo(x, toY(c.l)); ctx.stroke();
      const bt = toY(Math.max(c.o, c.c));
      const bbot = toY(Math.min(c.o, c.c));
      const bh = Math.max(2, bbot - bt);
      ctx.fillStyle = col;
      ctx.fillRect(x - bw / 2, bt, bw, bh);
      if (i === 8 && layers.ob) {
        ctx.strokeStyle = 'rgba(186,117,23,1)'; ctx.lineWidth = 2; ctx.setLineDash([]);
        ctx.strokeRect(x - bw / 2 - 2, bt - 2, bw + 4, bh + 4);
        ctx.fillStyle = 'rgba(186,117,23,0.9)'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('OB candle', x, bt - 6);
      }
    });

    // Structure labels
    if (layers.structure) {
      ctx.font = 'bold 9px system-ui';
      SWINGS.forEach(s => {
        const x = pad.l + s.i * sp + sp / 2;
        ctx.fillStyle = s.col; ctx.textAlign = 'center';
        const y = s.above ? toY(s.p) - 7 : toY(s.p) + 14;
        ctx.fillText(s.lbl, x, y);
      });
      ctx.fillStyle = 'rgba(29,158,117,0.8)'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
      const bosX = pad.l + 9.5 * sp + sp / 2;
      ctx.fillText('BOS', bosX, toY(5210));
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(29,158,117,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.l + 8 * sp + sp / 2, toY(5200));
      ctx.lineTo(pad.l + 11 * sp + sp / 2, toY(5238));
      ctx.stroke();
      ctx.setLineDash([]);
      if (layers.liq) {
        ctx.fillStyle = 'rgba(216,90,48,0.9)'; ctx.font = 'bold 9px system-ui';
        const sx = pad.l + 7.5 * sp + sp / 2;
        ctx.fillText('SWEEP', sx, toY(5194) + 22);
      }
    }

    // Entry marker
    const entryX = pad.l + 18 * sp + sp / 2;
    ctx.beginPath(); ctx.arc(entryX, toY(5224), 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(29,158,117,0.9)'; ctx.fill();
    ctx.fillStyle = 'rgba(29,158,117,1)'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('ENTRY', entryX, toY(5224) - 11);

    // Time labels
    ctx.fillStyle = '#3a3f5a'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
    ['9:30', '9:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30'].forEach((t, i) => {
      const x = pad.l + (i * 3 + 1) * sp + sp / 2;
      if (x < W - pad.r) ctx.fillText(t, x, H - 6);
    });
  }

  return <canvas ref={canvasRef} id="sim-canvas" />;
}
