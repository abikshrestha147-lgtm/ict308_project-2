/* Abik — customer home (public browse) */
Warners.renderHeader("home");
Warners.bindAddButtons();

document.getElementById("featured").innerHTML = Warners.getProducts()
  .slice(0, 8)
  .map(Warners.productCard)
  .join("");

document.getElementById("home-recs").innerHTML = Warners.getRecommendations()
  .slice(0, 8)
  .map(Warners.productCard)
  .join("");
