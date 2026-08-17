/* Kushal — owner dashboard (staff reports) */
(function () {
  Warners.requireRole(["owner"]);
  Warners.renderHeader("reports");

  function draw() {
    WarnersReports.renderSalesReports(document.getElementById("owner-reports"));
    WarnersReports.renderPerformance(document.getElementById("owner-performance"));
  }

  function showTab(name) {
    ["reports", "performance"].forEach((t) => {
      document.getElementById(`view-${t}`).hidden = t !== name;
    });
    document.querySelectorAll(".side-link[data-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-tab") === name);
    });
    Warners.renderHeader(name);
    draw();
  }

  document.querySelectorAll(".side-link[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.getAttribute("data-tab")));
  });

  draw();
  window.addEventListener("storage", (e) => {
    if (e.key === "warners_orders") draw();
  });
  const hash = location.hash.replace("#", "");
  if (["reports", "performance"].includes(hash)) showTab(hash);
})();
