/* Kushal — owner dashboard */
(function () {
  Warners.requireRole(["owner"]);

  const session = Warners.getSessionUser();
  const userLabel = session?.label || session?.name || "Owner";
  document.getElementById("owner-user-name").textContent = userLabel;
  document.getElementById("owner-avatar").textContent = String(userLabel).charAt(0).toUpperCase();
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", () => Warners.logout());
  });

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

  let openOwnerSettingsHub = () => {};

  function bindOwnerSettings() {
    const hub = document.getElementById("owner-settings-hub");
    const detail = document.getElementById("owner-settings-detail");
    const title = document.getElementById("owner-settings-title");
    const body = document.getElementById("owner-settings-body");
    if (!hub || !detail) return;

    function appearanceLabel(mode) {
      if (mode === "dark") return "Dark";
      if (mode === "light") return "Light";
      return "System";
    }

    function refreshHub() {
      const p = Warners.getStaffProfile();
      document.getElementById("owner-set-avatar").textContent = String(p.name || "O").charAt(0).toUpperCase();
      document.getElementById("owner-set-name").textContent = p.name;
      document.getElementById("owner-set-meta").textContent = [p.label, p.email].filter(Boolean).join(" · ");
      document.getElementById("owner-hub-personal").textContent = p.email || "Update details";
      document.getElementById("owner-hub-appearance").textContent = appearanceLabel(Warners.getAppearance());
      const userName = document.getElementById("owner-user-name");
      if (userName) userName.textContent = p.name;
      const avatar = document.getElementById("owner-avatar");
      if (avatar) avatar.textContent = String(p.name || "O").charAt(0).toUpperCase();
    }

    function showHub() {
      hub.hidden = false;
      detail.hidden = true;
      refreshHub();
      history.replaceState(null, "", "owner.html#settings");
    }

    function showScreen(name) {
      hub.hidden = true;
      detail.hidden = false;
      body.innerHTML = "";
      if (name === "personal") renderPersonal();
      if (name === "security") renderSecurity();
      if (name === "notifications") renderNotifications();
      if (name === "appearance") renderAppearance();
      history.replaceState(null, "", `owner.html#${name}`);
      Warners.animateView(body);
    }

    function renderPersonal() {
      const p = Warners.getStaffProfile();
      title.textContent = "Personal info";
      body.innerHTML = `
        <p class="settings-lead">Update the name and contact details on this owner account.</p>
        <form id="owner-form-personal" class="settings-form profile-form">
          <div class="form-grid">
            <div class="field field-span-2">
              <label for="owner-name">Display name</label>
              <input id="owner-name" required value="${p.name || ""}" />
            </div>
            <div class="field field-span-2">
              <label for="owner-email">Email</label>
              <input id="owner-email" type="email" required value="${p.email || ""}" />
            </div>
            <div class="field field-span-2">
              <label for="owner-phone">Phone number</label>
              <input id="owner-phone" type="tel" value="${p.phone || ""}" placeholder="e.g. 0412 345 678" />
            </div>
          </div>
          <button class="btn" type="submit">Save changes</button>
          <p class="meta settings-msg" id="owner-msg-personal"></p>
        </form>`;
      body.querySelector("#owner-form-personal").addEventListener("submit", (e) => {
        e.preventDefault();
        const result = Warners.saveStaffProfile({
          name: body.querySelector("#owner-name").value,
          email: body.querySelector("#owner-email").value,
          phone: body.querySelector("#owner-phone").value,
        });
        const msg = body.querySelector("#owner-msg-personal");
        msg.textContent = result.ok ? "Changes saved." : result.error || "Could not save.";
        msg.style.color = result.ok ? "#059669" : "#dc2626";
        if (result.ok) refreshHub();
      });
    }

    function renderSecurity() {
      title.textContent = "Security";
      body.innerHTML = `
        <p class="settings-lead">Change the password for this owner login.</p>
        <form id="owner-form-security" class="settings-form profile-form">
          <div class="form-grid">
            <div class="field field-span-2">
              <label for="owner-current-pass">Current password</label>
              <input id="owner-current-pass" type="password" required autocomplete="current-password" />
            </div>
            <div class="field field-span-2">
              <label for="owner-new-pass">New password</label>
              <input id="owner-new-pass" type="password" required minlength="4" autocomplete="new-password" />
            </div>
            <div class="field field-span-2">
              <label for="owner-confirm-pass">Confirm new password</label>
              <input id="owner-confirm-pass" type="password" required minlength="4" autocomplete="new-password" />
            </div>
          </div>
          <button class="btn" type="submit">Update password</button>
          <p class="meta settings-msg" id="owner-msg-security"></p>
        </form>`;
      body.querySelector("#owner-form-security").addEventListener("submit", (e) => {
        e.preventDefault();
        const msg = body.querySelector("#owner-msg-security");
        const next = body.querySelector("#owner-new-pass").value;
        const confirm = body.querySelector("#owner-confirm-pass").value;
        if (next !== confirm) {
          msg.textContent = "New passwords do not match.";
          msg.style.color = "#dc2626";
          return;
        }
        const result = Warners.updateStaffPassword(body.querySelector("#owner-current-pass").value, next);
        msg.textContent = result.ok ? "Password updated." : result.error || "Could not update.";
        msg.style.color = result.ok ? "#059669" : "#dc2626";
        if (result.ok) body.querySelector("#owner-form-security").reset();
      });
    }

    function renderNotifications() {
      const prefs = Warners.getStaffPrefs();
      title.textContent = "Notifications";
      body.innerHTML = `
        <p class="settings-lead">Choose which store alerts this owner account should receive.</p>
        <div class="settings-list settings-list--inset">
          <label class="settings-toggle-row">
            <span class="settings-toggle-copy">
              <strong>New orders</strong>
              <span class="meta">Alert when a customer completes checkout.</span>
            </span>
            <input type="checkbox" data-note="orders" ${prefs.notifications.orders ? "checked" : ""} />
          </label>
          <label class="settings-toggle-row">
            <span class="settings-toggle-copy">
              <strong>Low stock</strong>
              <span class="meta">Alert when catalogue items drop below 10 units.</span>
            </span>
            <input type="checkbox" data-note="stock" ${prefs.notifications.stock ? "checked" : ""} />
          </label>
          <label class="settings-toggle-row">
            <span class="settings-toggle-copy">
              <strong>New customers</strong>
              <span class="meta">Alert when someone creates a Warner account.</span>
            </span>
            <input type="checkbox" data-note="customers" ${prefs.notifications.customers ? "checked" : ""} />
          </label>
        </div>`;
      body.querySelectorAll("[data-note]").forEach((input) => {
        input.addEventListener("change", () => {
          Warners.saveStaffPrefs(
            { notifications: { [input.getAttribute("data-note")]: input.checked } },
            { silent: true }
          );
        });
      });
    }

    function renderAppearance() {
      title.textContent = "Appearance";
      body.innerHTML = `
        <p class="settings-lead">Customise how Warner Electronics looks for this owner account.</p>
        <div class="appearance-picker" id="owner-appearance"></div>
        <p class="meta">System matches your device light or dark preference.</p>`;
      Warners.bindAppearancePicker(body.querySelector("#owner-appearance"));
    }

    hub.querySelectorAll("[data-screen]").forEach((btn) => {
      btn.addEventListener("click", () => showScreen(btn.getAttribute("data-screen")));
    });
    hub.querySelectorAll("[data-jump]").forEach((btn) => {
      btn.addEventListener("click", () => showTab(btn.getAttribute("data-jump")));
    });
    document.getElementById("owner-settings-back").addEventListener("click", showHub);

    openOwnerSettingsHub = () => {
      const hash = location.hash.replace("#", "");
      if (["personal", "security", "notifications", "appearance"].includes(hash)) {
        showScreen(hash);
      } else {
        showHub();
      }
    };
  }

  function showTab(name) {
    ["overview", "people", "reports", "performance", "store", "settings"].forEach((t) => {
      document.getElementById(`view-${t}`).hidden = t !== name;
    });
    document.querySelectorAll(".admin-nav-link[data-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
    });
    if (name === "overview") renderOverview();
    if (name === "people") renderPeople();
    if (name === "reports") WarnersReports.renderSalesReports(document.getElementById("owner-reports"));
    if (name === "performance") WarnersReports.renderPerformance(document.getElementById("owner-performance"));
    if (name === "settings") openOwnerSettingsHub();
    Warners.animateView(document.getElementById(`view-${name}`));
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
  bindOwnerSettings();
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
  if (["personal", "security", "notifications", "appearance", "settings"].includes(hash)) {
    showTab("settings");
  } else if (["overview", "people", "reports", "performance", "store"].includes(hash)) {
    showTab(hash);
  }
})();
