(function () {
  const ROLE_KEY = "warners_role";
  const AUTH_KEY = "warners_auth";
  const USER_KEY = "warners_user";
  const CART_KEY = "warners_cart";
  const PRODUCTS_KEY = "warners_products";
  const CATEGORIES_KEY = "warners_categories";
  const VIEWED_KEY = "warners_viewed";
  const PURCHASED_KEY = "warners_purchased";
  const ORDERS_KEY = "warners_orders";
  const CUSTOMERS_KEY = "warners_customers";
  const SEARCH_HISTORY_KEY = "warners_search_history";
  const MAX_SEARCH_HISTORY = 12;

  function getRole() {
    const auth = localStorage.getItem(AUTH_KEY);
    if (auth === "guest") {
      clearSession();
      return null;
    }
    if (auth !== "1") return null;
    return localStorage.getItem(ROLE_KEY);
  }

  function setRole(role) {
    localStorage.setItem(ROLE_KEY, role);
  }

  function clearSession() {
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function isLoggedIn() {
    return localStorage.getItem(AUTH_KEY) === "1" && !!localStorage.getItem(ROLE_KEY);
  }

  function hasAccountSession() {
    return isLoggedIn();
  }

  function isCustomer() {
    return hasAccountSession() && getRole() === "customer";
  }

  function getSessionUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  }

  function getCustomers() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveCustomers(list) {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(list));
  }

  function registerCustomer({ username, password, name }) {
    const user = String(username || "").trim().toLowerCase();
    const pass = String(password || "");
    const display = String(name || "").trim() || user;
    if (!user || !pass) return { ok: false, error: "Username and password are required." };
    if (pass.length < 4) return { ok: false, error: "Password must be at least 4 characters." };
    if (window.WARNERS_USERS[user]) {
      return { ok: false, error: "That username is reserved. Choose another." };
    }
    const list = getCustomers();
    if (list.some((c) => c.username === user)) {
      return { ok: false, error: "An account with that username already exists." };
    }
    list.push({
      username: user,
      password: pass,
      name: display,
      firstName: display.split(/\s+/)[0] || "",
      lastName: display.split(/\s+/).slice(1).join(" ") || "",
      email: "",
      phone: "",
      address: "",
      city: "",
      zip: "",
      country: "",
      role: "customer",
      createdAt: Date.now(),
    });
    saveCustomers(list);
    return { ok: true };
  }

  function ensureData() {
    if (!localStorage.getItem(PRODUCTS_KEY)) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(window.WARNERS_PRODUCTS));
    }
    if (!localStorage.getItem(CATEGORIES_KEY)) {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(window.WARNERS_CATEGORIES));
    }
  }

  function getProducts() {
    ensureData();
    try {
      return JSON.parse(localStorage.getItem(PRODUCTS_KEY));
    } catch {
      return window.WARNERS_PRODUCTS.slice();
    }
  }

  function saveProducts(list) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(list));
  }

  function getCategories() {
    ensureData();
    try {
      return JSON.parse(localStorage.getItem(CATEGORIES_KEY));
    } catch {
      return window.WARNERS_CATEGORIES.slice();
    }
  }

  function saveCategories(list) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }

  function cartCount() {
    return getCart().reduce((n, i) => n + i.qty, 0);
  }

  function addToCart(productId, qty) {
    const p = productById(productId);
    const stock = availableStock(productId);
    const cart = getCart();
    const found = cart.find((i) => i.id === productId);
    const currentQty = found ? found.qty : 0;
    const requested = qty || 1;

    if (stock <= currentQty) {
      toast(`${p?.name || "Item"} is out of stock`);
      return;
    }

    const toAdd = Math.min(requested, stock - currentQty);
    if (found) found.qty += toAdd;
    else cart.push({ id: productId, qty: toAdd });
    saveCart(cart);
    trackView(productId);
    if (toAdd < requested) {
      toast(`Only ${toAdd} added — ${stock} in stock`);
    } else {
      const recs = getRecommendations(productId).slice(0, 2);
      if (recs.length) {
        toast("Added to cart · Recommended: " + recs.map((r) => r.name).join(", "));
      } else {
        toast("Added to cart");
      }
    }
  }

  function trackView(productId) {
    if (!productId) return;
    let viewed = [];
    try {
      viewed = JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]");
    } catch {
      viewed = [];
    }
    viewed = [productId, ...viewed.filter((id) => id !== productId)].slice(0, 12);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(viewed));
  }

  function getViewedIds() {
    try {
      return JSON.parse(localStorage.getItem(VIEWED_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function searchHistoryKey() {
    const session = getSessionUser();
    if (session?.username) return `${SEARCH_HISTORY_KEY}_${session.username}`;
    return SEARCH_HISTORY_KEY;
  }

  function getSearchHistory() {
    try {
      return JSON.parse(localStorage.getItem(searchHistoryKey()) || "[]");
    } catch {
      return [];
    }
  }

  function recordSearch(query) {
    const q = String(query || "").trim();
    if (!q || q.length < 2) return;
    const list = getSearchHistory().filter((item) => item.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    localStorage.setItem(searchHistoryKey(), JSON.stringify(list.slice(0, MAX_SEARCH_HISTORY)));
  }

  function removeSearchHistoryItem(query) {
    const key = String(query || "").trim().toLowerCase();
    const list = getSearchHistory().filter((item) => item.toLowerCase() !== key);
    localStorage.setItem(searchHistoryKey(), JSON.stringify(list));
  }

  function clearSearchHistory() {
    localStorage.removeItem(searchHistoryKey());
  }

  function bindSearchHistory(input, panel, { onSearch, onQueryChange, liveProducts = true } = {}) {
    if (!input || !panel) return { hide: () => {} };

    function hideSuggestions() {
      panel.hidden = true;
    }

    function notifyQueryChange() {
      const q = input.value.trim();
      const products =
        q && liveProducts ? filterProducts({ q }).slice(0, 8) : [];
      onQueryChange?.(q, products);
    }

    function renderSuggestions() {
      const q = input.value.trim();
      const qLower = q.toLowerCase();
      const history = getSearchHistory();
      const recentSearches = history.slice(0, MAX_SEARCH_HISTORY);
      const products =
        qLower.length >= 1 && liveProducts
          ? filterProducts({ q: qLower }).slice(0, 6)
          : [];

      notifyQueryChange();

      if (!recentSearches.length && !products.length) {
        hideSuggestions();
        panel.innerHTML = "";
        return;
      }

      panel._suggestItems = recentSearches;
      let html = `<div class="search-suggest-panel">`;

      if (recentSearches.length) {
        html += `
        <section class="search-suggest-section">
          <div class="search-suggest-head">Recent searches</div>
          ${recentSearches
            .map(
              (item, i) => `
            <div class="search-suggest-item" role="option">
              <button type="button" class="search-suggest-pick" data-idx="${i}">
                <span class="search-suggest-ico" aria-hidden="true">↺</span>
                <span class="search-suggest-text">${escHtml(item)}</span>
              </button>
              <button type="button" class="search-suggest-remove" data-idx="${i}" aria-label="Remove from history">×</button>
            </div>`
            )
            .join("")}
        </section>`;
      }

      if (products.length) {
        html += `
        <section class="search-suggest-section search-suggest-section--products">
          <div class="search-suggest-head">Products</div>
          ${products
            .map(
              (p) => `
            <div class="search-suggest-item search-suggest-item--product" role="option">
              <a class="search-suggest-pick search-suggest-product" href="product.html?id=${encodeURIComponent(p.id)}">
                <span class="search-suggest-ico" aria-hidden="true">⌕</span>
                <span class="search-suggest-text">${escHtml(p.name)}</span>
              </a>
            </div>`
            )
            .join("")}
        </section>`;
      }

      html += `<div class="search-suggest-foot">`;
      if (q && products.length) {
        html += `<button type="button" class="search-suggest-view-all">View all results for “${escHtml(q)}”</button>`;
      }
      if (recentSearches.length) {
        html += `<button type="button" class="search-suggest-clear">Clear recent searches</button>`;
      }
      html += `</div></div>`;

      panel.innerHTML = html;
      panel.hidden = false;
    }

    input.addEventListener("focus", renderSuggestions);
    input.addEventListener("input", renderSuggestions);
    input.addEventListener("blur", () => {
      setTimeout(hideSuggestions, 160);
    });

    panel.addEventListener("mousedown", (e) => {
      if (
        e.target.closest(
          ".search-suggest-remove, .search-suggest-pick, .search-suggest-clear, .search-suggest-view-all"
        )
      ) {
        e.preventDefault();
      }
    });

    panel.addEventListener("click", (e) => {
      const removeBtn = e.target.closest(".search-suggest-remove");
      if (removeBtn) {
        const item = panel._suggestItems?.[Number(removeBtn.getAttribute("data-idx"))];
        if (item) removeSearchHistoryItem(item);
        renderSuggestions();
        return;
      }
      if (e.target.closest(".search-suggest-clear")) {
        clearSearchHistory();
        hideSuggestions();
        panel.innerHTML = "";
        notifyQueryChange();
        return;
      }
      if (e.target.closest(".search-suggest-view-all")) {
        const query = input.value.trim();
        if (query) recordSearch(query);
        hideSuggestions();
        onSearch?.();
        return;
      }
      const pick = e.target.closest(".search-suggest-pick");
      if (pick && pick.tagName === "BUTTON") {
        const item = panel._suggestItems?.[Number(pick.getAttribute("data-idx"))];
        if (!item) return;
        input.value = item;
        recordSearch(item);
        hideSuggestions();
        onSearch?.();
      }
    });

    return { hide: hideSuggestions, refresh: renderSuggestions };
  }

  function escHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getFirstName(session) {
    if (!session) return "";
    const customer =
      session.username && getRole() === "customer"
        ? getCustomers().find((c) => c.username === session.username)
        : null;
    const source =
      customer?.firstName ||
      session.name ||
      session.label ||
      session.username ||
      "";
    const first = String(source).trim().split(/\s+/)[0];
    if (!first) return "there";
    return first.charAt(0).toUpperCase() + first.slice(1);
  }

  function getPurchasedIds() {
    try {
      return JSON.parse(localStorage.getItem(PURCHASED_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function recordPurchase(ids) {
    const incoming = (ids || []).filter(Boolean);
    if (!incoming.length) return;
    const prev = getPurchasedIds();
    localStorage.setItem(
      PURCHASED_KEY,
      JSON.stringify([...incoming, ...prev.filter((id) => !incoming.includes(id))].slice(0, 24))
    );
  }

  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveOrders(list) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(list));
  }

  function placeOrder(checkout) {
    const cart = getCart();
    if (!cart.length) return { ok: false, error: "Cart is empty." };

    const items = cart
      .map((i) => {
        const p = productById(i.id) || {};
        const qty = Math.max(1, Number(i.qty) || 1);
        const price = Number(p.price != null ? p.price : i.price) || 0;
        return {
          id: i.id || p.id,
          name: p.name || i.name || i.id || "Item",
          category: p.category || i.category || "Other",
          qty,
          price,
          lineTotal: price * qty,
        };
      })
      .filter((i) => i.id && i.qty > 0);
    if (!items.length) return { ok: false, error: "Cart is empty." };

    const stockCheck = validateCartStock(cart);
    if (!stockCheck.ok) return stockCheck;

    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const discount = subtotal > 1000 ? 25 : 0;
    const shippingCost = Number(checkout?.shippingCost) || 0;
    const total = Math.max(0, subtotal - discount + shippingCost);
    const session = getSessionUser();
    const orderId = "WE-" + Date.now().toString().slice(-8);
    const order = {
      id: orderId,
      placedAt: Date.now(),
      items,
      itemCount: items.reduce((n, i) => n + i.qty, 0),
      subtotal,
      discount,
      shippingCost,
      total,
      customer: session?.name || session?.username || getRole() || "Customer",
      customerUsername: session?.username || null,
      trackingNumber: "TRK-" + orderId.replace("WE-", ""),
      billing: checkout?.billing || null,
      shippingAddress: checkout?.shippingAddress || null,
      shippingMethod: checkout?.shippingMethod || "standard",
      paymentMethod: checkout?.paymentMethod || "card",
    };
    const orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);
    deductStock(items);
    recordPurchase(items.map((i) => i.id));
    saveCart([]);
    return { ok: true, order, summary: getReportSummary() };
  }

  function getCurrentCustomerUsername() {
    const session = getSessionUser();
    if (!isCustomer() || !session?.username) return null;
    return session.username;
  }

  function orderBelongsToCustomer(order, username, session) {
    const user = String(username || "").toLowerCase();
    if (order.customerUsername && order.customerUsername.toLowerCase() === user) return true;
    const name = String(session?.name || "").toLowerCase();
    const cust = String(order.customer || "").toLowerCase();
    return cust === user || cust === name;
  }

  function getCustomerOrders() {
    const username = getCurrentCustomerUsername();
    const session = getSessionUser();
    if (!username) return [];
    return getOrders().filter((o) => orderBelongsToCustomer(o, username, session));
  }

  function getCustomerProfile() {
    const username = getCurrentCustomerUsername();
    if (!username) return null;
    const customer = getCustomers().find((c) => c.username === username);
    if (!customer) return null;
    const name = customer.name || "";
    const parts = name.split(/\s+/);
    return {
      username: customer.username,
      name,
      firstName: customer.firstName || parts[0] || "",
      lastName: customer.lastName || parts.slice(1).join(" ") || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      zip: customer.zip || "",
      country: customer.country || "",
    };
  }

  function updateCustomerProfile(data, options) {
    const username = getCurrentCustomerUsername();
    if (!username) return { ok: false, error: "You must be logged in as a customer." };
    const list = getCustomers();
    const index = list.findIndex((c) => c.username === username);
    if (index < 0) return { ok: false, error: "Account not found." };
    const customer = list[index];
    if (data.firstName !== undefined) customer.firstName = String(data.firstName || "").trim();
    if (data.lastName !== undefined) customer.lastName = String(data.lastName || "").trim();
    if (data.email !== undefined) customer.email = String(data.email || "").trim();
    if (data.phone !== undefined) customer.phone = String(data.phone || "").trim();
    if (data.address !== undefined) customer.address = String(data.address || "").trim();
    if (data.city !== undefined) customer.city = String(data.city || "").trim();
    if (data.zip !== undefined) customer.zip = String(data.zip || "").trim();
    if (data.country !== undefined) customer.country = String(data.country || "").trim();
    if (data.name) customer.name = String(data.name).trim();
    const combined = `${customer.firstName || ""} ${customer.lastName || ""}`.trim();
    if (combined) customer.name = combined;
    saveCustomers(list);
    const session = getSessionUser();
    if (session) {
      session.name = customer.name;
      localStorage.setItem(USER_KEY, JSON.stringify(session));
    }
    if (!options?.silent) toast("Profile updated");
    return { ok: true, profile: getCustomerProfile() };
  }

  function defaultCustomerSettings() {
    return {
      notifications: { orders: true, deals: true, recommendations: true },
      communications: { email: true, sms: false, marketing: false },
      privacy: { personalization: true, analytics: true },
      appearance: "system",
    };
  }

  function getCustomerSettings() {
    const username = getCurrentCustomerUsername();
    if (!username) return defaultCustomerSettings();
    const customer = getCustomers().find((c) => c.username === username);
    const saved = customer?.settings || {};
    return {
      ...defaultCustomerSettings(),
      ...saved,
      notifications: { ...defaultCustomerSettings().notifications, ...(saved.notifications || {}) },
      communications: { ...defaultCustomerSettings().communications, ...(saved.communications || {}) },
      privacy: { ...defaultCustomerSettings().privacy, ...(saved.privacy || {}) },
    };
  }

  function saveCustomerSettings(partial, options) {
    const username = getCurrentCustomerUsername();
    if (!username) return { ok: false, error: "You must be logged in as a customer." };
    const list = getCustomers();
    const index = list.findIndex((c) => c.username === username);
    if (index < 0) return { ok: false, error: "Account not found." };
    const customer = list[index];
    const current = getCustomerSettings();
    const next = {
      ...current,
      ...partial,
      notifications: { ...current.notifications, ...(partial.notifications || {}) },
      communications: { ...current.communications, ...(partial.communications || {}) },
      privacy: { ...current.privacy, ...(partial.privacy || {}) },
    };
    customer.settings = next;
    saveCustomers(list);
    applyAppearance();
    if (!options?.silent) toast("Settings saved");
    return { ok: true, settings: next };
  }

  function appearanceStorageKey() {
    const session = getSessionUser();
    const user = session?.username || getRole() || "guest";
    return `warners_appearance_${user}`;
  }

  function getAppearance() {
    if (getRole() === "customer") {
      return getCustomerSettings().appearance || "system";
    }
    try {
      const saved = localStorage.getItem(appearanceStorageKey());
      if (saved) return saved;
      return isLoggedIn() ? "system" : "light";
    } catch {
      return isLoggedIn() ? "system" : "light";
    }
  }

  function setAppearance(mode, options) {
    const value = ["light", "dark", "system"].includes(mode) ? mode : "system";
    if (getRole() === "customer") {
      return saveCustomerSettings({ appearance: value }, { silent: options?.silent });
    }
    localStorage.setItem(appearanceStorageKey(), value);
    applyAppearance();
    if (!options?.silent) toast("Appearance updated");
    return { ok: true, appearance: value };
  }

  function defaultGuestPrefs() {
    return { privacy: { personalization: true, analytics: true } };
  }

  function getGuestPrefs() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem("warners_guest_prefs") || "{}");
    } catch {
      saved = {};
    }
    return {
      ...defaultGuestPrefs(),
      ...saved,
      privacy: { ...defaultGuestPrefs().privacy, ...(saved.privacy || {}) },
    };
  }

  function saveGuestPrefs(partial, options) {
    const current = getGuestPrefs();
    const next = {
      ...current,
      ...partial,
      privacy: { ...current.privacy, ...(partial.privacy || {}) },
    };
    localStorage.setItem("warners_guest_prefs", JSON.stringify(next));
    if (!options?.silent) toast("Settings saved");
    return { ok: true, settings: next };
  }

  function appearanceLabel(mode) {
    if (mode === "dark") return "Dark";
    if (mode === "light") return "Light";
    return "System";
  }

  function bindAppearancePicker(host) {
    if (!host) return;
    const current = getAppearance();
    host.innerHTML = ["light", "dark", "system"]
      .map(
        (mode) => `
        <label class="appearance-choice ${current === mode ? "is-selected" : ""}">
          <input type="radio" name="appearance" value="${mode}" ${current === mode ? "checked" : ""} />
          <span>
            <strong>${appearanceLabel(mode)}</strong>
            <em>${
              mode === "light"
                ? "Bright backgrounds and dark text"
                : mode === "dark"
                  ? "Dark backgrounds and light text"
                  : "Match this device’s light or dark setting"
            }</em>
          </span>
        </label>`
      )
      .join("");
    host.querySelectorAll('input[name="appearance"]').forEach((input) => {
      input.addEventListener("change", () => {
        setAppearance(input.value, { silent: true });
        host.querySelectorAll(".appearance-choice").forEach((row) => {
          row.classList.toggle("is-selected", row.querySelector("input")?.checked);
        });
      });
    });
  }

  function applyAppearance() {
    let mode = getAppearance() || "system";
    if (mode === "system") {
      mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", mode);
  }

  function applyCustomerAppearance() {
    applyAppearance();
  }

  function staffStorageUser() {
    const session = getSessionUser();
    return session?.username || getRole() || "staff";
  }

  function defaultStaffPrefs() {
    return { notifications: { orders: true, stock: true, customers: true } };
  }

  function getStaffProfile() {
    const session = getSessionUser();
    const role = getRole();
    const username = staffStorageUser();
    const staff = window.WARNERS_USERS?.[username] || {};
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(`warners_staff_profile_${username}`) || "{}");
    } catch {
      saved = {};
    }
    const name = saved.name || session?.name || staff.label || username;
    return {
      username,
      role,
      name,
      email: saved.email || `${username}@warnerelectronics.com`,
      phone: saved.phone || "",
      label: role === "owner" ? "Store owner" : "Catalogue manager",
    };
  }

  function saveStaffProfile(data, options) {
    const username = staffStorageUser();
    if (!username || (getRole() !== "admin" && getRole() !== "owner")) {
      return { ok: false, error: "Staff login required." };
    }
    const current = getStaffProfile();
    const next = {
      name: String(data.name ?? current.name).trim() || current.name,
      email: String(data.email ?? current.email).trim(),
      phone: String(data.phone ?? current.phone).trim(),
    };
    localStorage.setItem(`warners_staff_profile_${username}`, JSON.stringify(next));
    const session = getSessionUser();
    if (session) {
      session.name = next.name;
      session.label = next.name;
      localStorage.setItem(USER_KEY, JSON.stringify(session));
    }
    if (!options?.silent) toast("Profile updated");
    return { ok: true, profile: getStaffProfile() };
  }

  function getStaffPrefs() {
    const username = staffStorageUser();
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(`warners_staff_prefs_${username}`) || "{}");
    } catch {
      saved = {};
    }
    return {
      ...defaultStaffPrefs(),
      ...saved,
      notifications: { ...defaultStaffPrefs().notifications, ...(saved.notifications || {}) },
    };
  }

  function saveStaffPrefs(partial, options) {
    const username = staffStorageUser();
    const current = getStaffPrefs();
    const next = {
      ...current,
      ...partial,
      notifications: { ...current.notifications, ...(partial.notifications || {}) },
    };
    localStorage.setItem(`warners_staff_prefs_${username}`, JSON.stringify(next));
    if (!options?.silent) toast("Settings saved");
    return { ok: true, settings: next };
  }

  function getStaffPassword(username) {
    const key = String(username || "").trim().toLowerCase();
    return localStorage.getItem(`warners_staff_pass_${key}`) || window.WARNERS_USERS?.[key]?.password || "";
  }

  function updateStaffPassword(currentPassword, newPassword) {
    const username = staffStorageUser();
    const pass = String(newPassword || "");
    if (pass.length < 4) return { ok: false, error: "Password must be at least 4 characters." };
    if (getStaffPassword(username) !== String(currentPassword || "")) {
      return { ok: false, error: "Current password is incorrect." };
    }
    localStorage.setItem(`warners_staff_pass_${username}`, pass);
    toast("Password updated");
    return { ok: true };
  }

  function updateCustomerPassword(currentPassword, newPassword) {
    const username = getCurrentCustomerUsername();
    if (!username) return { ok: false, error: "You must be logged in." };
    const pass = String(newPassword || "");
    if (pass.length < 4) return { ok: false, error: "Password must be at least 4 characters." };
    const list = getCustomers();
    const customer = list.find((c) => c.username === username);
    if (!customer || customer.password !== String(currentPassword || "")) {
      return { ok: false, error: "Current password is incorrect." };
    }
    customer.password = pass;
    saveCustomers(list);
    toast("Password updated");
    return { ok: true };
  }

  function getOrderTracking(order) {
    const hours = (Date.now() - (order.placedAt || Date.now())) / (1000 * 60 * 60);
    const steps = [
      { label: "Order placed", detail: "We received your order." },
      { label: "Processing", detail: "Items are being picked and packed." },
      { label: "Shipped", detail: "Left our warehouse." },
      { label: "Out for delivery", detail: "With your local courier." },
      { label: "Delivered", detail: "Package delivered." },
    ];
    let stage = 0;
    if (hours >= 72) stage = 4;
    else if (hours >= 24) stage = 3;
    else if (hours >= 2) stage = 2;
    else if (hours >= 0.5) stage = 1;
    const eta = new Date((order.placedAt || Date.now()) + 5 * 24 * 60 * 60 * 1000);
    return {
      trackingNumber: order.trackingNumber || "TRK-" + String(order.id || "").replace("WE-", ""),
      stage,
      status: steps[stage].label,
      eta: eta.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      steps: steps.map((step, i) => ({
        ...step,
        done: i <= stage,
        current: i === stage,
      })),
    };
  }

  function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function getReportSummary() {
    const orders = getOrders();
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weekOrders = orders.filter((o) => o.placedAt >= weekAgo);
    const totalRevenue = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const weekRevenue = weekOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const itemsSold = orders.reduce((s, o) => s + (o.itemCount || (o.items || []).reduce((n, i) => n + i.qty, 0)), 0);

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = dayKey(d.getTime());
      const ofDay = orders.filter((o) => dayKey(o.placedAt) === key);
      days.push({
        key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        orders: ofDay.length,
        revenue: ofDay.reduce((s, o) => s + (Number(o.total) || 0), 0),
      });
    }

    const byCat = {};
    const byProduct = {};
    orders.forEach((o) => {
      (o.items || []).forEach((i) => {
        byCat[i.category] = (byCat[i.category] || 0) + i.lineTotal;
        if (!byProduct[i.id]) byProduct[i.id] = { name: i.name, qty: 0, revenue: 0 };
        byProduct[i.id].qty += i.qty;
        byProduct[i.id].revenue += i.lineTotal;
      });
    });

    return {
      orderCount: orders.length,
      totalRevenue,
      weekOrders: weekOrders.length,
      weekRevenue,
      itemsSold,
      avgOrder: orders.length ? totalRevenue / orders.length : 0,
      days,
      categories: Object.entries(byCat)
        .sort((a, b) => b[1] - a[1])
        .map(([name, revenue]) => ({ name, revenue })),
      topProducts: Object.values(byProduct)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
      recent: orders.slice(0, 8),
    };
  }

  const RELATED_CATEGORIES = {
    Laptops: ["Accessories", "Audio", "Tablets"],
    Smartphones: ["Audio", "Accessories"],
    Audio: ["Accessories", "Smartphones"],
    Accessories: ["Laptops", "Smartphones", "Tablets", "Audio"],
    "Smart Home": ["Accessories"],
    Tablets: ["Accessories", "Laptops"],
  };

  /** Automatic recommendations from views, cart, and purchases */
  function getRecommendations(seedProductId) {
    const products = getProducts();
    const cartIds = getCart().map((i) => i.id);
    const viewed = getViewedIds();
    const purchased = getPurchasedIds();
    const seedIds = [seedProductId, ...cartIds, ...viewed, ...purchased].filter(Boolean);
    const exclude = new Set([seedProductId, ...cartIds, ...purchased].filter(Boolean));
    const seeds = seedIds
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);

    const scored = new Map();

    function bump(id, points) {
      if (!id || exclude.has(id)) return;
      const p = products.find((x) => x.id === id);
      if (!p) return;
      scored.set(id, (scored.get(id) || 0) + points);
    }

    seeds.forEach((seed, index) => {
      const recency = 1 + Math.max(0, 10 - index) * 0.12;
      const related = RELATED_CATEGORIES[seed.category] || ["Accessories"];
      products.forEach((p) => {
        if (p.id === seed.id) return;
        if (p.category === seed.category) bump(p.id, 4 * recency);
        if (p.brand && p.brand === seed.brand) bump(p.id, 2 * recency);
        if (related.includes(p.category)) bump(p.id, 5 * recency);
        const hi = Math.max(p.price, seed.price, 1);
        const lo = Math.min(p.price, seed.price);
        if (lo / hi > 0.45) bump(p.id, recency);
      });
    });

    let ranked = [...scored.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => products.find((p) => p.id === id))
      .filter(Boolean);

    if (!ranked.length) {
      ranked = products
        .filter((p) => !exclude.has(p.id))
        .sort((a, b) => (b.weight || 0) - (a.weight || 0));
    }

    return ranked.slice(0, 8);
  }

  function setQty(productId, qty) {
    const stock = availableStock(productId);
    const nextQty = Math.max(1, Number(qty) || 1);
    const capped = stock ? Math.min(nextQty, stock) : 0;
    if (!stock) {
      toast("Item is out of stock");
      saveCart(getCart().filter((i) => i.id !== productId));
      return;
    }
    if (nextQty > stock) {
      toast(`Only ${stock} in stock`);
    }
    const cart = getCart()
      .map((i) => (i.id === productId ? { ...i, qty: capped } : i))
      .filter((i) => i.qty > 0);
    saveCart(cart);
  }

  function removeFromCart(productId) {
    saveCart(getCart().filter((i) => i.id !== productId));
    toast("Removed from cart");
  }

  function money(n) {
    return "$" + Number(n).toLocaleString();
  }

  function productById(id) {
    return getProducts().find((p) => p.id === id);
  }

  function availableStock(productId) {
    const p = productById(productId);
    return Math.max(0, Number(p?.stock) || 0);
  }

  function validateCartStock(cart) {
    for (const item of cart) {
      const p = productById(item.id);
      const qty = Math.max(1, Number(item.qty) || 1);
      const stock = availableStock(item.id);
      if (qty > stock) {
        return {
          ok: false,
          error: stock
            ? `Not enough stock for ${p?.name || "item"}. Only ${stock} left.`
            : `${p?.name || "Item"} is out of stock.`,
        };
      }
    }
    return { ok: true };
  }

  function deductStock(orderItems) {
    const byId = new Map(orderItems.map((i) => [i.id, i.qty]));
    const updated = getProducts().map((p) => {
      const sold = byId.get(p.id);
      if (!sold) return p;
      return { ...p, stock: Math.max(0, (Number(p.stock) || 0) - sold) };
    });
    saveProducts(updated);
  }

  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function requireRole(allowed) {
    if (!isLoggedIn()) {
      location.href = "login.html";
      return null;
    }
    const role = getRole();
    if (!allowed.includes(role)) {
      location.href = homeFor(role);
      return null;
    }
    return role;
  }

  function requirePurchaseLogin() {
    if (isLoggedIn()) return true;
    try {
      sessionStorage.setItem("warners_pending_checkout", "1");
    } catch {
      /* ignore */
    }
    toast("Log in or create an account to purchase");
    setTimeout(() => {
      location.href = "login.html?signup=1&next=checkout.html";
    }, 700);
    return false;
  }

  function afterLoginPath(role) {
    const next = new URLSearchParams(location.search).get("next");
    if (next && /^[a-z0-9._-]+\.html$/i.test(next)) {
      return next;
    }
    try {
      if (sessionStorage.getItem("warners_pending_checkout") === "1") return "checkout.html";
    } catch {
      /* ignore */
    }
    return "home.html";
  }

  function logout() {
    clearSession();
    location.href = "home.html";
  }

  function login(username, password) {
    const key = String(username || "").trim().toLowerCase();
    const pass = String(password || "");

    // Staff demo accounts only (admin / owner) — no demo customer
    const staff = window.WARNERS_USERS[key];
    if (staff) {
      if (getStaffPassword(key) !== pass) return null;
      let profileName = staff.label;
      try {
        const saved = JSON.parse(localStorage.getItem(`warners_staff_profile_${key}`) || "{}");
        if (saved.name) profileName = saved.name;
      } catch {
        /* keep demo label */
      }
      localStorage.setItem(AUTH_KEY, "1");
      setRole(staff.role);
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({
          username: key,
          name: profileName,
          role: staff.role,
          initial: (profileName || staff.initial || "S").charAt(0).toUpperCase(),
          label: profileName,
        })
      );
      return staff;
    }

    // Registered customers only
    const customer = getCustomers().find((c) => c.username === key);
    if (!customer || customer.password !== pass || customer.disabled) return null;
    localStorage.setItem(AUTH_KEY, "1");
    setRole("customer");
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        username: customer.username,
        name: customer.name,
        role: "customer",
        initial: (customer.name || customer.username).charAt(0).toUpperCase(),
        label: "Customer",
      })
    );
    return { role: "customer", label: "Customer", initial: (customer.name || "C").charAt(0).toUpperCase() };
  }

  function homeFor(role) {
    if (role === "admin") return "admin.html";
    if (role === "owner") return "owner.html";
    return "home.html";
  }

  function getBrands() {
    const seen = new Map();
    getProducts().forEach((p) => {
      const name = String(p.brand || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (!seen.has(key)) seen.set(key, name);
    });
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }

  function productGallery(p) {
    const photos = [];
    if (p.image) photos.push(p.image);
    (p.gallery || []).forEach((src) => {
      if (src && !photos.includes(src)) photos.push(src);
    });
    return photos;
  }

  function productArt(p, extraClass = "") {
    if (p.image) {
      return `<div class="${extraClass}"><img src="${p.image}" alt="${p.name || "Product"}" /></div>`;
    }
    return `<div class="${extraClass}">${p.emoji || "📦"}</div>`;
  }

  function productCard(p) {
    return `
      <a class="card" href="product.html?id=${encodeURIComponent(p.id)}">
        ${productArt(p, `card-art tone-${p.tone || "blue"}`)}
        <div class="card-body">
          <h3>${p.name}</h3>
          <div class="meta">${p.subtitle || p.category}</div>
          <div class="price">${money(p.price)}</div>
        </div>
      </a>`;
  }

  function renderHeader(active) {
    const role = getRole();
    const session = getSessionUser();
    const host = document.querySelector("[data-header]");
    if (!host) return;

    const currentCat = new URLSearchParams(location.search).get("cat") || "";
    const currentQ = new URLSearchParams(location.search).get("q") || "";
    const dashOn =
      role === "admin"
        ? ["dashboard", "products", "categories", "reports", "settings"].includes(active)
        : ["dashboard", "reports", "performance"].includes(active);

    const personSvg = `
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <circle cx="12" cy="8.2" r="3.4"></circle>
        <path d="M5.2 19.2c.9-3.4 3.5-5.2 6.8-5.2s5.9 1.8 6.8 5.2"></path>
      </svg>`;
    const bagSvg = `
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M7 8.5h10l-.7 11.2H7.7L7 8.5z"></path>
        <path d="M9.2 8.5V7.2a2.8 2.8 0 0 1 5.6 0v1.3"></path>
      </svg>`;

    const count = cartCount();
    const cartIcon = `
      <a class="header-icon-link${active === "cart" ? " is-active" : ""}" href="cart.html" title="Cart" aria-label="Cart${count ? `, ${count} items` : ""}">
        <span class="header-icon">
          ${count ? `<span class="header-icon-badge">${count}</span>` : ""}
          ${bagSvg}
        </span>
      </a>`;

    let account = "";
    if (role === "admin" || role === "owner" || role === "customer") {
      const profileHref =
        role === "admin" ? "admin.html" : role === "owner" ? "owner.html" : "account.html";
      const profileLabel = role === "customer" ? "My account" : "Dashboard";
      account = `
        <div class="header-account">
          <a class="header-icon-link${active === "account" || dashOn ? " is-active" : ""}" href="${profileHref}" title="${profileLabel}" aria-label="${profileLabel}">
            <span class="header-icon">${personSvg}</span>
          </a>
          <div class="header-account-menu">
            <a href="${profileHref}">${profileLabel}</a>
            <a href="${
              role === "admin"
                ? "admin.html#settings"
                : role === "owner"
                  ? "owner.html#settings"
                  : "settings.html"
            }">Settings</a>
            <button type="button" data-logout>Log out</button>
          </div>
        </div>`;
    } else {
      account = `
        <div class="header-account">
          <a class="header-icon-link${active === "login" || active === "settings" ? " is-active" : ""}" href="login.html" title="Account" aria-label="Account">
            <span class="header-icon">${personSvg}</span>
          </a>
          <div class="header-account-menu">
            <a href="login.html">Log in</a>
            <a href="login.html?signup=1">Create account</a>
            <a href="settings.html">Settings</a>
          </div>
        </div>`;
    }

    const catLinks = getCategories()
      .map(
        (c) =>
          `<a href="search.html?cat=${encodeURIComponent(c)}" class="${
            active === "search" && currentCat === c ? "active" : ""
          }">${escHtml(c)}</a>`
      )
      .join("");

    let extraNav = "";
    if (role === "admin") {
      extraNav = `<a href="admin.html" class="${dashOn ? "active" : ""}">Dashboard</a>`;
    } else if (role === "owner") {
      extraNav = `<a href="owner.html" class="${dashOn ? "active" : ""}">Dashboard</a>`;
    }

    let greeting = "";
    if (role === "admin" || role === "owner" || role === "customer") {
      const firstName = getFirstName(session);
      greeting = `<p class="header-greeting">Hello, <strong>${escHtml(firstName)}</strong></p>`;
    }

    host.innerHTML = `
      <div class="header-top">
        <a class="brand" href="home.html" aria-label="Warner Electronics">
          <img class="brand-logo" src="images/warner-mark.png" alt="" />
          <span class="brand-text">
            <span class="brand-name">WARNER</span>
            <span class="brand-sub">ELECTRONICS</span>
          </span>
        </a>
        <form class="header-search" action="search.html" method="get" role="search">
          <label class="header-search-field">
            <span class="header-search-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle cx="11" cy="11" r="6.2"></circle>
                <path d="M16.2 16.2 21 21"></path>
              </svg>
            </span>
            <input type="search" name="q" placeholder="Search" value="${escHtml(currentQ)}" autocomplete="off" />
          </label>
          <div class="search-suggest" hidden role="listbox" aria-label="Recent searches"></div>
        </form>
        <div class="header-utils">${greeting}${account}${cartIcon}</div>
      </div>
      <nav class="header-nav">
        <a href="home.html" class="${active === "home" ? "active" : ""}">Home</a>
        ${catLinks}
        <a href="recommendations.html" class="${active === "recommendations" ? "active" : ""}">Recommendations</a>
        <a href="support.html" class="${active === "support" ? "active" : ""}">Support</a>
        ${extraNav}
      </nav>`;

    const searchForm = host.querySelector(".header-search");
    const searchInput = searchForm?.querySelector("input");
    const searchPanel = searchForm?.querySelector(".search-suggest");
    bindSearchHistory(searchInput, searchPanel, {
      onSearch: () => {
        const q = searchInput.value.trim();
        if (q) recordSearch(q);
        location.href = "search.html?q=" + encodeURIComponent(q);
      },
    });
    searchForm?.addEventListener("submit", () => {
      const q = searchInput.value.trim();
      if (q) recordSearch(q);
    });

    host.querySelector("[data-logout]")?.addEventListener("click", logout);
    bindHeaderScroll(host);
    renderFooter();
    renderStaffBanner();
  }

  function bindHeaderScroll(header) {
    if (!header || header.dataset.scrollBound === "1") return;
    header.dataset.scrollBound = "1";
    let lastY = window.scrollY || 0;

    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY || 0;
        const delta = y - lastY;
        lastY = y;
        if (y < 80 || header.contains(document.activeElement)) {
          header.classList.remove("is-away");
          return;
        }
        if (delta > 8) header.classList.add("is-away");
        else if (delta < -8) header.classList.remove("is-away");
      },
      { passive: true }
    );
  }

  function renderStaffBanner() {
    const role = getRole();
    document.querySelector(".staff-banner")?.remove();
    if (role !== "admin" && role !== "owner") return;
    const page = document.querySelector("main.page");
    if (!page) return;
    const dash = role === "admin" ? "admin.html" : "owner.html";
    const bar = document.createElement("div");
    bar.className = "staff-banner";
    bar.innerHTML = `Viewing the live storefront as <strong>${role}</strong>. <a href="${dash}">Open dashboard</a>`;
    page.prepend(bar);
  }

  function renderFooter() {
    const existing = document.querySelector(".site-footer");
    const role = getRole();
    const accountLink =
      role === "customer"
        ? `<li><a href="account.html">My account</a></li><li><a href="settings.html">Settings</a></li>`
        : role === "admin" || role === "owner"
          ? ""
          : `<li><a href="login.html">Log in</a></li><li><a href="settings.html">Settings</a></li>`;
    const trackLink =
      role === "customer"
        ? `<li><a href="account.html#tracking">Track my order</a></li>`
        : `<li><a href="login.html">Track my order</a></li>`;
    const dashLink =
      role === "admin"
        ? `<li><a href="admin.html">Dashboard</a></li><li><a href="admin.html#settings">Settings</a></li>`
        : role === "owner"
          ? `<li><a href="owner.html">Dashboard</a></li><li><a href="owner.html#settings">Settings</a></li>`
          : "";

    const html = `
      <section class="footer-newsletter">
        <div class="footer-newsletter-inner">
          <div class="footer-newsletter-copy">
            <h3>Get the latest from Warner Electronics!</h3>
            <p>Stay updated on new arrivals, deals, and smart product picks.</p>
          </div>
          <form class="footer-newsletter-form" id="footer-newsletter-form">
            <div class="footer-newsletter-row">
              <input id="footer-email" type="email" placeholder="Enter email address" aria-label="Email address" autocomplete="email" />
              <button class="btn footer-signup" type="submit">Sign up</button>
            </div>
            <div class="footer-newsletter-consent" id="footer-newsletter-consent" hidden>
              <label class="footer-consent-check">
                <input id="footer-consent" type="checkbox" />
                <span>Yes, sign me up for the Warner Electronics newsletter. I confirm I am over 16 years old. I would like to receive email updates about products and exclusive offers.</span>
              </label>
              <p class="footer-consent-legal">
                Your personal data will be processed by Warner Electronics to send you marketing communications.
                You can unsubscribe at any time. Read our <a href="support.html">Privacy Policy</a>.
              </p>
              <p class="footer-consent-legal">
                Warner Electronics needs your email to keep you up to date on products, offers and store events.
                By signing up, you agree to receive promotional emails in accordance with our privacy policy.
              </p>
            </div>
          </form>
        </div>
      </section>
      <div class="footer-columns">
        <div class="footer-col">
          <h4>Explore</h4>
          <ul>
            <li><a href="home.html">Home</a></li>
            <li><a href="search.html">All products</a></li>
            <li><a href="search.html?cat=Laptops">Laptops</a></li>
            <li><a href="search.html?cat=Smartphones">Smartphones</a></li>
            <li><a href="recommendations.html">Recommendations</a></li>
            <li><a href="search.html?cat=Accessories">Accessories</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Help</h4>
          <ul>
            <li><a href="support.html">FAQ &amp; support</a></li>
            ${trackLink}
            <li><a href="support.html">Shipping</a></li>
            <li><a href="support.html">Returns</a></li>
            <li><a href="cart.html">Your cart</a></li>
            <li><a href="support.html">Contact us</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Services</h4>
          <ul>
            ${accountLink}
            <li><a href="login.html?signup=1">Create account</a></li>
            <li><a href="checkout.html">Checkout</a></li>
            <li><a href="recommendations.html">Smart recommendations</a></li>
            ${dashLink}
          </ul>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="support.html">Privacy policy</a></li>
            <li><a href="support.html">Terms &amp; conditions</a></li>
            <li><a href="support.html">Cookie settings</a></li>
            <li><a href="support.html">Data protection</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>About us</h4>
          <ul>
            <li><a href="support.html">Warner Electronics</a></li>
            <li><a href="support.html">Our story</a></li>
            <li><a href="support.html">Careers</a></li>
            <li><a href="support.html">Responsibility</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">&copy; ${new Date().getFullYear()} Warner Electronics. All rights reserved.</p>
        <div class="footer-region">🇦🇺 Australia · English</div>
        <div class="footer-social" aria-label="Social links">
          <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <img src="images/social-facebook.png" alt="" />
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <img src="images/social-instagram.png" alt="" />
          </a>
          <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X">
            <img src="images/social-x.png" alt="" />
          </a>
          <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
            <img src="images/social-youtube.png" alt="" />
          </a>
        </div>
      </div>`;

    let footer = existing;
    if (!footer) {
      footer = document.createElement("footer");
      footer.className = "site-footer";
      document.body.appendChild(footer);
    }
    footer.innerHTML = html;
    bindFooterNewsletter(footer);
  }

  function bindFooterNewsletter(footer) {
    const form = footer.querySelector("#footer-newsletter-form");
    const emailInput = footer.querySelector("#footer-email");
    const consentBox = footer.querySelector("#footer-newsletter-consent");
    const consentCheck = footer.querySelector("#footer-consent");
    if (!form || !emailInput || !consentBox) return;

    function toggleConsentPanel() {
      const typing = emailInput.value.length > 0;
      consentBox.hidden = !typing;
      if (!typing && consentCheck) consentCheck.checked = false;
    }

    emailInput.addEventListener("input", toggleConsentPanel);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!email) {
        toast("Enter your email address");
        emailInput.focus();
        return;
      }
      if (!email.includes("@")) {
        toast("Enter a valid email address");
        return;
      }
      toggleConsentPanel();
      if (!consentCheck?.checked) {
        toast("Please confirm you agree to receive emails");
        consentCheck?.focus();
        return;
      }
      toast("Thanks — you're subscribed (demo)");
      form.reset();
      consentBox.hidden = true;
    });
  }

  function bindAddButtons(root) {
    (root || document).addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-add");
      if (id) addToCart(id);
    });
  }

  function addProduct(data) {
    const list = getProducts();
    const id =
      data.id ||
      String(data.name || "product")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now().toString().slice(-4);
    const item = {
      id,
      name: data.name || "New Product",
      category: data.category || "Accessories",
      brand: data.brand || "WarnerTech",
      price: Number(data.price) || 0,
      stock: Number(data.stock) || 0,
      weight: Number(data.weight) || 0.5,
      subtitle: data.subtitle || data.category || "Accessory",
      description: data.description || "New catalogue item",
      tags: data.tags || ["New"],
      specs: data.specs || ["Demo product added by admin"],
      tone: data.tone || "blue",
      emoji: data.emoji || "📦",
      image: data.image || "",
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
    };
    list.unshift(item);
    saveProducts(list);
    toast("Product added");
    return item;
  }

  function updateProduct(id, patch) {
    const list = getProducts().map((p) => (p.id === id ? { ...p, ...patch } : p));
    saveProducts(list);
    toast("Product updated");
  }

  function deleteProduct(id) {
    saveProducts(getProducts().filter((p) => p.id !== id));
    saveCart(getCart().filter((i) => i.id !== id));
    toast("Product deleted");
  }

  function addCategory(name) {
    const list = getCategories();
    if (!name || list.includes(name)) {
      toast("Category already exists or empty");
      return;
    }
    list.push(name);
    saveCategories(list);
    toast("Category added");
  }

  function deleteCategory(name) {
    saveCategories(getCategories().filter((c) => c !== name));
    toast("Category removed");
  }

  function filterProducts({ q = "", cats = [], brands = [], minPrice = null, maxPrice = null } = {}) {
    const query = String(q).trim().toLowerCase();
    const min = minPrice !== "" && minPrice != null && !Number.isNaN(Number(minPrice)) ? Number(minPrice) : null;
    const max = maxPrice !== "" && maxPrice != null && !Number.isNaN(Number(maxPrice)) ? Number(maxPrice) : null;
    return getProducts().filter((p) => {
      const matchQ =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.subtitle || "").toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);
      const matchC = !cats.length || cats.includes(p.category);
      const matchB =
        !brands.length ||
        brands.some((b) => String(p.brand || "").toLowerCase() === String(b).toLowerCase());
      let matchP = true;
      if (min != null) matchP = matchP && Number(p.price) >= min;
      if (max != null) matchP = matchP && Number(p.price) <= max;
      return matchQ && matchC && matchB && matchP;
    });
  }

  function bindPageMotion() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.body.classList.add("page-enter");

    function isInternalNavLink(anchor) {
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return false;
      }
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return false;
        if (
          url.pathname === location.pathname &&
          url.search === location.search &&
          url.hash &&
          !url.pathname.endsWith(".html")
        ) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }

    document.addEventListener(
      "click",
      (e) => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const link = e.target.closest("a[href]");
        if (!isInternalNavLink(link)) return;
        const href = link.getAttribute("href");
        e.preventDefault();
        document.body.classList.remove("page-enter");
        document.body.classList.add("page-exit");
        window.setTimeout(() => {
          location.href = href;
        }, 420);
      },
      true
    );
  }

  function animateView(el) {
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.remove("view-fade-in");
    void el.offsetWidth;
    el.classList.add("view-fade-in");
  }

  bindPageMotion();
  applyAppearance();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (getAppearance() === "system") {
      applyAppearance();
    }
  });

  window.Warners = {
    getRole,
    setRole,
    clearSession,
    isLoggedIn,
    hasAccountSession,
    isCustomer,
    getSessionUser,
    registerCustomer,
    getCustomers,
    saveCustomers,
    getCart,
    saveCart,
    addToCart,
    setQty,
    removeFromCart,
    cartCount,
    money,
    productById,
    getProducts,
    saveProducts,
    getCategories,
    saveCategories,
    getBrands,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    deleteCategory,
    toast,
    requireRole,
    requirePurchaseLogin,
    logout,
    login,
    afterLoginPath,
    homeFor,
    productCard,
    productArt,
    productGallery,
    renderHeader,
    bindAddButtons,
    trackView,
    getViewedIds,
    getSearchHistory,
    recordSearch,
    removeSearchHistoryItem,
    clearSearchHistory,
    bindSearchHistory,
    getPurchasedIds,
    recordPurchase,
    getOrders,
    placeOrder,
    getReportSummary,
    getCustomerOrders,
    getCustomerProfile,
    updateCustomerProfile,
    getCustomerSettings,
    saveCustomerSettings,
    updateCustomerPassword,
    getGuestPrefs,
    saveGuestPrefs,
    getAppearance,
    setAppearance,
    applyAppearance,
    applyCustomerAppearance,
    bindAppearancePicker,
    getStaffProfile,
    saveStaffProfile,
    getStaffPrefs,
    saveStaffPrefs,
    updateStaffPassword,
    getOrderTracking,
    getRecommendations,
    filterProducts,
    animateView,
  };
})();
