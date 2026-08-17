/* Kushal — admin dashboard */
(function () {
  Warners.requireRole(["admin"]);
  Warners.renderHeader("products");

  const modal = document.getElementById("product-modal");
  let galleryDraft = [];
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
    catSelect.innerHTML = `<option value="">Filter Category</option>`;
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

  function renderTable() {
    const q = document.getElementById("admin-q").value.trim().toLowerCase();
    const cat = document.getElementById("admin-cat").value;
    const list = Warners.getProducts().filter((p) => {
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchQ && (!cat || p.category === cat);
    });
    document.getElementById("catalogue").innerHTML = `
      <thead>
        <tr>
          <th>Product</th><th>Category</th><th>Price</th><th>Stock</th>
          <th>Weight</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            (p) => `
          <tr>
            <td><div class="prod-cell">${
              p.image
                ? `<span class="prod-photo-frame"><img src="${p.image}" alt="" /></span>`
                : `<span class="prod-ico">${p.emoji || "📦"}</span>`
            }${p.name}<div class="meta">${p.brand || ""}</div></div></td>
            <td>${p.category}</td>
            <td>${Warners.money(p.price)}</td>
            <td>${p.stock}</td>
            <td>${p.weight}</td>
            <td>
              <button class="btn btn-outline btn-sm" type="button" data-edit="${p.id}">Edit</button>
              <button class="btn btn-danger btn-sm" type="button" data-del="${p.id}">Del</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>`;
  }

  function renderCategories() {
    document.getElementById("cat-list").innerHTML = Warners.getCategories()
      .map(
        (c) =>
          `<button class="pill active" type="button" data-del-cat="${c}" title="Click to remove">${c} ×</button>`
      )
      .join("");
  }

  function showTab(name) {
    ["products", "categories", "reports", "settings"].forEach((t) => {
      document.getElementById(`view-${t}`).hidden = t !== name;
    });
    document.querySelectorAll(".side-link[data-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
    });
    Warners.renderHeader(name === "reports" ? "reports" : "products");
    if (name === "reports") WarnersReports.renderSalesReports(document.getElementById("admin-reports"));
  }

  document.querySelectorAll(".side-link[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab")));
  });
  document.getElementById("admin-q").addEventListener("input", renderTable);
  document.getElementById("admin-cat").addEventListener("change", renderTable);

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
  window.addEventListener("storage", (e) => {
    if (e.key === "warners_orders" && !document.getElementById("view-reports").hidden) {
      WarnersReports.renderSalesReports(document.getElementById("admin-reports"));
    }
  });
  const hash = location.hash.replace("#", "");
  if (["products", "categories", "reports", "settings"].includes(hash)) {
    showTab(hash);
  }
})();
