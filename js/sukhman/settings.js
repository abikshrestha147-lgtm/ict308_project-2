/* Sukhman — customer + guest settings (Uber-style hub) */
(function () {
  const role = Warners.getRole();
  if (role === "admin") {
    location.href = "admin.html#settings";
    return;
  }
  if (role === "owner") {
    location.href = "owner.html#settings";
    return;
  }

  const isGuest = !Warners.isLoggedIn();
  Warners.renderHeader("settings");

  const hub = document.getElementById("settings-hub");
  const detail = document.getElementById("settings-detail");
  const detailTitle = document.getElementById("settings-detail-title");
  const detailBody = document.getElementById("settings-detail-body");
  const screens = {
    personal: { title: "Personal info", render: renderPersonal, account: true },
    address: { title: "Delivery address", render: renderAddress, account: true },
    security: { title: "Security", render: renderSecurity, account: true },
    payment: { title: "Payment methods", render: renderPayment, account: true },
    notifications: { title: "Notifications", render: renderNotifications, account: true },
    communications: { title: "Communications", render: renderCommunications, account: true },
    appearance: { title: "Appearance", render: renderAppearance },
    privacy: { title: "Privacy settings", render: renderPrivacy },
  };

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function profile() {
    return Warners.getCustomerProfile() || {};
  }

  function settings() {
    return isGuest ? Warners.getGuestPrefs() : Warners.getCustomerSettings();
  }

  function appearanceLabel(mode) {
    if (mode === "dark") return "Dark";
    if (mode === "light") return "Light";
    return "System";
  }

  function shortAddress(p) {
    const parts = [p.city, p.country].filter(Boolean);
    return parts.join(", ") || "Add address";
  }

  function refreshHub() {
    document.querySelectorAll("[data-account-only]").forEach((el) => {
      el.hidden = isGuest;
    });
    document.querySelectorAll("[data-guest-only]").forEach((el) => {
      el.hidden = !isGuest;
    });

    const appearanceEl = document.getElementById("hub-appearance-summary");
    if (appearanceEl) appearanceEl.textContent = appearanceLabel(Warners.getAppearance());
    if (isGuest) return;

    const p = profile();
    const initial = (p.firstName || p.name || p.username || "W").charAt(0).toUpperCase();
    document.getElementById("settings-avatar").textContent = initial;
    document.getElementById("settings-profile-name").textContent =
      p.name || p.username || "Your account";
    const meta = [p.email || `${p.username}@email.com`, p.phone].filter(Boolean).join(" · ");
    document.getElementById("settings-profile-meta").textContent = meta || p.username || "";
    document.getElementById("hub-personal-summary").textContent = p.email || "Update details";
    document.getElementById("hub-address-summary").textContent = shortAddress(p);
  }

  function showHub() {
    hub.hidden = false;
    detail.hidden = true;
    refreshHub();
    history.replaceState(null, "", "settings.html");
  }

  function showScreen(name) {
    const screen = screens[name];
    if (!screen) return;
    if (screen.account && isGuest) {
      location.href = "login.html?next=settings.html";
      return;
    }
    hub.hidden = true;
    detail.hidden = false;
    detailTitle.textContent = screen.title;
    detailBody.innerHTML = "";
    screen.render(detailBody);
    history.replaceState(null, "", `settings.html#${name}`);
    Warners.animateView(detailBody);
  }

  function toggleRow(label, desc, key, group) {
    const s = settings();
    const checked = s[group]?.[key];
    return `
      <label class="settings-toggle-row">
        <span class="settings-toggle-copy">
          <strong>${esc(label)}</strong>
          ${desc ? `<span class="meta">${esc(desc)}</span>` : ""}
        </span>
        <input type="checkbox" data-toggle="${group}.${key}" ${checked ? "checked" : ""} />
      </label>`;
  }

  function renderPersonal(host) {
    const p = profile();
    host.innerHTML = `
      <p class="settings-lead">Update the name, email, and phone number on your Warner account.</p>
      <form id="form-personal" class="settings-form profile-form">
        <div class="form-grid">
          <div class="field">
            <label for="set-first">First name</label>
            <input id="set-first" required value="${esc(p.firstName)}" />
          </div>
          <div class="field">
            <label for="set-last">Last name</label>
            <input id="set-last" required value="${esc(p.lastName)}" />
          </div>
          <div class="field field-span-2">
            <label for="set-email">Email</label>
            <input id="set-email" type="email" required value="${esc(p.email)}" />
          </div>
          <div class="field field-span-2">
            <label for="set-phone">Phone number</label>
            <input id="set-phone" type="tel" value="${esc(p.phone)}" placeholder="e.g. 0412 345 678" />
          </div>
        </div>
        <button class="btn" type="submit">Save changes</button>
        <p class="meta settings-msg" id="msg-personal"></p>
      </form>`;

    host.querySelector("#form-personal").addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = host.querySelector("#msg-personal");
      const result = Warners.updateCustomerProfile({
        firstName: host.querySelector("#set-first").value,
        lastName: host.querySelector("#set-last").value,
        email: host.querySelector("#set-email").value,
        phone: host.querySelector("#set-phone").value,
      });
      msg.textContent = result.ok ? "Changes saved." : result.error || "Could not save.";
      msg.style.color = result.ok ? "#059669" : "#dc2626";
      if (result.ok) {
        refreshHub();
        Warners.renderHeader("settings");
      }
    });
  }

  function renderAddress(host) {
    const p = profile();
    host.innerHTML = `
      <p class="settings-lead">Your default delivery address for checkout and order updates.</p>
      <form id="form-address" class="settings-form profile-form">
        <div class="form-grid">
          <div class="field field-span-2">
            <label for="set-address">Street address</label>
            <input id="set-address" value="${esc(p.address)}" placeholder="Street and number" />
          </div>
          <div class="field">
            <label for="set-city">City</label>
            <input id="set-city" value="${esc(p.city)}" />
          </div>
          <div class="field">
            <label for="set-zip">Zip / postal code</label>
            <input id="set-zip" value="${esc(p.zip)}" />
          </div>
          <div class="field field-span-2">
            <label for="set-country">Country</label>
            <input id="set-country" value="${esc(p.country)}" placeholder="e.g. Australia" />
          </div>
        </div>
        <button class="btn" type="submit">Save address</button>
        <p class="meta settings-msg" id="msg-address"></p>
      </form>`;

    host.querySelector("#form-address").addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = host.querySelector("#msg-address");
      const result = Warners.updateCustomerProfile({
        address: host.querySelector("#set-address").value,
        city: host.querySelector("#set-city").value,
        zip: host.querySelector("#set-zip").value,
        country: host.querySelector("#set-country").value,
      });
      msg.textContent = result.ok ? "Address saved." : result.error || "Could not save.";
      msg.style.color = result.ok ? "#059669" : "#dc2626";
      if (result.ok) refreshHub();
    });
  }

  function renderSecurity(host) {
    host.innerHTML = `
      <p class="settings-lead">Change the password you use to sign in to Warner Electronics.</p>
      <form id="form-security" class="settings-form profile-form">
        <div class="form-grid">
          <div class="field field-span-2">
            <label for="set-current-pass">Current password</label>
            <input id="set-current-pass" type="password" required autocomplete="current-password" />
          </div>
          <div class="field field-span-2">
            <label for="set-new-pass">New password</label>
            <input id="set-new-pass" type="password" required minlength="4" autocomplete="new-password" />
          </div>
          <div class="field field-span-2">
            <label for="set-confirm-pass">Confirm new password</label>
            <input id="set-confirm-pass" type="password" required minlength="4" autocomplete="new-password" />
          </div>
        </div>
        <button class="btn" type="submit">Update password</button>
        <p class="meta settings-msg" id="msg-security"></p>
      </form>`;

    host.querySelector("#form-security").addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = host.querySelector("#msg-security");
      const current = host.querySelector("#set-current-pass").value;
      const next = host.querySelector("#set-new-pass").value;
      const confirm = host.querySelector("#set-confirm-pass").value;
      if (next !== confirm) {
        msg.textContent = "New passwords do not match.";
        msg.style.color = "#dc2626";
        return;
      }
      const result = Warners.updateCustomerPassword(current, next);
      msg.textContent = result.ok ? "Password updated." : result.error || "Could not update.";
      msg.style.color = result.ok ? "#059669" : "#dc2626";
      if (result.ok) host.querySelector("#form-security").reset();
    });
  }

  function renderPayment(host) {
    host.innerHTML = `
      <p class="settings-lead">Saved payment methods are used at checkout for faster purchases.</p>
      <div class="settings-list settings-list--inset">
        <div class="settings-row settings-row--static">
          <span class="settings-row-label">Visa ending in 4242</span>
          <span class="settings-row-value">Default</span>
        </div>
        <div class="settings-row settings-row--static">
          <span class="settings-row-label">Mastercard ending in 8210</span>
          <span class="settings-row-value">Backup</span>
        </div>
      </div>
      <button class="btn btn-outline" type="button" id="add-payment">Add payment method</button>
      <p class="meta">Demo cards for this project. Real payments are not processed.</p>`;

    host.querySelector("#add-payment").addEventListener("click", () => {
      Warners.toast("Payment methods can be added at checkout");
    });
  }

  function bindToggleForm(host, group) {
    host.querySelectorAll("[data-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        const [, key] = input.getAttribute("data-toggle").split(".");
        const partial = { [group]: { [key]: input.checked } };
        if (isGuest) Warners.saveGuestPrefs(partial, { silent: true });
        else Warners.saveCustomerSettings(partial, { silent: true });
      });
    });
  }

  function renderNotifications(host) {
    host.innerHTML = `
      <p class="settings-lead">Choose what Warner should notify you about.</p>
      <div class="settings-list settings-list--inset">
        ${toggleRow("Order updates", "Shipping, delivery, and order status changes.", "orders", "notifications")}
        ${toggleRow("Deals & offers", "Sales, coupons, and limited-time promotions.", "deals", "notifications")}
        ${toggleRow("Recommendations", "Product picks based on what you browse.", "recommendations", "notifications")}
      </div>`;
    bindToggleForm(host, "notifications");
  }

  function renderCommunications(host) {
    host.innerHTML = `
      <p class="settings-lead">Manage how Warner contacts you outside the app.</p>
      <div class="settings-list settings-list--inset">
        ${toggleRow("Email", "Receipts, order updates, and account messages.", "email", "communications")}
        ${toggleRow("SMS", "Delivery alerts sent to your mobile number.", "sms", "communications")}
        ${toggleRow("Marketing emails", "Newsletters and promotional campaigns.", "marketing", "communications")}
      </div>`;
    bindToggleForm(host, "communications");
  }

  function renderAppearance(host) {
    const current = Warners.getAppearance() || "system";
    host.innerHTML = `
      <p class="settings-lead">Customise how Warner Electronics looks on your device.</p>
      <div class="settings-list settings-list--inset settings-appearance">
        ${["light", "dark", "system"]
          .map(
            (mode) => `
          <label class="settings-choice-row">
            <span class="settings-row-label">${appearanceLabel(mode)}</span>
            <input type="radio" name="appearance" value="${mode}" ${current === mode ? "checked" : ""} />
          </label>`
          )
          .join("")}
      </div>
      <p class="meta">System matches your device light or dark preference.</p>`;

    host.querySelectorAll('input[name="appearance"]').forEach((input) => {
      input.addEventListener("change", () => {
        Warners.setAppearance(input.value, { silent: true });
        refreshHub();
      });
    });
  }

  function renderPrivacy(host) {
    host.innerHTML = `
      <p class="settings-lead">${
        isGuest
          ? "These choices stay on this browser until you sign in."
          : "Control how your data is used to personalise your experience."
      }</p>
      <div class="settings-list settings-list--inset">
        ${toggleRow("Personalised shopping", "Use browsing history to improve recommendations.", "personalization", "privacy")}
        ${toggleRow("Analytics", "Help Warner improve the store with anonymous usage data.", "analytics", "privacy")}
      </div>
      <a class="meta" href="support.html">Read our privacy policy</a>`;
    bindToggleForm(host, "privacy");
  }

  document.querySelectorAll("[data-screen]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.getAttribute("data-screen")));
  });

  document.getElementById("settings-back").addEventListener("click", showHub);

  document.getElementById("clear-search-history").addEventListener("click", () => {
    Warners.clearSearchHistory();
    Warners.toast("Search history cleared");
  });

  document.querySelector(".settings-signout")?.addEventListener("click", Warners.logout);

  const hash = location.hash.replace("#", "");
  if (hash && screens[hash]) showScreen(hash);
  else refreshHub();
})();
