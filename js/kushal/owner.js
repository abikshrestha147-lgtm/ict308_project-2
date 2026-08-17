/* Kushal — owner dashboard */
(function () {
  Warners.requireRole(["owner"]);

  const session = Warners.getSessionUser();
  const userLabel = session?.label || session?.name || "Owner";
  document.getElementById("owner-user-name").textContent = userLabel;
  document.getElementById("owner-avatar").textContent = String(userLabel).charAt(0).toUpperCase();
  document.querySelector("[data-logout]")?.addEventListener("click", () => Warners.logout());

  function customerSpend(username) {
    const key = String(username || "").toLowerCase();
    const orders = Warners.getOrders().filter(
      (o) => String(o.customerUsername || o.customer || "").toLowerCase() === key
    );
    return {
      orders: orders.length,
      spent: orders.reduce((s, o) => s + (Number(o.total) || 0), 0),
    };
  }

  function renderOverview() {
    const s = Warners.getReportSummary();
    const customers = Warners.getCustomers();
    const products = Warners.getProducts();
    const low = products.filter((p) => Number(p.stock) < 10);
    document.getElementById("owner-kpis").innerHTML = `
      <article class="admin-kpi"><span>Revenue</span><strong>${Warners.money(s.totalRevenue)}</strong><em>${Warners.money(s.weekRevenue)} this week</em></article>
      <article class="admin-kpi"><span>Orders</span><strong>${s.orderCount.toLocaleString()}</strong><em>${s.weekOrders} this week</em></article>
      <article class="admin-kpi"><span>Customers</span><strong>${customers.length}</strong><em>${customers.filter((c) => !c.disabled).length} active</em></article>
      <article class="admin-kpi"><span>Average order</span><strong>${Warners.money(s.avgOrder)}</strong><em>${s.itemsSold.toLocaleString()} units sold</em></article>`;

    document.getElementById("owner-recent").innerHTML = s.recent.length
      ? s.recent
          .slice(0, 8)
          .map(
            (o) => `
        <div class="admin-order">
          <div><strong>${o.id}</strong><span>${o.customer || "Customer"} · ${new Date(o.placedAt).toLocaleString()}</span></div>
          <strong>${Warners.money(o.total)}</strong>
        </div>`
          )
          .join("")
      : `<p class="admin-empty">No checkouts yet.</p>`;

    document.getElementById("owner-stock").innerHTML = low.length
      ? low
          .slice(0, 8)
          .map(
            (p) => `
        <div class="admin-alert">
          <div><strong>${p.name}</strong><span>${p.category} · ${p.stock} left</span></div>
          <strong>${Warners.money(p.price)}</strong>
        </div>`
          )
          .join("")
      : `<p class="admin-empty">Stock levels look healthy.</p>`;
  }

  function renderPeople() {
    const q = document.getElementById("owner-q").value.trim().toLowerCase();
    document.getElementById("owner-staff").innerHTML = `
      <article class="owner-person">
        <div><strong>Owner</strong><span>owner · full store access</span></div>
        <span class="admin-status"><i></i>Active</span>
      </article>
      <article class="owner-person">
        <div><strong>Admin</strong><span>admin · catalogue only</span></div>
        <span class="admin-status"><i></i>Active</span>
      </article>`;

    const list = Warners.getCustomers().filter((c) => {
      if (!q) return true;
      return (
        c.username.toLowerCase().includes(q) ||
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.email || "").toLowerCase().includes(q)
      );
    });
    document.getElementById("owner-people-count").textContent = `${list.length} shown`;
    document.getElementById("owner-people").innerHTML = list.length
      ? list
          .map((c) => {
            const stats = customerSpend(c.username);
            const paused = !!c.disabled;
            return `
          <article class="owner-person">
            <div>
              <strong>${c.name || c.username}</strong>
              <span>@${c.username} · ${stats.orders} orders · ${Warners.money(stats.spent)}</span>
            </div>
            <span class="admin-status${paused ? " out" : ""}"><i></i>${paused ? "Paused" : "Active"}</span>
            <button class="btn btn-outline btn-sm" type="button" data-toggle-user="${c.username}">
              ${paused ? "Restore" : "Pause access"}
            </button>
          </article>`;
          })
          .join("")
      : `<p class="admin-empty">No customer accounts match.</p>`;
  }

  function showTab(name) {
    ["overview", "people", "reports", "performance", "store"].forEach((t) => {
      document.getElementById(`view-${t}`).hidden = t !== name;
    });
    document.querySelectorAll(".admin-nav-link[data-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
    });
    if (name === "overview") renderOverview();
    if (name === "people") renderPeople();
    if (name === "reports") WarnersReports.renderSalesReports(document.getElementById("owner-reports"));
    if (name === "performance") WarnersReports.renderPerformance(document.getElementById("owner-performance"));
  }

  document.querySelectorAll(".admin-nav-link[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab")));
  });

  document.getElementById("owner-q").addEventListener("input", () => {
    showTab("people");
  });

  document.getElementById("owner-people").addEventListener("click", (e) => {
    const username = e.target.getAttribute("data-toggle-user");
    if (!username) return;
    const list = Warners.getCustomers();
    const customer = list.find((c) => c.username === username);
    if (!customer) return;
    customer.disabled = !customer.disabled;
    Warners.saveCustomers(list);
    Warners.toast(customer.disabled ? "Customer access paused" : "Customer access restored");
    renderPeople();
    renderOverview();
  });

  document.getElementById("owner-clear-orders").addEventListener("click", () => {
    if (!confirm("Clear all recorded orders and revenue?")) return;
    localStorage.removeItem("warners_orders");
    Warners.toast("Sales history cleared");
    renderOverview();
    if (!document.getElementById("view-reports").hidden) {
      WarnersReports.renderSalesReports(document.getElementById("owner-reports"));
    }
    if (!document.getElementById("view-performance").hidden) {
      WarnersReports.renderPerformance(document.getElementById("owner-performance"));
    }
  });

  renderOverview();
  renderPeople();
  window.addEventListener("storage", (e) => {
    if (e.key === "warners_orders" || e.key === "warners_customers") {
      renderOverview();
      if (!document.getElementById("view-people").hidden) renderPeople();
      if (!document.getElementById("view-reports").hidden) {
        WarnersReports.renderSalesReports(document.getElementById("owner-reports"));
      }
      if (!document.getElementById("view-performance").hidden) {
        WarnersReports.renderPerformance(document.getElementById("owner-performance"));
      }
    }
  });
  const hash = location.hash.replace("#", "");
  if (["overview", "people", "reports", "performance", "store"].includes(hash)) {
    showTab(hash);
  }
})();
