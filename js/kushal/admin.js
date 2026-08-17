/* Kushal — admin dashboard */
(function () {
  Warners.requireRole(["admin"]);

  const session = Warners.getSessionUser();
  const userLabel = session?.label || session?.name || session?.username || "Admin";
  document.getElementById("admin-user-name").textContent = userLabel;
  document.getElementById("admin-avatar").textContent = String(userLabel).charAt(0).toUpperCase();
  document.querySelector("[data-logout]")?.addEventListener("click", () => Warners.logout());

  const modal = document.getElementById("product-modal");
  let galleryDraft = [];
  let stockFilter = "all";
  const MAX_GALLERY = 12;
  const MAX_PHOTO_BYTES = 900000;

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("not-image"));
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        reject(new Error("too-large"));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("read-failed"));
      reader.readAsDataURL(file);
    });
  }

  function fillCatFilter() {
    const catSelect = document.getElementById("admin-cat");
    const editCat = document.getElementById("edit-category");
    const current = catSelect.value;
    catSelect.innerHTML = `<option value="">Category: All</option>`;
    editCat.innerHTML = "";
    Warners.getCategories().forEach((c) => {
      catSelect.appendChild(new Option(c, c));
      editCat.appendChild(new Option(c, c));
    });
    catSelect.value = current;
  }

  function openProductModal(product) {
    document.getElementById("modal-title").textContent = product
      ? "Edit product"
      : "Add product";
    document.getElementById("edit-id").value = product?.id || "";
    document.getElementById("edit-name").value = product?.name || "";
    document.getElementById("edit-category").value =
      product?.category || Warners.getCategories()[0] || "Accessories";
    document.getElementById("edit-brand").value = product?.brand || "";
    document.getElementById("edit-price").value = product?.price ?? 99;
    document.getElementById("edit-stock").value = product?.stock ?? 20;
    document.getElementById("edit-weight").value = product?.weight ?? 0.8;
    document.getElementById("edit-subtitle").value = product?.subtitle || "";
    document.getElementById("edit-description").value = product?.description || "";
    renderSpecsEditor(product?.specs || []);
    document.getElementById("edit-image").value = product?.image || "";
    document.getElementById("edit-image-file").value = "";
    document.getElementById("edit-gallery-files").value = "";
    galleryDraft = [...(product?.gallery || [])];
    renderPhotoPreview(product?.image || "");
    renderGalleryPreview();
    modal.classList.add("open");
  }

  function closeModal() {
    modal.classList.remove("open");
  }

  function renderPhotoPreview(src) {
    const preview = document.getElementById("photo-preview");
    const removeBtn = document.getElementById("remove-cover");
    if (removeBtn) removeBtn.hidden = !src;
    if (!src) {
      preview.innerHTML = "No cover photo";
      return;
    }
    preview.innerHTML = `<img src="${src}" alt="Cover photo preview" />`;
  }

  function clearCoverPhoto() {
    document.getElementById("edit-image").value = "";
    document.getElementById("edit-image-file").value = "";
    renderPhotoPreview("");
  }

  function renderSpecsEditor(specs) {
    const list = document.getElementById("specs-list");
    const items = specs.length ? specs : [""];
    list.innerHTML = items
      .map(
        (text, i) => `
      <div class="spec-row" data-spec-row="${i}">
        <span class="spec-bullet" aria-hidden="true">•</span>
        <input type="text" class="spec-input" value="${String(text).replace(/"/g, "&quot;")}" placeholder="e.g. 14-inch display" />
        <button class="spec-remove" type="button" data-spec-remove="${i}" aria-label="Remove bullet">×</button>
      </div>`
      )
      .join("");
  }

  function collectSpecs() {
    return [...document.querySelectorAll("#specs-list .spec-input")]
      .map((input) => input.value.trim())
      .filter(Boolean);
  }

  document.getElementById("remove-cover").addEventListener("click", clearCoverPhoto);

  document.getElementById("add-spec").addEventListener("click", () => {
    renderSpecsEditor([...collectSpecs(), ""]);
    const inputs = document.querySelectorAll("#specs-list .spec-input");
    inputs[inputs.length - 1]?.focus();
  });

  document.getElementById("specs-list").addEventListener("click", (e) => {
    if (e.target.getAttribute("data-spec-remove") == null) return;
    const row = e.target.closest(".spec-row");
    const values = [...document.querySelectorAll("#specs-list .spec-row")].map(
      (r) => r.querySelector(".spec-input").value
    );
    const idx = [...document.querySelectorAll("#specs-list .spec-row")].indexOf(row);
    if (idx >= 0) values.splice(idx, 1);
    renderSpecsEditor(values.length ? values : [""]);
  });

  function renderGalleryPreview() {
    const preview = document.getElementById("gallery-preview");
    if (!galleryDraft.length) {
      preview.innerHTML = '<span class="meta">No gallery photos yet</span>';
      return;
    }
    preview.innerHTML = galleryDraft
      .map(
        (src, i) => `
      <div class="gallery-thumb">
        <img src="${src}" alt="" />
        <button class="gallery-remove" type="button" data-gi="${i}" aria-label="Remove photo">×</button>
      </div>`
      )
      .join("");
  }

  document.getElementById("edit-image-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await readImageFile(file);
      document.getElementById("edit-image").value = dataUrl;
      renderPhotoPreview(dataUrl);
    } catch (err) {
      if (err.message === "too-large") {
        Warners.toast("Choose a smaller photo (under 900KB)");
      } else {
        Warners.toast("Choose an image file");
      }
    }
  });

  document.getElementById("edit-gallery-files").addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    let added = 0;
    for (const file of files) {
      if (galleryDraft.length >= MAX_GALLERY) {
        Warners.toast(`Gallery limit is ${MAX_GALLERY} photos`);
        break;
      }
      try {
        galleryDraft.push(await readImageFile(file));
        added += 1;
      } catch (err) {
        if (err.message === "too-large") {
          Warners.toast(`${file.name} is too large (max 900KB)`);
        }
      }
    }
    if (added) renderGalleryPreview();
  });

  document.getElementById("gallery-preview").addEventListener("click", (e) => {
    const idx = e.target.getAttribute("data-gi");
    if (idx == null) return;
    galleryDraft.splice(Number(idx), 1);
    renderGalleryPreview();
  });

  function stockStatus(p) {
    if (Number(p.stock) <= 0) return { key: "out", label: "Out of stock" };
    if (Number(p.stock) < 10) return { key: "low", label: "Low stock" };
    return { key: "ok", label: "In stock" };
  }

  function filteredProducts() {
    const q = document.getElementById("admin-q").value.trim().toLowerCase();
    const cat = document.getElementById("admin-cat").value;
    return Warners.getProducts().filter((p) => {
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const status = stockStatus(p).key;
      const matchStock =
        stockFilter === "all" ||
        (stockFilter === "ok" && status === "ok") ||
        (stockFilter === "low" && status === "low") ||
        (stockFilter === "out" && status === "out");
      return matchQ && matchStock && (!cat || p.category === cat);
    });
  }

  function renderProductTabs() {
    const all = Warners.getProducts();
    const counts = {
      all: all.length,
      ok: all.filter((p) => stockStatus(p).key === "ok").length,
      low: all.filter((p) => stockStatus(p).key === "low").length,
      out: all.filter((p) => stockStatus(p).key === "out").length,
    };
    document.getElementById("product-tabs").innerHTML = [
      ["all", `All ${counts.all}`],
      ["ok", `In stock ${counts.ok}`],
      ["low", `Low ${counts.low}`],
      ["out", `Out ${counts.out}`],
    ]
      .map(
        ([key, label]) =>
          `<button class="admin-tab${stockFilter === key ? " active" : ""}" type="button" data-stock="${key}">${label}</button>`
      )
      .join("");
  }

  function renderDashboard() {
    const products = Warners.getProducts();
    const s = Warners.getReportSummary();
    const low = products.filter((p) => stockStatus(p).key !== "ok");
    document.getElementById("dash-kpis").innerHTML = `
      <article class="admin-kpi"><span>Products</span><strong>${products.length}</strong><em>${Warners.getCategories().length} categories</em></article>
      <article class="admin-kpi"><span>Orders</span><strong>${s.orderCount.toLocaleString()}</strong><em>${s.weekOrders} this week</em></article>
      <article class="admin-kpi"><span>Revenue</span><strong>${Warners.money(s.totalRevenue)}</strong><em>${Warners.money(s.weekRevenue)} this week</em></article>
      <article class="admin-kpi"><span>Low stock</span><strong>${low.length}</strong><em>needs a catalogue check</em></article>`;
    document.getElementById("dash-alerts").innerHTML = low.length
      ? low
          .slice(0, 8)
          .map(
            (p) => `
        <div class="admin-alert">
          <div><strong>${p.name}</strong><span>${p.category} · ${stockStatus(p).label}</span></div>
          <strong>${p.stock}</strong>
        </div>`
          )
          .join("")
      : `<p class="admin-empty">All products are in healthy stock.</p>`;
    document.getElementById("dash-orders").innerHTML = s.recent.length
      ? s.recent
          .slice(0, 6)
          .map(
            (o) => `
        <div class="admin-order">
          <div><strong>${o.id}</strong><span>${new Date(o.placedAt).toLocaleString()}</span></div>
          <strong>${Warners.money(o.total)}</strong>
        </div>`
          )
          .join("")
      : `<p class="admin-empty">No checkouts yet.</p>`;
  }

  function renderTable() {
    renderProductTabs();
    const list = filteredProducts();
    document.getElementById("product-count").textContent = `${list.length} shown`;
    document.getElementById("catalogue").innerHTML = list.length
      ? list
          .map((p) => {
            const status = stockStatus(p);
            return `
          <article class="admin-product">
            <div class="admin-prod-main">
              ${
                p.image
                  ? `<span class="prod-photo-frame"><img src="${p.image}" alt="" /></span>`
                  : `<span class="prod-ico">${p.emoji || "📦"}</span>`
              }
              <div class="admin-prod-copy">
                <strong>${p.name}</strong>
                <span>${p.brand || "Warner"} · ${p.category}</span>
              </div>
            </div>
            <span class="admin-status ${status.key}"><i></i>${status.label}</span>
            <div class="admin-metric"><span>Price</span><strong>${Warners.money(p.price)}</strong></div>
            <div class="admin-metric"><span>Stock</span><strong>${p.stock}</strong></div>
            <div class="admin-prod-actions">
              <button class="btn btn-outline btn-sm" type="button" data-edit="${p.id}">Edit</button>
              <button class="btn btn-danger btn-sm" type="button" data-del="${p.id}">Del</button>
            </div>
          </article>`;
          })
          .join("")
      : `<p class="admin-empty">No products match this filter.</p>`;
  }

  function renderCategories() {
    document.getElementById("cat-list").innerHTML = Warners.getCategories()
      .map(
        (c) =>
          `<button class="admin-cat-chip" type="button" data-del-cat="${c}" title="Click to remove">${c} ×</button>`
      )
      .join("");
  }

  function showTab(name) {
    ["dashboard", "products", "categories", "reports", "settings"].forEach((t) => {
      document.getElementById(`view-${t}`).hidden = t !== name;
    });
    document.querySelectorAll(".admin-nav-link[data-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
    });
    if (name === "dashboard") renderDashboard();
    if (name === "reports") WarnersReports.renderSalesReports(document.getElementById("admin-reports"));
    if (name === "products") renderTable();
  }

  document.querySelectorAll(".admin-nav-link[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab")));
  });
  document.getElementById("admin-q").addEventListener("input", () => {
    if (document.getElementById("admin-q").value.trim()) showTab("products");
    else if (!document.getElementById("view-products").hidden) renderTable();
  });
  document.getElementById("admin-cat").addEventListener("change", renderTable);
  document.getElementById("product-tabs").addEventListener("click", (e) => {
    const key = e.target.getAttribute("data-stock");
    if (!key) return;
    stockFilter = key;
    renderTable();
  });

  document.getElementById("add-product").onclick = () => openProductModal(null);
  document.getElementById("modal-cancel").onclick = closeModal;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById("modal-save").onclick = () => {
    const id = document.getElementById("edit-id").value;
    const data = {
      name: document.getElementById("edit-name").value.trim(),
      category: document.getElementById("edit-category").value,
      brand: document.getElementById("edit-brand").value.trim(),
      price: Number(document.getElementById("edit-price").value),
      stock: Number(document.getElementById("edit-stock").value),
      weight: Number(document.getElementById("edit-weight").value),
      subtitle: document.getElementById("edit-subtitle").value.trim(),
      description: document.getElementById("edit-description").value.trim(),
      specs: collectSpecs(),
      image: document.getElementById("edit-image").value,
      gallery: galleryDraft,
    };
    if (!data.name) {
      Warners.toast("Name is required");
      return;
    }
    if (id) Warners.updateProduct(id, data);
    else Warners.addProduct(data);
    closeModal();
    fillCatFilter();
    renderTable();
    renderDashboard();
  };

  document.getElementById("catalogue").addEventListener("click", (e) => {
    const editId = e.target.getAttribute("data-edit");
    const delId = e.target.getAttribute("data-del");
    if (editId) openProductModal(Warners.productById(editId));
    if (delId && confirm("Delete this product?")) {
      Warners.deleteProduct(delId);
      renderTable();
    }
  });

  function addCategoryFromInput() {
    const name = document.getElementById("cat-input").value.trim();
    if (!name) return;
    Warners.addCategory(name);
    document.getElementById("cat-input").value = "";
    renderCategories();
    fillCatFilter();
  }
  document.getElementById("add-cat").onclick = addCategoryFromInput;
  document.getElementById("add-cat-inline").onclick = addCategoryFromInput;

  document.getElementById("cat-list").addEventListener("click", (e) => {
    const name = e.target.getAttribute("data-del-cat");
    if (name && confirm(`Remove category "${name}"?`)) {
      Warners.deleteCategory(name);
      renderCategories();
      fillCatFilter();
      renderTable();
    }
  });

  document.getElementById("reset-data").onclick = () => {
    localStorage.removeItem("warners_products");
    localStorage.removeItem("warners_categories");
    localStorage.removeItem("warners_rules");
    Warners.toast("Demo catalogue reset");
    fillCatFilter();
    renderTable();
    renderCategories();
  };
  document.getElementById("clear-orders").onclick = () => {
    if (!confirm("Clear all recorded orders and revenue?")) return;
    localStorage.removeItem("warners_orders");
    Warners.toast("Sales history cleared");
    if (!document.getElementById("view-reports").hidden) {
      WarnersReports.renderSalesReports(document.getElementById("admin-reports"));
    }
  };

  fillCatFilter();
  renderTable();
  renderCategories();
  renderDashboard();
  window.addEventListener("storage", (e) => {
    if (e.key === "warners_orders") {
      renderDashboard();
      if (!document.getElementById("view-reports").hidden) {
        WarnersReports.renderSalesReports(document.getElementById("admin-reports"));
      }
    }
  });
  const hash = location.hash.replace("#", "");
  if (["dashboard", "products", "categories", "reports", "settings"].includes(hash)) {
    showTab(hash);
  }
})();
