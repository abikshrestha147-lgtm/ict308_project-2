/* Kushal — login + create account */
(function () {
  const loginView = document.getElementById("login-view");
  const signupView = document.getElementById("signup-view");

  function showSignup() {
    loginView.hidden = true;
    signupView.hidden = false;
  }
  function showLogin() {
    signupView.hidden = true;
    loginView.hidden = false;
  }

  if (new URLSearchParams(location.search).get("signup") === "1") showSignup();

  if (Warners.hasAccountSession()) {
    location.href = Warners.afterLoginPath(Warners.getRole());
  }

  Warners.renderHeader("login");

  document.getElementById("show-signup").onclick = showSignup;
  document.getElementById("show-login").onclick = showLogin;

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const user = Warners.login(
      document.getElementById("username").value,
      document.getElementById("password").value
    );
    const err = document.getElementById("error");
    if (!user) {
      err.style.display = "block";
      err.textContent =
        "Login failed. Create a customer account first, or use admin/owner.";
      return;
    }
    location.href = Warners.afterLoginPath(user.role);
  });

  document.getElementById("signup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = document.getElementById("signup-error");
    const password = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-password").value;
    if (password !== confirm) {
      err.style.display = "block";
      err.textContent = "Passwords do not match.";
      return;
    }
    const result = Warners.registerCustomer({
      name: document.getElementById("full-name").value,
      username: document.getElementById("new-username").value,
      password,
    });
    if (!result.ok) {
      err.style.display = "block";
      err.textContent = result.error;
      return;
    }
    const user = Warners.login(
      document.getElementById("new-username").value,
      password
    );
    location.href = Warners.afterLoginPath(user.role);
  });
})();
