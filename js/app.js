(function () {
  const ROLE_KEY = "warners_role";
  const AUTH_KEY = "warners_auth";
  const USER_KEY = "warners_user";
  const CART_KEY = "warners_cart";
  const PRODUCTS_KEY = "warners_products";
  const CATEGORIES_KEY = "warners_categories";
  const RULES_KEY = "warners_rules";
  const VIEWED_KEY = "warners_viewed";
  const CUSTOMERS_KEY = "warners_customers";

  function getRole() {
    const auth = localStorage.getItem(AUTH_KEY);
    if (auth !== "1" && auth !== "guest") return null;
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
    const auth = localStorage.getItem(AUTH_KEY);
    return (auth === "1" || auth === "guest") && !!localStorage.getItem(ROLE_KEY);
  }

  function hasAccountSession() {
    return localStorage.getItem(AUTH_KEY) === "1" && !!localStorage.getItem(ROLE_KEY);
  }

  function isGuest() {
    return localStorage.getItem(AUTH_KEY) === "guest" && getRole() === "guest";
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
    if (!localStorage.getItem(RULES_KEY)) {
      localStorage.setItem(RULES_KEY, JSON.stringify(window.WARNERS_RULES));
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

  function getRules() {
    ensureData();
    try {
      return JSON.parse(localStorage.getItem(RULES_KEY));
    } catch {
      return window.WARNERS_RULES.slice();
    }
  }

  function saveRules(list) {
    localStorage.setItem(RULES_KEY, JSON.stringify(list));
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
    const cart = getCart();
    const found = cart.find((i) => i.id === productId);
    const n = qty || 1;
    if (found) found.qty += n;
    else cart.push({ id: productId, qty: n });
    saveCart(cart);
    trackView(productId);
    const recs = getRecommendations(productId).slice(0, 2);
    if (recs.length) {
      toast("Added to cart · Recommended: " + recs.map((p) => p.name).join(", "));
    } else {
      toast("Added to cart");
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

  /** Smart recommendations from cart, views, category match, and admin rules */
  function getRecommendations(seedProductId) {
    const products = getProducts();
    const cartIds = getCart().map((i) => i.id);
    const viewed = getViewedIds();
    const seedIds = [seedProductId, ...cartIds, ...viewed].filter(Boolean);
    const exclude = new Set(seedIds);
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

    // Same category / accessories for seed products
    seeds.forEach((seed) => {
      products.forEach((p) => {
        if (p.id === seed.id) return;
        if (p.category === "Accessories" && seed.category !== "Accessories") bump(p.id, 3);
        if (p.category === seed.category) bump(p.id, 2);
        if (p.brand === seed.brand) bump(p.id, 1);
      });

      // Rule-based boosts
      getRules().forEach((rule) => {
        const when = (rule.when || "").toLowerCase();
        const then = (rule.then || "").toLowerCase();
        const seedText = (seed.name + " " + seed.category).toLowerCase();
        if (when && seedText.split(/\s+/).some((w) => w.length > 3 && when.includes(w))) {
          products.forEach((p) => {
            const hay = (p.name + " " + p.subtitle + " " + p.category).toLowerCase();
            if (then.split(/\s+/).some((w) => w.length > 3 && hay.includes(w))) {
              bump(p.id, 5);
            }
          });
        }
      });
    });

    // Hard-coded accessory pairs matching Figma demo
    const pairs = {
      "ultrabook-pro-14": ["laptop-sleeve", "usb-c-hub", "wireless-mouse", "noise-free-headset"],
      "smartphone-x2": ["noise-free-headset", "usb-c-hub", "portable-ssd"],
      "noise-free-headset": ["wireless-mouse", "bluetooth-keyboard"],
    };
    seedIds.forEach((id) => {
      (pairs[id] || []).forEach((rid, idx) => bump(rid, 6 - idx));
    });

    let ranked = [...scored.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => products.find((p) => p.id === id))
      .filter(Boolean);

    // Fallback featured list
    if (!ranked.length) {
      ranked = products
        .filter((p) => !exclude.has(p.id))
        .sort((a, b) => (b.weight || 0) - (a.weight || 0));
    }

    return ranked.slice(0, 8);
  }

  function setQty(productId, qty) {
    const cart = getCart()
      .map((i) => (i.id === productId ? { ...i, qty } : i))
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
      clearSession();
      location.href = "index.html";
      return null;
    }
    const role = getRole();
    if (!allowed.includes(role)) {
      location.href = homeFor(role);
      return null;
    }
    return role;
  }

  function logout() {
    clearSession();
    location.href = "index.html";
  }

  function login(username, password) {
    const key = String(username || "").trim().toLowerCase();
    const pass = String(password || "");

    // Staff demo accounts only (admin / owner) — no demo customer
    const staff = window.WARNERS_USERS[key];
    if (staff) {
      if (staff.password !== pass) return null;
      localStorage.setItem(AUTH_KEY, "1");
      setRole(staff.role);
      localStorage.setItem(
        USER_KEY,
        JSON.stringify({
          username: key,
          name: staff.label,
          role: staff.role,
          initial: staff.initial,
          label: staff.label,
        })
      );
      return staff;
    }

    // Registered customers only
    const customer = getCustomers().find((c) => c.username === key);
    if (!customer || customer.password !== pass) return null;
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

  function enterGuest() {
    localStorage.setItem(AUTH_KEY, "guest");
    setRole("guest");
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({
        username: "guest",
        name: "Guest",
        role: "guest",
        initial: "G",
        label: "Guest",
      })
    );
    location.href = "home.html";
  }

  function homeFor(role) {
    if (role === "admin") return "admin.html";
    if (role === "owner") return "owner.html";
    return "home.html";
  }

  function productCard(p) {
    return `
      <article class="card">
        <div class="card-art tone-${p.tone || "blue"}">${p.emoji || "📦"}</div>
        <div class="card-body">
          <h3>${p.name}</h3>
          <div class="meta">${p.subtitle || p.category}</div>
          <div class="price">${money(p.price)}</div>
          <div class="card-actions">
            <a class="btn btn-sm" href="product.html?id=${encodeURIComponent(p.id)}">View</a>
            <button class="btn btn-outline btn-sm" type="button" data-add="${p.id}">Add</button>
          </div>
        </div>
      </article>`;
  }

  function renderHeader(active) {
    const role = getRole();
    const session = getSessionUser();
    const user = session || {
      label: role === "guest" ? "Guest" : "Guest",
      initial: role === "guest" ? "G" : "?",
      role: role || "",
    };
    const host = document.querySelector("[data-header]");
    if (!host) return;

    let links = "";
    if (role === "customer" || role === "guest") {
      links = `
        <a href="home.html" class="${active === "home" || active === "products" ? "active" : ""}">Home</a>
        <a href="search.html" class="${active === "search" ? "active" : ""}">Products</a>
        <a href="recommendations.html" class="${active === "recommendations" ? "active" : ""}">Recommendations</a>
        <a href="cart.html" class="${active === "cart" ? "active" : ""}">Cart (${cartCount()})</a>
        <a href="support.html" class="${active === "support" ? "active" : ""}">Support</a>`;
    } else if (role === "admin") {
      links = `
        <a href="admin.html" class="${active === "products" || active === "home" ? "active" : ""}">Catalogue</a>
        <a href="admin.html#categories" class="${active === "categories" ? "active" : ""}">Categories</a>
        <a href="admin.html#rules" class="${active === "rules" ? "active" : ""}">Rules</a>
        <a href="admin.html#reports" class="${active === "reports" ? "active" : ""}">Reports</a>`;
    } else if (role === "owner") {
      links = `
        <a href="owner.html" class="${active === "reports" || active === "home" ? "active" : ""}">Reports</a>
        <a href="owner.html#rules" class="${active === "rules" ? "active" : ""}">Rules</a>
        <a href="owner.html#performance" class="${active === "performance" ? "active" : ""}">Performance</a>`;
    }

    const accountActions =
      role === "guest"
        ? `<a class="btn btn-outline btn-sm" href="index.html" data-exit-guest>Log in</a>
           <button class="btn btn-ghost btn-sm" type="button" data-logout>Exit guest</button>`
        : `<button class="btn btn-ghost btn-sm" type="button" data-logout>Log out</button>`;

    host.innerHTML = `
      <div class="brand"><span class="brand-mark"></span> Warner's Electronics</div>
      <nav class="nav-links">${links}</nav>
      <div class="user-chip">
        <span class="role-label">${user.label || user.name || role}</span>
        <span class="avatar ${role}">${user.initial || "?"}</span>
        ${accountActions}
      </div>`;

    host.querySelector("[data-logout]")?.addEventListener("click", logout);
    host.querySelector("[data-exit-guest]")?.addEventListener("click", (e) => {
      e.preventDefault();
      clearSession();
      location.href = "index.html";
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

  function addRule(rule) {
    const list = getRules();
    list.unshift(rule);
    saveRules(list);
    toast("Rule added");
  }

  function deleteRule(index) {
    const list = getRules();
    list.splice(index, 1);
    saveRules(list);
    toast("Rule deleted");
  }

  window.Warners = {
    getRole,
    setRole,
    clearSession,
    isLoggedIn,
    hasAccountSession,
    isGuest,
    getSessionUser,
    registerCustomer,
    getCustomers,
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
    getRules,
    saveRules,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    deleteCategory,
    addRule,
    deleteRule,
    toast,
    requireRole,
    logout,
    login,
    enterGuest,
    homeFor,
    productCard,
    renderHeader,
    bindAddButtons,
    trackView,
    getViewedIds,
    getRecommendations,
  };
})();
