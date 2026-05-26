<template>
  <div class="boss">
    <div class="boss-editor">
      <div class="boss-bar"><span class="d r"></span><span class="d y"></span><span class="d g"></span><span class="boss-t">📄 Q4_项目进度报告_v3_final.tsx — VS Code</span></div>
      <div class="boss-body">
        <div class="boss-side">
          <div class="bf ac">📁 src/</div>
          <div class="bf">  📄 index.tsx</div><div class="bf">  📄 utils.ts</div><div class="bf">  📄 api.ts</div>
          <div class="bf">📁 tests/</div><div class="bf">📄 package.json</div>
        </div>
        <div class="boss-main">
          <div class="boss-tabs"><span class="bt ac">Q4_项目进度报告.tsx</span><span class="bt">utils.ts</span></div>
          <div class="boss-code">
<pre><span class="kw">import</span> React, { useState } <span class="kw">from</span> <span class="st">'react'</span>;
<span class="kw">import</span> { DataGrid } <span class="kw">from</span> <span class="st">'@mui/x-data-grid'</span>;

<span class="kw">export default function</span> <span class="fn">QuarterlyReport</span>() {
  <span class="kw">const</span> [data, setData] = useState([]);
  <span class="kw">return</span> (&lt;<span class="fn">Card</span>&gt;&lt;<span class="fn">CardHeader</span> title=<span class="st">"Q4 业绩汇总"</span>/&gt;
    &lt;<span class="fn">DataGrid</span> rows={data} /&gt;&lt;/<span class="fn">Card</span>&gt;);
}</pre></div></div></div>
      <div class="boss-stat"><span>🟢 main</span><span>TS 5.4</span><span>Ln 42</span><span>UTF-8</span></div>
    </div>
  </div>
</template>

<style scoped>
.boss { position: absolute; inset: 0; z-index: 400; background: #1e1e1e; display: flex; }
.boss-editor { flex: 1; display: flex; flex-direction: column; font-family: Consolas, monospace; }
.boss-bar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #323233; font-size: 0.78rem; color: #bbb; }
.d { width: 10px; height: 10px; border-radius: 50%; }
.r { background: #ff5f57; } .y { background: #febc2e; } .g { background: #28c840; }
.boss-t { margin-left: 8px; }
.boss-body { flex: 1; display: flex; overflow: hidden; }
.boss-side { width: 180px; background: #252526; padding: 6px 0; flex-shrink: 0; }
.bf { padding: 2px 14px; font-size: 0.74rem; color: #999; }
.bf.ac { background: #37373d; color: #fff; }
.boss-main { flex: 1; display: flex; flex-direction: column; }
.boss-tabs { display: flex; background: #252526; font-size: 0.74rem; }
.bt { padding: 5px 14px; color: #888; border-right: 1px solid #1e1e1e; }
.bt.ac { background: #1e1e1e; color: #fff; border-top: 2px solid #ff4655; }
.boss-code { flex: 1; overflow-y: auto; padding: 10px 16px; font-size: 0.76rem; line-height: 1.6; color: #d4d4d4; }
.boss-code pre { margin: 0; white-space: pre-wrap; }
.kw { color: #569cd6; } .st { color: #ce9178; } .fn { color: #dcdcaa; }
.boss-stat { display: flex; gap: 14px; padding: 3px 10px; background: #007acc; font-size: 0.7rem; color: #fff; }
</style>
