/**
 * ChartHelper - 简易图表绘制工具
 * 用Canvas绘制趋势线图、柱状图
 */
const ChartHelper = {

  /** 绘制趋势线图 */
  drawLineChart(canvas, data, options = {}) {
    if (!canvas || !data || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth * 2;
    const H = canvas.height = canvas.clientHeight * 2;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.scale(2, 2);
    ctx.clearRect(0, 0, W, H);

    const color = options.color || '#4a90d9';
    const label = options.label || '';
    const min = options.min !== undefined ? options.min : Math.min(...data) * 0.9;
    const max = options.max !== undefined ? options.max : Math.max(...data) * 1.1;
    const range = max - min || 1;

    // 网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      // 刻度标签
      const val = max - (range / 4) * i;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(1), pad.left - 4, y + 3);
    }

    // 数据线
    const stepX = chartW / (data.length - 1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + chartH - ((v - min) / range) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 填充
    ctx.lineTo(pad.left + (data.length - 1) * stepX, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '05');
    ctx.fillStyle = grad;
    ctx.fill();

    // 数据点
    data.forEach((v, i) => {
      const x = pad.left + i * stepX;
      const y = pad.top + chartH - ((v - min) / range) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // X轴标签
    const labels = options.labels || data.map((_, i) => `M${i + 1}`);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(data.length / 6));
    labels.forEach((l, i) => {
      if (i % labelStep === 0 || i === data.length - 1) {
        ctx.fillText(l, pad.left + i * stepX, pad.top + chartH + 16);
      }
    });

    // 标签
    if (label) {
      ctx.fillStyle = color;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, pad.left, pad.top - 4);
    }
  },

  /** 绘制柱状图（用于财政收支对比） */
  drawBarChart(canvas, datasets, options = {}) {
    if (!canvas || !datasets || datasets.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth * 2;
    const H = canvas.height = canvas.clientHeight * 2;
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.scale(2, 2);
    ctx.clearRect(0, 0, W, H);

    const colors = options.colors || ['#3fb950', '#f85149'];
    const labels = options.labels || datasets[0]?.map((_, i) => `M${i + 1}`) || [];
    const allVals = datasets.flat();
    const max = Math.max(...allVals) * 1.2 || 1;
    const barWidth = chartW / labels.length / (datasets.length + 0.5);

    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((max / 4 * (4 - i)).toFixed(0), pad.left - 4, y + 3);
    }

    // 柱状
    datasets.forEach((data, di) => {
      data.forEach((v, i) => {
        const x = pad.left + i * (chartW / labels.length) + di * barWidth + barWidth * 0.3;
        const barH = (v / max) * chartH;
        const y = pad.top + chartH - barH;
        ctx.fillStyle = colors[di % colors.length];
        ctx.fillRect(x, y, barWidth * 0.8, barH);
      });
    });

    // X轴
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(labels.length / 6));
    labels.forEach((l, i) => {
      if (i % step === 0 || i === labels.length - 1) {
        ctx.fillText(l, pad.left + i * (chartW / labels.length) + (chartW / labels.length) / 2, pad.top + chartH + 16);
      }
    });

    // 图例
    if (options.legend) {
      let lx = pad.left;
      options.legend.forEach((name, i) => {
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(lx, pad.top + chartH + 24, 10, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(name, lx + 14, pad.top + chartH + 33);
        lx += ctx.measureText(name).width + 30;
      });
    }
  },

  /** 绘制环形图（V3式收支构成） */
  drawDonutChart(canvas, slices, options = {}) {
    if (!canvas || !slices || slices.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth * 2;
    const H = canvas.height = canvas.clientHeight * 2;
    ctx.scale(2, 2); ctx.clearRect(0, 0, W, H);

    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const cx = cw / 2, cy = ch / 2;
    const outerR = Math.min(cw, ch) * 0.38;
    const innerR = outerR * 0.55;
    const rawTotal = slices.reduce((s, s2) => s + s2.value, 0);
    const total = rawTotal || 1;
    const holeLabel = options.centerLabel || '';

    let startAngle = -Math.PI / 2;
    for (const sl of slices) {
      if (sl.value <= 0) continue;
      const sliceAngle = (sl.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = sl.color || '#666';
      ctx.fill();
      startAngle += sliceAngle;
    }

    // 中心文字
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((rawTotal || 0).toLocaleString(), cx, cy - 6);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(holeLabel, cx, cy + 12);

    // 图例
    const legendY = ch - 8;
    let lx = 4;
    for (const sl of slices) {
      if (sl.value <= 0) continue;
      const pct = (sl.value / total * 100).toFixed(0);
      ctx.fillStyle = sl.color;
      ctx.fillRect(lx, legendY - 7, 7, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const txt = sl.label + ' ' + pct + '%';
      ctx.fillText(txt, lx + 9, legendY - 3);
      lx += ctx.measureText(txt).width + 14;
    }
  },
};

/** 历史数据记录器 —— 每月保存关键指标快照 */
class HistoryRecorder {
  constructor() { this.records = []; }

  record() {
    const county = stateManager.get('county');
    const fin = stateManager.get('finance');
    const eco = stateManager.get('economicData');
    const player = stateManager.get('player');
    if (!county) return;
    this.records.push({
      month: timeSystem?.month || 1,
      year: timeSystem?.year || 2026,
      gdp: county.economy?.gdp || 0,
      gdpGrowth: county.economy?.gdpGrowth || 0,
      treasury: fin?.treasuryBalance || 0,
      income: fin?.monthlyIncome || 0,
      expense: fin?.monthlyExpense || 0,
      debtRate: fin?.debtRate || 0,
      tension: county.socialTension || 0,
      health: player?.status?.health || 100,
      stress: player?.status?.stress || 20,
      approval: player?.getTotalPerformance?.() || 0,
    });
    if (this.records.length > 60) this.records.shift();
  }

  getLast(n) { return this.records.slice(-n); }
  getAll() { return this.records; }

  /** 获取GDP趋势数据（最近months个月） */
  getGDPTrend(months = 12) {
    const data = this.records.slice(-months);
    return {
      labels: data.map(r => `${r.month}月`),
      values: data.map(r => Math.round(r.gdp / 10000 * 10) / 10),
      growth: data.map(r => Math.round(r.gdpGrowth * 100 * 10) / 10),
    };
  }

  getFiscalTrend(months = 12) {
    const data = this.records.slice(-months);
    return {
      labels: data.map(r => `${r.month}月`),
      income: data.map(r => Math.round(r.income / 100)),
      expense: data.map(r => Math.round(r.expense / 100)),
      treasury: data.map(r => Math.round(r.treasury / 100)),
    };
  }

  getTensionTrend(months = 12) {
    const data = this.records.slice(-months);
    return {
      labels: data.map(r => `${r.month}月`),
      values: data.map(r => r.tension),
    };
  }
}
