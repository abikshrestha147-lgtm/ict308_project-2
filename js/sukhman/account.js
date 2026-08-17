/* Sukhman — customer account panel */
(function () {
  if (!Warners.requireRole(["customer"])) return;
  Warners.renderHeader("account");

  const params = new URLSearchParams(location.search);
  let selectedOrderId = params.get("order") || "";

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderOrders() {
    const orders = Warners.getCustomerOrders();
    const host = document.getElementById("orders-list");
    if (!orders.length) {
      host.innerHTML = `<div class="chart-empty">No orders yet. <a href="home.html">Start shopping</a> and check out to see them here.</div>`;
      return;
    }
    host.innerHTML = orders
      .map((order) => {
        const when = new Date(order.placedAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        const items = (order.items || [])
          .map((i) => `${i.qty}× ${esc(i.name)}`)
          .join(", ");
        const tracking = Warners.getOrderTracking(order);
        return `
          <article class="order-card">
            <div class="order-card-head">
              <div>
                <strong>${esc(order.id)}</strong>
                <div class="meta">${esc(when)}</div>
              </div>
              <div class="order-card-right">
                <span class="track-badge">${esc(tracking.status)}</span>
                <span class="price">${Warners.money(order.total)}</span>
              </div>
            </div>
            <p class="meta">${items}</p>
            <div class="detail-actions">
              <button class="btn btn-outline btn-sm" type="button" data-track="${esc(order.id)}">Track package</button>
            </div>
          </article>`;
      })
      .join("");
  }

  function renderTracking() {
    const orders = Warners.getCustomerOrders();
    const host = document.getElementById("tracking-list");
    if (!orders.length) {
      host.innerHTML = `<div class="chart-empty">Place an order first, then tracking will show up here.</div>`;
      return;
    }

    const list = selectedOrderId
      ? orders.filter((o) => o.id === selectedOrderId)
      : orders;

    host.innerHTML = list
      .map((order) => {
        const tracking = Warners.getOrderTracking(order);
        const steps = tracking.steps
          .map(
            (step) => `
            <li class="track-step ${step.done ? "done" : ""} ${step.current ? "current" : ""}">
              <span class="track-dot"></span>
              <div>
                <strong>${esc(step.label)}</strong>
                <div class="meta">${esc(step.detail)}</div>
              </div>
            </li>`
          )
          .join("");
        return `
          <article class="track-card ${order.id === selectedOrderId ? "selected" : ""}">
            <div class="track-card-head">
              <div>
                <strong>${esc(order.id)}</strong>
                <div class="meta">Tracking ${esc(tracking.trackingNumber)}</div>
              </div>
              <div class="meta">Est. delivery ${esc(tracking.eta)}</div>
            </div>
            <ol class="track-timeline">${steps}</ol>
          </article>`;
      })
      .join("");
  }

  function renderProfile() {
    const profile = Warners.getCustomerProfile();
    if (!profile) return;
    document.getElementById("profile-first").value = profile.firstName || "";
    document.getElementById("profile-last").value = profile.lastName || "";
    document.getElementById("profile-email").value = profile.email || "";
    document.getElementById("profile-phone").value = profile.phone || "";
    document.getElementById("profile-address").value = profile.address || "";
    document.getElementById("profile-city").value = profile.city || "";
    document.getElementById("profile-zip").value = profile.zip || "";
    document.getElementById("profile-country").value = profile.country || "";
  }

  function showTab(name) {
    ["orders", "tracking", "profile"].forEach((tab) => {
      document.getElementById(`view-${tab}`).hidden = tab !== name;
    });
    document.querySelectorAll(".customer-sidebar .side-link[data-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
    });
    Warners.renderHeader("account");
    if (name === "orders") renderOrders();
    if (name === "tracking") renderTracking();
    if (name === "profile") renderProfile();
  }

  document.querySelectorAll(".customer-sidebar .side-link[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab")));
  });

  document.getElementById("orders-list").addEventListener("click", (e) => {
    const id = e.target.getAttribute("data-track");
    if (!id) return;
    selectedOrderId = id;
    showTab("tracking");
  });

  document.getElementById("profile-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = document.getElementById("profile-msg");
    const result = Warners.updateCustomerProfile({
      firstName: document.getElementById("profile-first").value,
      lastName: document.getElementById("profile-last").value,
      email: document.getElementById("profile-email").value,
      phone: document.getElementById("profile-phone").value,
      address: document.getElementById("profile-address").value,
      city: document.getElementById("profile-city").value,
      zip: document.getElementById("profile-zip").value,
      country: document.getElementById("profile-country").value,
    });
    msg.textContent = result.ok ? "Profile saved." : result.error || "Could not save profile.";
    msg.style.color = result.ok ? "#059669" : "#dc2626";
    if (result.ok) Warners.renderHeader("account");
  });

  const hash = location.hash.replace("#", "");
  if (hash === "tracking" || hash === "profile") showTab(hash);
  else if (selectedOrderId) showTab("tracking");
  else showTab("orders");
})();
