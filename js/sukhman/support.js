/* Sukhman — customer support (public) */
Warners.renderHeader("support");

const formPanel = document.getElementById("support-form-panel");
const hoursPanel = document.getElementById("support-hours-panel");

document.getElementById("open-support-form")?.addEventListener("click", () => {
  formPanel.hidden = !formPanel.hidden;
  hoursPanel.hidden = true;
  if (!formPanel.hidden) {
    formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("support-name")?.focus();
  }
});

document.getElementById("show-hours")?.addEventListener("click", () => {
  hoursPanel.hidden = !hoursPanel.hidden;
  formPanel.hidden = true;
  if (!hoursPanel.hidden) {
    hoursPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

document.getElementById("support-form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  Warners.toast("Message sent — our team will reply soon (demo)");
  e.target.reset();
  formPanel.hidden = true;
});

document.getElementById("support-chat")?.addEventListener("click", () => {
  formPanel.hidden = false;
  hoursPanel.hidden = true;
  formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  Warners.toast("Live chat opens the support form in this demo");
});
