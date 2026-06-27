/**
 * 本地 Chart.js 轻量兼容层。
 * 目标：断网时保证当前项目里的 line 图可绘制，不追求完整 Chart.js API。
 */
(function(){
  if (window.Chart) return;
  class ChartLite {
    constructor(target, config) {
      this.canvas = target && target.canvas ? target.canvas : target;
      this.config = config || {};
      this.ctx = this.canvas && this.canvas.getContext ? this.canvas.getContext('2d') : null;
      this.draw();
    }
    destroy() {
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    draw() {
      const ctx = this.ctx, canvas = this.canvas;
      if (!ctx || !canvas) return;
      const d = this.config.data || {};
      const datasets = d.datasets || [];
      const labels = d.labels || [];
      const w = canvas.width || canvas.clientWidth || 600;
      const h = canvas.height || canvas.clientHeight || 300;
      canvas.width = w; canvas.height = h;
      ctx.clearRect(0,0,w,h);
      const p = 36;
      const values = datasets.flatMap(ds => (ds.data || []).map(Number)).filter(Number.isFinite);
      const max = Math.max(...values, 1);
      const min = Math.min(0, ...values);
      const rng = max - min || 1;
      ctx.strokeStyle = '#2d3148'; ctx.lineWidth = 1;
      for (let i=0;i<=4;i++) {
        const y = p + (h-p*2)*i/4;
        ctx.beginPath(); ctx.moveTo(p,y); ctx.lineTo(w-p,y); ctx.stroke();
      }
      ctx.fillStyle = '#9aa0b4'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      const step = Math.max(1, Math.ceil(labels.length / 6));
      labels.forEach((lab,i)=>{ if(i%step===0 || i===labels.length-1){ const x=p+(w-p*2)*i/Math.max(1,labels.length-1); ctx.fillText(String(lab).replace('Lv.',''), x, h-8); }});
      datasets.forEach((ds,di)=>{
        const arr = ds.data || [];
        ctx.beginPath(); ctx.strokeStyle = ds.borderColor || ['#6c63ff','#00c9a7','#ff4757','#ffa502'][di%4]; ctx.lineWidth = 2;
        arr.forEach((v,i)=>{
          const x = p + (w-p*2)*i/Math.max(1,arr.length-1);
          const y = h-p - (Number(v)-min)/rng*(h-p*2);
          if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.stroke();
      });
    }
  }
  window.Chart = ChartLite;
})();
