/* Abik — search + filters (public browse) */
Warners.renderHeader("search");
Warners.bindAddButtons();

const params = new URLSearchParams(location.search);
const searchInput = document.querySelector(".header-search input");
const searchForm = document.querySelector(".header-search");
if (searchInput && !searchInput.value) searchInput.value = params.get("q") || "";
const preCat = params.get("cat") || "";
const filters = document.querySelector(".filters");

document.getElementById("cat-filters").innerHTML = Warners.getCategories()
  .map(
    (c) =>
      `<label><input type="checkbox" data-cat="${c}" ${
        preCat === c ? "checked" : ""
      } /> ${c}</label>`
  )
  .join("");

document.getElementById("brand-filters").innerHTML = Warners.getBrands()
  .map((b) => `<label><input type="checkbox" data-brand="${b}" /> ${b}</label>`)
  .join("") || `<p class="meta">No brands yet.</p>`;

function readPriceRange(root) {
  const minEl = root.querySelector("[data-price-min]");
  const maxEl = root.querySelector("[data-price-max]");
  return {
    minPrice: minEl?.value.trim() || null,
    maxPrice: maxEl?.value.trim() || null,
  };
}

function hasActiveFilters({ q, cats, brands, minPrice, maxPrice }) {
  return !!(q || cats.length || brands.length || minPrice || maxPrice);
}

function render() {
  const q = (searchInput?.value || "").trim().toLowerCase();
  const cats = [...document.querySelectorAll("[data-cat]:checked")].map((e) =>
    e.getAttribute("data-cat")
  );
  const brands = [...document.querySelectorAll("[data-brand]:checked")].map((e) =>
    e.getAttribute("data-brand")
  );
  const { minPrice, maxPrice } = readPriceRange(filters);

  const list = Warners.filterProducts({ q, cats, brands, minPrice, maxPrice });

  const heading = document.getElementById("search-heading");
  if (heading) {
    heading.textContent = hasActiveFilters({ q, cats, brands, minPrice, maxPrice })
      ? "Search results"
      : "All products";
  }
  document.getElementById("count").textContent =
    `Showing ${list.length} results sorted by relevance.`;
  document.getElementById("results").innerHTML = list.length
    ? list.map(Warners.productCard).join("")
    : `<div class="panel">No products match your filters.</div>`;
}

searchForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = (searchInput?.value || "").trim();
  if (q) Warners.recordSearch(q);
  syncQueryInUrl();
  render();
});
filters.addEventListener("change", render);
filters.addEventListener("input", (e) => {
  if (e.target.matches("[data-price-min], [data-price-max]")) render();
});
searchInput?.addEventListener("input", () => {
  syncQueryInUrl();
  render();
});

searchInput?.focus();
if (searchInput) {
  searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
}
render();

function syncQueryInUrl() {
  const url = new URL(location.href);
  const q = (searchInput?.value || "").trim();
  if (q) url.searchParams.set("q", q);
  else url.searchParams.delete("q");
  history.replaceState(null, "", url);
}
