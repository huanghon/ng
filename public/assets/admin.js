(function () {
  const loginPanel = document.getElementById("loginPanel");
  const configPanel = document.getElementById("configPanel");
  const loginForm = document.getElementById("loginForm");
  const configForm = document.getElementById("configForm");
  const passwordForm = document.getElementById("passwordForm");
  const loginStatus = document.getElementById("loginStatus");
  const statusMessage = document.getElementById("statusMessage");
  const passwordStatus = document.getElementById("passwordStatus");
  const loginBtn = document.getElementById("loginBtn");
  const loadBtn = document.getElementById("loadBtn");
  const saveBtn = document.getElementById("saveBtn");
  const passwordBtn = document.getElementById("passwordBtn");

  const fields = {
    loginPassword: document.getElementById("loginPassword"),
    customerServiceId: document.getElementById("customerServiceId"),
    contactUrl: document.getElementById("contactUrl"),
    downloadUrl: document.getElementById("downloadUrl"),
    gameUrl: document.getElementById("gameUrl"),
    newAdminPassword: document.getElementById("newAdminPassword"),
    confirmAdminPassword: document.getElementById("confirmAdminPassword")
  };

  let adminPassword = "";

  function setStatus(element, message, type) {
    element.textContent = message;
    element.className = `status ${type || ""}`.trim();
  }

  function fillForm(config) {
    fields.customerServiceId.value = config.customerServiceId || "";
    fields.contactUrl.value = config.contactUrl || "";
    fields.downloadUrl.value = config.downloadUrl || "";
    fields.gameUrl.value = config.gameUrl || "";
  }

  function getConfigFromForm() {
    return {
      customerServiceId: fields.customerServiceId.value.trim(),
      contactUrl: fields.contactUrl.value.trim(),
      downloadUrl: fields.downloadUrl.value.trim(),
      gameUrl: fields.gameUrl.value.trim()
    };
  }

  function showLoginRequired(statusElement) {
    loginPanel.classList.remove("is-hidden");
    configPanel.classList.add("is-hidden");
    setStatus(statusElement || loginStatus, "请先登录。", "error");
  }

  async function readConfig(showStatus) {
    if (showStatus) {
      setStatus(statusMessage, "正在读取当前配置...", "");
    }
    loadBtn.disabled = true;

    try {
      const response = await fetch("/api/config", {
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("读取失败");
      }

      const config = await response.json();
      fillForm(config);
      if (showStatus) {
        setStatus(statusMessage, "已读取当前配置。", "success");
      }
    } catch (error) {
      console.error(error);
      setStatus(statusMessage, "读取失败，请确认本地预览或 Cloudflare Functions 已启动。", "error");
    } finally {
      loadBtn.disabled = false;
    }
  }

  async function login(event) {
    event.preventDefault();

    const password = fields.loginPassword.value;
    if (!password) {
      setStatus(loginStatus, "请输入管理密码。", "error");
      fields.loginPassword.focus();
      return;
    }

    loginBtn.disabled = true;
    setStatus(loginStatus, "正在登录...", "");

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "login", password })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "登录失败");
      }

      adminPassword = password;
      fillForm(result.config || {});
      loginPanel.classList.add("is-hidden");
      configPanel.classList.remove("is-hidden");
      setStatus(statusMessage, "登录成功，可以修改配置。", "success");
    } catch (error) {
      console.error(error);
      setStatus(loginStatus, error.message || "登录失败，请检查密码。", "error");
      fields.loginPassword.focus();
    } finally {
      loginBtn.disabled = false;
    }
  }

  async function saveConfig(event) {
    event.preventDefault();

    if (!adminPassword) {
      showLoginRequired(loginStatus);
      return;
    }

    saveBtn.disabled = true;
    setStatus(statusMessage, "正在保存配置...", "");

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: adminPassword,
          config: getConfigFromForm()
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "保存失败");
      }

      fillForm(result.config);
      setStatus(statusMessage, "保存成功，刷新首页后即可生效。", "success");
    } catch (error) {
      console.error(error);
      setStatus(statusMessage, error.message || "保存失败，请稍后重试。", "error");
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function changePassword(event) {
    event.preventDefault();

    if (!adminPassword) {
      showLoginRequired(loginStatus);
      return;
    }

    const newPassword = fields.newAdminPassword.value.trim();
    const confirmPassword = fields.confirmAdminPassword.value.trim();

    if (newPassword.length < 6 || newPassword.length > 128) {
      setStatus(passwordStatus, "新密码长度需为 6-128 位。", "error");
      fields.newAdminPassword.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus(passwordStatus, "两次输入的新密码不一致。", "error");
      fields.confirmAdminPassword.focus();
      return;
    }

    passwordBtn.disabled = true;
    setStatus(passwordStatus, "正在修改管理员密码...", "");

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "changePassword",
          password: adminPassword,
          newPassword
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "密码修改失败");
      }

      adminPassword = newPassword;
      fields.newAdminPassword.value = "";
      fields.confirmAdminPassword.value = "";
      setStatus(passwordStatus, "管理员密码修改成功，请用新密码登录。", "success");
    } catch (error) {
      console.error(error);
      setStatus(passwordStatus, error.message || "密码修改失败，请稍后重试。", "error");
    } finally {
      passwordBtn.disabled = false;
    }
  }

  loginForm.addEventListener("submit", login);
  loadBtn.addEventListener("click", function () {
    readConfig(true);
  });
  configForm.addEventListener("submit", saveConfig);
  passwordForm.addEventListener("submit", changePassword);
})();
