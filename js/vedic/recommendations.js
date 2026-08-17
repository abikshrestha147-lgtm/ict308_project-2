/* Vedic — recommendation page (public browse) */
Warners.renderHeader("recommendations");
Warners.bindAddButtons();

const cart = Warners.getCart();
const viewed = Warners.getViewedIds();
const why = [];
if (cart.length) why.push("items in your cart");
if (viewed.length) why.push("products you viewed");
if (Warners.getPurchasedIds().length) why.push("things you bought");
document.getElementById("why").textContent = why.length
  ? "Using " + why.join(", ") + "."
  : "Browse or buy something and recommendations will fill in automatically.";

const recs = Warners.getRecommendations();
document.getElementById("recs").innerHTML = recs.length
  ? recs.map(Warners.productCard).join("")
  : `<div class="panel">Browse or add something to your cart to unlock smarter recommendations. <a href="home.html">Start shopping</a></div>`;

document.getElementById("popular").innerHTML = Warners.getProducts()
  .slice()
  .sort((a, b) => (b.weight || 0) - (a.weight || 0))
  .slice(0, 4)
  .map(Warners.productCard)
  .join("");
