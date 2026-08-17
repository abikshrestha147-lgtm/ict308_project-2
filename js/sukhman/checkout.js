/* Sukhman — single-page checkout */
(function () {
  if (!Warners.getCart().length) {
    location.href = "cart.html";
    return;
  }
  if (!Warners.isLoggedIn()) {
    try {
      sessionStorage.setItem("warners_pending_checkout", "1");
    } catch {
      /* ignore */
    }
    location.href = "login.html?signup=1&next=checkout.html";
    return;
  }

  Warners.renderHeader("cart");

  const state = {
    billing: emptyBilling(),
    shipSame: true,
    shipping: emptyShipping(),
    shippingMethod: "standard",
    payment: { cardName: "", cardNumber: "", expiry: "", cvv: "" },
  };

  function emptyBilling() {
    return {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      zip: "",
      country: "",
      newsletter: false,
    };
  }

  function emptyShipping() {
    return { address: "", city: "", zip: "", country: "" };
  }

  function prefillFromAccount() {
    const profile = Warners.getCustomerProfile();
    const session = Warners.getSessionUser();
    const fullName = (profile?.name || session?.name || "").trim();
    const parts = fullName.split(/\s+/);
    state.billing.firstName = profile?.firstName || parts[0] || "";
    state.billing.lastName = profile?.lastName || parts.slice(1).join(" ") || "";
    state.billing.email =
      profile?.email || (profile?.username ? `${profile.username}@email.com` : "");
    state.billing.phone = profile?.phone || "";
    state.billing.address = profile?.address || "";
    state.billing.city = profile?.city || "";
    state.billing.zip = profile?.zip || "";
    state.billing.country = profile?.country || "";
    state.payment.cardName = `${state.billing.firstName} ${state.billing.lastName}`.trim() || fullName;
  }

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
            price: Number(p.price) || 0,
            tone: p.tone || "blue",
            image: p.image || "",
            emoji: p.emoji || "📦",
            subtitle: p.subtitle || p.category || "",
            specs: p.specs || [],
          },
        };
      })
      .filter((i) => i.id);
  }

  function totals() {
    const items = cartLines();
    const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    const discount = subtotal > 1000 ? 25 : 0;
    const shippingCost = state.shippingMethod === "express" ? 15 : 0;
    const total = Math.max(0, subtotal - discount + shippingCost);
    return { items, subtotal, discount, shippingCost, total };
  }

  function readForm() {
    const get = (id) => document.getElementById(id);
    state.billing = {
      firstName: get("bill-first")?.value.trim() || "",
      lastName: get("bill-last")?.value.trim() || "",
      email: get("bill-email")?.value.trim() || "",
      phone: get("bill-phone")?.value.trim() || "",
      address: get("bill-address")?.value.trim() || "",
      city: get("bill-city")?.value.trim() || "",
      zip: get("bill-zip")?.value.trim() || "",
      country: get("bill-country")?.value.trim() || "",
      newsletter: !!get("bill-newsletter")?.checked,
    };
    state.shipSame = !!get("bill-ship-same")?.checked;
    state.shippingMethod = document.querySelector('input[name="ship-method"]:checked')?.value || "standard";
    if (!state.shipSame) {
      state.shipping = {
        address: get("ship-address")?.value.trim() || "",
        city: get("ship-city")?.value.trim() || "",
        zip: get("ship-zip")?.value.trim() || "",
        country: get("ship-country")?.value.trim() || "",
      };
    }
    state.payment = {
      cardName: get("pay-name")?.value.trim() || "",
      cardNumber: get("pay-number")?.value.trim() || "",
      expiry: get("pay-expiry")?.value.trim() || "",
      cvv: get("pay-cvv")?.value.trim() || "",
    };
  }

  function showFieldError(id, message) {
    const input = document.getElementById(id);
    const err = document.getElementById(`${id}-error`);
    if (input) input.classList.toggle("field-invalid", !!message);
    if (err) err.textContent = message || "";
  }

  function validateRequired(pairs) {
    let ok = true;
    pairs.forEach(([id, msg]) => {
      const val = document.getElementById(id)?.value.trim();
      if (!val) {
        showFieldError(id, msg);
        ok = false;
      } else {
        showFieldError(id, "");
      }
    });
    return ok;
  }

  function firstInvalidField() {
    return document.querySelector(".field-invalid");
  }

  function validateForm() {
    readForm();
    let ok = validateRequired([
      ["bill-first", "First name is required"],
      ["bill-last", "Last name is required"],
      ["bill-email", "Email is required"],
      ["bill-phone", "Phone is required"],
      ["bill-address", "Address is required"],
      ["bill-city", "City is required"],
      ["bill-zip", "Zip / postal code is required"],
      ["bill-country", "Country is required"],
    ]);
    const email = document.getElementById("bill-email")?.value.trim() || "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError("bill-email", "Enter a valid email address");
      ok = false;
    }
    if (!state.shipSame) {
      ok =
        validateRequired([
          ["ship-address", "Address is required"],
          ["ship-city", "City is required"],
          ["ship-zip", "Zip is required"],
          ["ship-country", "Country is required"],
        ]) && ok;
    }
    ok =
      validateRequired([
        ["pay-name", "Name on card is required"],
        ["pay-number", "Card number is required"],
        ["pay-expiry", "Expiry is required"],
        ["pay-cvv", "CVV is required"],
      ]) && ok;
    return ok;
  }

  function shippingAddress() {
    if (state.shipSame) {
      return {
        address: state.billing.address,
        city: state.billing.city,
        zip: state.billing.zip,
        country: state.billing.country,
      };
    }
    return { ...state.shipping };
  }

  function renderSummary() {
    const { items, subtotal, discount, shippingCost, total } = totals();
    document.getElementById("checkout-summary").innerHTML = `
      <div class="summary checkout-order-summary">
        <div class="summary-head">
          <h3>Order summary</h3>
          <a class="summary-edit" href="cart.html">Edit</a>
        </div>
        ${items
          .map(
            (i) => `
          <div class="checkout-item">
            <div class="cart-thumb tone-${i.product.tone}">${
              i.product.image
                ? `<img src="${i.product.image}" alt="" />`
                : i.product.emoji
            }</div>
            <div class="checkout-item-body">
              <strong>${i.product.name}</strong>
              ${
                (i.product.specs || []).length
                  ? `<ul class="checkout-specs">${(i.product.specs || [])
                      .slice(0, 3)
                      .map((s) => `<li>${s}</li>`)
                      .join("")}</ul>`
                  : `<div class="meta">${i.product.subtitle}</div>`
              }
              <div class="checkout-item-meta">
                <span>Qty: ${i.qty}</span>
                <span class="price">${Warners.money(i.product.price * i.qty)}</span>
              </div>
            </div>
          </div>`
          )
          .join("")}
        <div class="summary-row"><span>Subtotal</span><span>${Warners.money(subtotal)}</span></div>
        <div class="summary-row"><span>Discount</span><span>-${Warners.money(discount)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${shippingCost ? Warners.money(shippingCost) : "Free"}</span></div>
        <div class="summary-total"><span>Total</span><span>${Warners.money(total)}</span></div>
      </div>`;
  }

  function altShippingFields() {
    const s = state.shipping;
    return `
      <div class="form-grid" id="alt-shipping">
        <div class="field field-span-2">
          <label for="ship-address">Address</label>
          <input id="ship-address" value="${esc(s.address)}" />
          <span class="field-error" id="ship-address-error"></span>
        </div>
        <div class="field">
          <label for="ship-city">City</label>
          <input id="ship-city" value="${esc(s.city)}" />
          <span class="field-error" id="ship-city-error"></span>
        </div>
        <div class="field">
          <label for="ship-zip">Zip / postal code</label>
          <input id="ship-zip" value="${esc(s.zip)}" />
          <span class="field-error" id="ship-zip-error"></span>
        </div>
        <div class="field field-span-2">
          <label for="ship-country">Country</label>
          <select id="ship-country">
            <option value="">Select…</option>
            ${countryOptions(s.country)}
          </select>
          <span class="field-error" id="ship-country-error"></span>
        </div>
      </div>`;
  }

  function renderForm() {
    const b = state.billing;
    const p = state.payment;
    const { total } = totals();
    document.getElementById("checkout-main").innerHTML = `
      <form class="checkout-form" id="checkout-form" novalidate>
        <section class="checkout-panel" id="section-billing">
          <h2>1. Billing information</h2>
          <div class="form-grid">
            <div class="field">
              <label for="bill-first">First name</label>
              <input id="bill-first" value="${esc(b.firstName)}" required />
              <span class="field-error" id="bill-first-error"></span>
            </div>
            <div class="field">
              <label for="bill-last">Last name</label>
              <input id="bill-last" value="${esc(b.lastName)}" required />
              <span class="field-error" id="bill-last-error"></span>
            </div>
            <div class="field">
              <label for="bill-email">Email</label>
              <input id="bill-email" type="email" value="${esc(b.email)}" required />
              <span class="field-error" id="bill-email-error"></span>
            </div>
            <div class="field">
              <label for="bill-phone">Telephone</label>
              <input id="bill-phone" type="tel" value="${esc(b.phone)}" required />
              <span class="field-error" id="bill-phone-error"></span>
            </div>
            <div class="field field-span-2">
              <label for="bill-address">Address</label>
              <input id="bill-address" value="${esc(b.address)}" required />
              <span class="field-error" id="bill-address-error"></span>
            </div>
            <div class="field">
              <label for="bill-city">City</label>
              <input id="bill-city" value="${esc(b.city)}" required />
              <span class="field-error" id="bill-city-error"></span>
            </div>
            <div class="field">
              <label for="bill-zip">Zip / postal code</label>
              <input id="bill-zip" value="${esc(b.zip)}" required />
              <span class="field-error" id="bill-zip-error"></span>
            </div>
            <div class="field field-span-2">
              <label for="bill-country">Country</label>
              <select id="bill-country" required>
                <option value="">Select…</option>
                ${countryOptions(b.country)}
              </select>
              <span class="field-error" id="bill-country-error"></span>
            </div>
          </div>
          <label class="check-row"><input type="checkbox" id="bill-newsletter" ${b.newsletter ? "checked" : ""} /> Sign up for newsletter</label>
          <label class="check-row"><input type="checkbox" id="bill-ship-same" ${state.shipSame ? "checked" : ""} /> Ship to same address</label>
        </section>

        <section class="checkout-panel" id="section-shipping">
          <h2>2. Shipping method</h2>
          <div class="ship-options">
            <label class="ship-option ${state.shippingMethod === "standard" ? "selected" : ""}">
              <input type="radio" name="ship-method" value="standard" ${state.shippingMethod === "standard" ? "checked" : ""} />
              <div>
                <strong>Standard delivery</strong>
                <span class="meta">5–7 business days · Free</span>
              </div>
            </label>
            <label class="ship-option ${state.shippingMethod === "express" ? "selected" : ""}">
              <input type="radio" name="ship-method" value="express" ${state.shippingMethod === "express" ? "checked" : ""} />
              <div>
                <strong>Express delivery</strong>
                <span class="meta">2–3 business days · ${Warners.money(15)}</span>
              </div>
            </label>
          </div>
          <p class="meta ship-note" id="ship-note" ${state.shipSame ? "" : "hidden"}>Delivering to your billing address.</p>
          <div id="alt-shipping-wrap" ${state.shipSame ? "hidden" : ""}>
            <h3 class="ship-alt-title">Delivery address</h3>
            ${altShippingFields()}
          </div>
        </section>

        <section class="checkout-panel" id="section-payment">
          <h2>3. Payment method</h2>
          <p class="meta">Demo checkout — no real card is charged.</p>
          <div class="form-grid">
            <div class="field field-span-2">
              <label for="pay-name">Name on card</label>
              <input id="pay-name" value="${esc(p.cardName)}" autocomplete="cc-name" />
              <span class="field-error" id="pay-name-error"></span>
            </div>
            <div class="field field-span-2">
              <label for="pay-number">Card number</label>
              <input id="pay-number" inputmode="numeric" placeholder="4242 4242 4242 4242" value="${esc(p.cardNumber)}" autocomplete="cc-number" />
              <span class="field-error" id="pay-number-error"></span>
            </div>
            <div class="field">
              <label for="pay-expiry">Expiry</label>
              <input id="pay-expiry" placeholder="MM/YY" value="${esc(p.expiry)}" autocomplete="cc-exp" />
              <span class="field-error" id="pay-expiry-error"></span>
            </div>
            <div class="field">
              <label for="pay-cvv">CVV</label>
              <input id="pay-cvv" inputmode="numeric" placeholder="123" value="${esc(p.cvv)}" autocomplete="cc-csc" />
              <span class="field-error" id="pay-cvv-error"></span>
            </div>
          </div>
          <div class="checkout-actions">
            <a class="btn btn-outline" href="cart.html">Back to cart</a>
            <button class="btn" type="submit" id="place-order">Place order · ${Warners.money(total)}</button>
          </div>
        </section>
      </form>`;
  }

  function toggleAltShipping(show) {
    const wrap = document.getElementById("alt-shipping-wrap");
    const note = document.getElementById("ship-note");
    if (wrap) wrap.hidden = !show;
    if (note) note.hidden = show;
    if (show && !document.getElementById("ship-address")) {
      wrap.innerHTML = `<h3 class="ship-alt-title">Delivery address</h3>${altShippingFields()}`;
    }
  }

  function updatePlaceOrderLabel() {
    const btn = document.getElementById("place-order");
    if (btn) btn.textContent = `Place order · ${Warners.money(totals().total)}`;
  }

  function bindEvents() {
    document.getElementById("checkout-form").addEventListener("submit", (e) => {
      e.preventDefault();
      placeOrder();
    });
    document.getElementById("bill-ship-same").addEventListener("change", (e) => {
      state.shipSame = e.target.checked;
      toggleAltShipping(!state.shipSame);
    });
    document.querySelectorAll('input[name="ship-method"]').forEach((input) => {
      input.addEventListener("change", () => {
        state.shippingMethod = input.value;
        document.querySelectorAll(".ship-option").forEach((el) => el.classList.remove("selected"));
        input.closest(".ship-option")?.classList.add("selected");
        renderSummary();
        updatePlaceOrderLabel();
      });
    });
  }

  function saveProfileFromBilling() {
    if (!Warners.isCustomer()) return;
    Warners.updateCustomerProfile(
      {
        firstName: state.billing.firstName,
        lastName: state.billing.lastName,
        email: state.billing.email,
        phone: state.billing.phone,
        address: state.billing.address,
        city: state.billing.city,
        zip: state.billing.zip,
        country: state.billing.country,
      },
      { silent: true }
    );
  }

  function renderConfirmation(order) {
    document.getElementById("checkout-main").innerHTML = `
      <section class="checkout-panel receipt">
        <p class="hero-kicker" style="margin:0 0 0.35rem">Order confirmed</p>
        <h2 style="margin:0 0 0.45rem">Thank you — ${order.id}</h2>
        <p class="meta">Your order total is ${Warners.money(order.total)}. A confirmation has been saved to your account.</p>
        <div class="detail-actions" style="margin-top:1rem">
          ${Warners.getRole() === "customer" ? `<a class="btn" href="account.html">My account</a>` : ""}
          <a class="btn btn-outline" href="home.html">Continue shopping</a>
        </div>
      </section>`;
    document.getElementById("checkout-summary").innerHTML = `
      <div class="summary">
        <h3>Order ${order.id}</h3>
        <div class="summary-row"><span>Total paid</span><span>${Warners.money(order.total)}</span></div>
        <div class="summary-row"><span>Tracking</span><span>${order.trackingNumber || "—"}</span></div>
      </div>`;
  }

  function placeOrder() {
    if (!validateForm()) {
      firstInvalidField()?.scrollIntoView({ behavior: "smooth", block: "center" });
      firstInvalidField()?.focus();
      Warners.toast("Please fill in the required fields");
      return;
    }

    try {
      sessionStorage.removeItem("warners_pending_checkout");
    } catch {
      /* ignore */
    }

    const { shippingCost } = totals();
    const result = Warners.placeOrder({
      billing: { ...state.billing },
      shippingAddress: shippingAddress(),
      shippingMethod: state.shippingMethod,
      shippingCost,
      paymentMethod: "card",
    });

    if (!result.ok) {
      Warners.toast(result.error || "Could not place order");
      return;
    }

    saveProfileFromBilling();
    Warners.toast(`Order ${result.order.id} placed — thank you!`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    renderConfirmation(result.order);
  }

  function esc(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function countryOptions(selected) {
    const countries = ["Australia", "New Zealand", "United States", "United Kingdom", "Canada", "India", "Other"];
    return countries
      .map((c) => `<option value="${c}" ${selected === c ? "selected" : ""}>${c}</option>`)
      .join("");
  }

  prefillFromAccount();
  renderSummary();
  renderForm();
  bindEvents();
})();
