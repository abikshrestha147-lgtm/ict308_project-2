(function () {
  const ROLE_KEY = "warners_role";
  const CART_KEY = "warners_cart";

  function getRole() {
    return localStorage.getItem(ROLE_KEY);
  }

  function setRole(role) {
    localStorage.setItem(ROLE_KEY, role);
  }

  function clearRole() {
    localStorage.removeItem(ROLE_KEY);
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

  function addToCart(productId) {
    const cart = getCart();
    const found = cart.find((i) => i.id === productId);
    if (found) found.qty += 1;
    else cart.push({ id: productId, qty: 1 });
    saveCart(cart);
    toast("Added to cart");
    updateCartBadge();
  }

  function updateQty(productId, qty) {
    let cart = getCart();
    cart = cart
      .map((i) => (i.id === productId ? { ...i, qty } : i))
      .filter((i) => i.qty > 0);
    saveCart(cart);
    updateCartBadge();
  }

  function money(n) {
    return "$" + Number(n).toLocaleString();
  }

  function productById(id) {
    return (window.WARNERS_PRODUCTS || []).find((p) => p.id === id);
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
    el._t = setTimeout(() => el.classList.remove("show"), 1600);
  }

  function updateCartBadge() {
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = String(cartCount());
    });
  }

  function requireRole(allowed) {
    const role = getRole();
    if (!role || !allowed.includes(role)) {
      window.location.href = "index.html";
      return null;
    }
    return role;
  }

  function logout() {
    clearRole();
    window.location.href = "index.html";
  }

  function renderNav(active) {
    const role = getRole();
    const host = document.querySelector("[data-nav]");
    if (!host || !role) return;

    let links = "";
    if (role === "customer") {
      links = `
        <a href="home.html" class="${active === "home" ? "active" : ""}">Home</a>
        <a href="search.html" class="${active === "search" ? "active" : ""}">Search</a>
        <a href="cart.html" class="${active === "cart" ? "active" : ""}">Cart (<span data-cart-count>0</span>)</a>
      `;
    } else if (role === "admin") {
      links = `
        <a href="admin.html" class="${active === "admin" ? "active" : ""}">Catalogue</a>
        <a href="admin.html#rules" class="${active === "rules" ? "active" : ""}">Rules</a>
        <a href="owner.html" class="${active === "reports" ? "active" : ""}">Reports</a>
      `;
    } else if (role === "owner") {
      links = `
        <a href="owner.html" class="${active === "reports" ? "active" : ""}">Reports</a>
        <a href="admin.html#rules" class="${active === "rules" ? "active" : ""}">Rules</a>
      `;
    }

    host.innerHTML = `
      <div class="brand">Warner's Electronics</div>
      <nav class="nav">${links}</nav>
      <div class="nav-right">
        <span class="badge">${role}</span>
        <button class="btn btn-ghost" type="button" data-logout>Log out</button>
      </div>
    `;
    host.querySelector("[data-logout]")?.addEventListener("click", logout);
    updateCartBadge();
  }

  function productCard(p) {
    return `
      <article class="card">
        <a href="product.html?id=${encodeURIComponent(p.id)}">
          <div class="card-art tone-${p.tone}">${p.emoji}</div>
          <div class="card-body">
            <h3>${p.name}</h3>
            <div class="muted">${p.subtitle}</div>
            <div class="price">${money(p.price)}</div>
          </div>
        </a>
        <div class="card-body" style="padding-top:0">
          <button class="btn" type="button" data-add="${p.id}">Add to cart</button>
        </div>
      </article>
    `;
  }

  window.Warners = {
    getRole,
    setRole,
    clearRole,
    getCart,
    saveCart,
    addToCart,
    updateQty,
    cartCount,
    money,
    productById,
    toast,
    requireRole,
    logout,
    renderNav,
    productCard,
    updateCartBadge,
  };
})();
