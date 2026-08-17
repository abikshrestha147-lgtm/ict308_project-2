/* Kushal — live sales reports with charts */
(function () {
  const COLORS = ["#f47920", "#00adef", "#14b8a6", "#6366f1", "#eab308", "#f43f5e"];

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function money(n) {
    return Warners.money(Math.round(n || 0));
  }

  function areaChart(series, valueKey, color, formatMoney) {
    const w = 680;
    const h = 260;
    const pad = { l: 58, r: 18, t: 22, b: 38 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const max = Math.max(...series.map((s) => s[valueKey]), 1);
    const points = series.map((s, i) => {
      const x =
        pad.l + (series.length <= 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
      const y = pad.t + innerH - (s[valueKey] / max) * innerH;
      return { x, y, ...s };
    });
    const line = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const last = points[points.length - 1];
    const area = `M${points[0].x},${pad.t + innerH} ${points
      .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ")} L${last.x},${pad.t + innerH} Z`;
    const gid = "grad-" + valueKey + "-" + color.replace("#", "");
    const ticks = [0, 0.5, 1].map((t) => {
      const y = pad.t + innerH - t * innerH;
      const val = max * t;
      const label = formatMoney ? money(val) : String(Math.round(val));
      return `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" stroke="#e8eef5"/>
        <text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="11">${label}</text>`;
    }).join("");
    const labels = points
      .map((p, i) =>
        i % 2 === 0 || i === points.length - 1
          ? `<text x="${p.x}" y="${h - 12}" text-anchor="middle" fill="#64748b" font-size="11">${esc(p.label)}</text>`
          : ""
      )
      .join("");
    const dots = points
      .map(
        (p) =>
          `<circle cx="${p.x}" cy="${p.y}" r="3.6" fill="${color}" stroke="#fff" stroke-width="2"><title>${esc(p.label)}: ${formatMoney ? money(p[valueKey]) : p[valueKey]}</title></circle>`
      )
      .join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="chart-svg" role="img">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${ticks}
      <path d="${area}" fill="url(#${gid})"/>
      <path d="${line}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots}${labels}
    </svg>`;
  }

  function barChart(series, valueKey, color) {
    const w = 680;
    const h = 260;
    const pad = { l: 46, r: 16, t: 18, b: 38 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const max = Math.max(...series.map((s) => s[valueKey]), 1);
    const gap = 6;
    const barW = Math.max(8, innerW / series.length - gap);
    const ticks = [0, 0.5, 1].map((t) => {
      const y = pad.t + innerH - t * innerH;
      return `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y}" y2="${y}" stroke="#e8eef5"/>
        <text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="11">${Math.round(max * t)}</text>`;
    }).join("");
    const bars = series
      .map((s, i) => {
        const x = pad.l + i * (barW + gap) + gap / 2;
        const bh = (s[valueKey] / max) * innerH;
        const y = pad.t + innerH - bh;
        const label =
          i % 2 === 0 || i === series.length - 1
            ? `<text x="${x + barW / 2}" y="${h - 12}" text-anchor="middle" fill="#64748b" font-size="11">${esc(s.label)}</text>`
            : "";
        return `<rect x="${x}" y="${y}" width="${barW}" height="${Math.max(bh, s[valueKey] ? 3 : 0)}" rx="5" fill="${color}">
          <title>${esc(s.label)}: ${s[valueKey]} orders</title>
        </rect>${label}`;
      })
      .join("");
    return `<svg viewBox="0 0 ${w} ${h}" class="chart-svg" role="img">${ticks}${bars}</svg>`;
  }

  function donutChart(segments) {
    const total = segments.reduce((s, x) => s + x.revenue, 0);
    if (!total) {
      return `<div class="chart-empty">No category sales yet</div>`;
    }
    const r = 58;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    const rings = segments
      .map((seg, i) => {
        const len = (seg.revenue / total) * circ;
        const color = COLORS[i % COLORS.length];
        const circle = `<circle cx="80" cy="80" r="${r}" fill="none" stroke="${color}" stroke-width="22"
          stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)">
          <title>${esc(seg.name)}: ${money(seg.revenue)}</title>
        </circle>`;
        offset += len;
        return circle;
      })
      .join("");
    const legend = segments
      .map(
        (seg, i) => `
        <li>
          <span class="swatch" style="background:${COLORS[i % COLORS.length]}"></span>
          <span>${esc(seg.name)}</span>
          <strong>${money(seg.revenue)}</strong>
        </li>`
      )
      .join("");
    return `<div class="donut-wrap">
      <svg viewBox="0 0 160 160" class="donut-svg" role="img">
        <circle cx="80" cy="80" r="${r}" fill="none" stroke="#eef2f7" stroke-width="22"/>
        ${rings}
        <text x="80" y="76" text-anchor="middle" fill="#0f172a" font-size="13" font-weight="700">Revenue</text>
        <text x="80" y="94" text-anchor="middle" fill="#64748b" font-size="11">by category</text>
      </svg>
      <ul class="chart-legend">${legend}</ul>
    </div>`;
  }

  function hBars(items, valueKey, formatMoney) {
    const max = Math.max(...items.map((i) => i[valueKey]), 1);
    if (!items.length) return `<div class="chart-empty">No product sales yet</div>`;
    return `<div class="hbar-list">${items
      .map((item, i) => {
        const pct = Math.max(6, (item[valueKey] / max) * 100);
        return `<div class="hbar-row">
          <span class="hbar-label">${esc(item.name)}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${COLORS[i % COLORS.length]}"></div></div>
          <strong>${formatMoney ? money(item[valueKey]) : item[valueKey]}</strong>
        </div>`;
      })
      .join("")}</div>`;
  }

  function recentTable(orders) {
    if (!orders.length) {
      return `<div class="chart-empty">No orders yet. When a customer checks out, that order and its total are added here automatically.</div>`;
    }
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>Order</th><th>When</th><th>Customer</th><th>Items</th><th>Total</th></tr></thead>
      <tbody>${orders
        .map((o) => {
          const when = new Date(o.placedAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });
          const names = (o.items || []).map((i) => `${i.qty}× ${i.name}`).join(", ");
          return `<tr>
            <td><strong>${esc(o.id)}</strong></td>
            <td>${esc(when)}</td>
            <td>${esc(o.customer)}</td>
            <td class="meta">${esc(names)}</td>
            <td class="price">${money(o.total)}</td>
          </tr>`;
        })
        .join("")}</tbody>
    </table></div>`;
  }

  function renderSalesReports(host) {
    if (!host) return;
    const s = Warners.getReportSummary();
    const last = s.recent[0];
    const lastLine = last
      ? `Last order ${last.id} added ${new Date(last.placedAt).toLocaleString()} for ${money(last.total)}.`
      : "Waiting for the first checkout.";
    host.innerHTML = `
      <div class="reports-head">
        <div>
          <h2>Sales reports</h2>
          <p class="meta">Running totals from real checkouts — each order adds to orders placed and revenue earned. Not sample data.</p>
          <p class="meta">${lastLine}</p>
        </div>
      </div>
      <div class="kpi-grid">
        <article class="kpi">
          <span>Orders placed</span>
          <strong>${s.orderCount.toLocaleString()}</strong>
          <em>${s.weekOrders} this week</em>
        </article>
        <article class="kpi kpi-orange">
          <span>Revenue earned</span>
          <strong>${money(s.totalRevenue)}</strong>
          <em>${money(s.weekRevenue)} this week</em>
        </article>
        <article class="kpi kpi-cyan">
          <span>Average order</span>
          <strong>${money(s.avgOrder)}</strong>
          <em>${s.itemsSold.toLocaleString()} units sold</em>
        </article>
        <article class="kpi">
          <span>Items per order</span>
          <strong>${s.orderCount ? (s.itemsSold / s.orderCount).toFixed(1) : "0"}</strong>
          <em>across all completed checkouts</em>
        </article>
      </div>
      <div class="chart-grid">
        <section class="chart-card">
          <h3>Revenue over time</h3>
          <p class="meta">Daily totals for the last 14 days</p>
          ${areaChart(s.days, "revenue", "#f47920", true)}
        </section>
        <section class="chart-card">
          <h3>Orders placed</h3>
          <p class="meta">How many checkouts completed each day</p>
          ${barChart(s.days, "orders", "#00adef")}
        </section>
      </div>
      <div class="chart-grid">
        <section class="chart-card">
          <h3>Revenue by category</h3>
          ${donutChart(s.categories)}
        </section>
        <section class="chart-card">
          <h3>Top products by revenue</h3>
          ${hBars(s.topProducts, "revenue", true)}
        </section>
      </div>
      <section class="chart-card">
        <h3>Recent orders</h3>
        ${recentTable(s.recent)}
      </section>`;
  }

  function renderPerformance(host) {
    if (!host) return;
    const s = Warners.getReportSummary();
    host.innerHTML = `
      <div class="reports-head">
        <div>
          <h2>Sales mix</h2>
          <p class="meta">Where revenue is coming from. Each checkout updates these charts.</p>
        </div>
      </div>
      <div class="kpi-grid">
        <article class="kpi kpi-orange">
          <span>Total revenue</span>
          <strong>${money(s.totalRevenue)}</strong>
        </article>
        <article class="kpi kpi-cyan">
          <span>Orders</span>
          <strong>${s.orderCount.toLocaleString()}</strong>
        </article>
        <article class="kpi">
          <span>Units sold</span>
          <strong>${s.itemsSold.toLocaleString()}</strong>
        </article>
      </div>
      <div class="chart-grid">
        <section class="chart-card">
          <h3>Category share</h3>
          ${donutChart(s.categories)}
        </section>
        <section class="chart-card">
          <h3>Best sellers</h3>
          ${hBars(s.topProducts, "qty", false)}
        </section>
      </div>`;
  }

  window.WarnersReports = { renderSalesReports, renderPerformance };
})();
