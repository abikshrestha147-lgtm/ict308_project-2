/* Kushal — login + create account */
(function () {
  const loginView = document.getElementById("login-view");
  const signupView = document.getElementById("signup-view");
  const loginTab = document.getElementById("show-login");
  const signupTab = document.getElementById("show-signup");

  function showSignup() {
    loginView.hidden = true;
    signupView.hidden = false;
    loginTab.classList.remove("active");
    signupTab.classList.add("active");
    loginTab.setAttribute("aria-selected", "false");
    signupTab.setAttribute("aria-selected", "true");
    Warners.animateView(signupView);
  }

  function showLogin() {
    signupView.hidden = true;
    loginView.hidden = false;
    signupTab.classList.remove("active");
    loginTab.classList.add("active");
    signupTab.setAttribute("aria-selected", "false");
    loginTab.setAttribute("aria-selected", "true");
    Warners.animateView(loginView);
  }

  if (new URLSearchParams(location.search).get("signup") === "1") showSignup();

  if (Warners.hasAccountSession()) {
    location.href = Warners.afterLoginPath(Warners.getRole());
  }

  Warners.renderHeader("login");

  signupTab.addEventListener("click", showSignup);
  loginTab.addEventListener("click", showLogin);

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = document.getElementById("error");
    err.hidden = true;
    const user = Warners.login(
      document.getElementById("username").value,
      document.getElementById("password").value
    );
    if (!user) {
      err.hidden = false;
      err.textContent =
        "We couldn't sign you in. Check your details or create an account first.";
      return;
    }
    location.href = Warners.afterLoginPath(user.role);
  });

  document.getElementById("signup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = document.getElementById("signup-error");
    err.hidden = true;
    const password = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-password").value;
    if (password !== confirm) {
      err.hidden = false;
      err.textContent = "Passwords do not match. Please try again.";
      return;
    }
    const result = Warners.registerCustomer({
      name: document.getElementById("full-name").value,
      username: document.getElementById("new-username").value,
      password,
    });
    if (!result.ok) {
      err.hidden = false;
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
