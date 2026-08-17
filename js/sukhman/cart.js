/* Sukhman — shopping cart (browse without login; checkout needs account) */
Warners.renderHeader("cart");

function cartLines() {
  return Warners.getCart()
    .map((i) => {
      const p = Warners.productById(i.id) || {};
      return {
        id: i.id,
        qty: i.qty,
        product: {
          ...p,
          id: i.id,
          name: p.name || i.id,
          category: p.category || "Other",
          price: Number(p.price) || 0,
          tone: p.tone || "blue",
          image: p.image || "",
          emoji: p.emoji || "📦",
          subtitle: p.subtitle || p.category || "",
        },
      };
    })
    .filter((i) => i.id);
}

function startCheckout() {
  if (!cartLines().length) return;
  if (!Warners.requirePurchaseLogin()) return;
  location.href = "checkout.html";
}

function render() {
  const items = cartLines();
  const box = document.getElementById("cart-box");
  const summary = document.getElementById("summary");
  const recsHost = document.getElementById("cart-recs");

  const recs = Warners.getRecommendations().slice(0, 4);
  recsHost.innerHTML = recs.length
    ? recs.map(Warners.productCard).join("")
    : `<div class="panel meta">Add a product to see recommended add-ons.</div>`;

  if (!items.length) {
    box.innerHTML = `
      <p class="meta">Your cart is empty.</p>
      <a class="btn" href="home.html">Continue shopping</a>`;
    summary.innerHTML = `
      <h3>Order Summary</h3>
      <div class="summary-row"><span>Subtotal</span><span>$0</span></div>
      <div class="summary-total"><span>Total</span><span>$0</span></div>
      <a class="btn btn-outline" href="home.html">Continue Shopping</a>`;
    Warners.renderHeader("cart");
    return;
  }

  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const discount = subtotal > 1000 ? 25 : 0;
  const total = subtotal - discount;

  box.innerHTML = items
    .map(
      (i) => `
    <div class="cart-row">
      <div class="cart-thumb tone-${i.product.tone}">${
        i.product.image
          ? `<img src="${i.product.image}" alt="${i.product.name}" />`
          : i.product.emoji
      }</div>
      <div>
        <strong>${i.product.name}</strong>
        <div class="meta">${i.product.subtitle}</div>
        <div class="qty">
          <button class="btn btn-ghost btn-sm" type="button" data-dec="${i.id}">−</button>
          <span>${i.qty}</span>
          <button class="btn btn-ghost btn-sm" type="button" data-inc="${i.id}">+</button>
          <button class="btn btn-danger btn-sm" type="button" data-remove="${i.id}">Remove</button>
        </div>
      </div>
      <div class="price">${Warners.money(i.product.price * i.qty)}</div>
    </div>`
    )
    .join("");

  summary.innerHTML = `
    <h3>Order Summary</h3>
    <div class="summary-row"><span>Subtotal</span><span>${Warners.money(subtotal)}</span></div>
    <div class="summary-row"><span>Estimated delivery</span><span>$0</span></div>
    <div class="summary-row"><span>Discount</span><span>-${Warners.money(discount)}</span></div>
    <div class="summary-total"><span>Total</span><span>${Warners.money(total)}</span></div>
    <button class="btn" type="button" id="checkout">Proceed to Checkout</button>
    <a class="btn btn-outline" href="home.html" style="margin-top:0.5rem;display:flex">Continue Shopping</a>`;

  Warners.renderHeader("cart");
}

document.getElementById("cart-box").addEventListener("click", (e) => {
  const t = e.target;
  const inc = t.getAttribute("data-inc");
  const dec = t.getAttribute("data-dec");
  const remove = t.getAttribute("data-remove");
  if (inc) {
    const item = Warners.getCart().find((i) => i.id === inc);
    Warners.setQty(inc, (item?.qty || 1) + 1);
    render();
  }
  if (dec) {
    const item = Warners.getCart().find((i) => i.id === dec);
    Warners.setQty(dec, Math.max(1, (item?.qty || 1) - 1));
    render();
  }
  if (remove) {
    Warners.removeFromCart(remove);
    render();
  }
});

document.getElementById("cart-recs").addEventListener("click", (e) => {
  const id = e.target.getAttribute("data-add");
  if (!id) return;
  Warners.addToCart(id);
  render();
});

document.getElementById("summary").addEventListener("click", (e) => {
  if (!e.target.closest("#checkout")) return;
  startCheckout();
});

render();

try {
  if (sessionStorage.getItem("warners_pending_checkout") === "1" && Warners.isLoggedIn() && Warners.getCart().length) {
    location.href = "checkout.html";
  }
} catch {
  /* ignore */
}
