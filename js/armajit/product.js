/* Armajit — product details (public browse) */
Warners.renderHeader("products");

const id = new URLSearchParams(location.search).get("id");
const p = Warners.productById(id);
const root = document.getElementById("root");

if (!p) {
  root.innerHTML = `<div class="panel">Product not found. <a href="home.html">Back</a></div>`;
} else {
  Warners.trackView(p.id);
  const related = Warners.getRecommendations(p.id).slice(0, 4);
  const photos = Warners.productGallery(p);
  const artHtml = photos.length
    ? `<div class="product-gallery">
        <div class="gallery-main tone-${p.tone || "blue"}">
          <img id="gallery-main" src="${photos[0]}" alt="${p.name}" />
        </div>
        ${
          photos.length > 1
            ? `<div class="gallery-thumbs">
                ${photos
                  .map(
                    (src, i) => `
                  <button class="gallery-thumb-btn${i === 0 ? " active" : ""}" type="button" data-photo-idx="${i}">
                    <img src="${src}" alt="" />
                  </button>`
                  )
                  .join("")}
              </div>`
            : ""
        }
      </div>`
    : `<div class="detail-art tone-${p.tone || "blue"}">${p.emoji || "📦"}</div>`;

  root.innerHTML = `
    <section class="detail">
      ${artHtml}
      <div>
        <h1 style="margin:0 0 0.35rem">${p.name}</h1>
        <p class="meta">${p.description}</p>
        <div class="price" style="font-size:1.5rem;margin:0.75rem 0">${Warners.money(p.price)}</div>
        <div class="tags">${(p.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</div>
        ${
          (p.specs || []).length
            ? `<h3 style="margin:0.5rem 0;font-size:1rem">Key specifications</h3>
        <ul class="specs">${(p.specs || []).map((s) => `<li>${s}</li>`).join("")}</ul>`
            : ""
        }
        <div class="detail-actions">
          <button class="btn" type="button" id="buy">Add to Cart</button>
          <button class="btn btn-outline" type="button" id="save">Save for Later</button>
        </div>
      </div>
    </section>
    <h2 class="section-title" style="margin-top:1.5rem">Recommended for this product</h2>
    <p class="meta" style="margin-top:-0.35rem;margin-bottom:0.85rem">
      Suggested accessories and related items based on this product — they update when you view or add it to cart.
    </p>
    <div class="grid" id="related">${related.map(Warners.productCard).join("")}</div>`;

  if (photos.length > 1) {
    const main = document.getElementById("gallery-main");
    root.querySelectorAll(".gallery-thumb-btn").forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute("data-photo-idx"));
        main.src = photos[idx];
        root.querySelectorAll(".gallery-thumb-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });
  }

  document.getElementById("buy").onclick = () => {
    Warners.addToCart(p.id);
    const next = Warners.getRecommendations(p.id).slice(0, 4);
    document.getElementById("related").innerHTML = next
      .map(Warners.productCard)
      .join("");
    Warners.renderHeader("products");
  };
  document.getElementById("save").onclick = () =>
    Warners.toast("Saved for later (demo)");
  Warners.bindAddButtons(document.getElementById("related"));
}
