(function () {
  const loginPanel = document.getElementById("loginPanel");
  const configPanel = document.getElementById("configPanel");
  const loginForm = document.getElementById("loginForm");
  const configForm = document.getElementById("configForm");
  const loginStatus = document.getElementById("loginStatus");
  const statusMessage = document.getElementById("statusMessage");
  const loginBtn = document.getElementById("loginBtn");
  const loadBtn = document.getElementById("loadBtn");
  const saveBtn = document.getElementById("saveBtn");

  const fields = {
    loginPassword: document.getElementById("loginPassword"),
    customerServiceId: document.getElementById("customerServiceId"),
    contactUrl: document.getElementById("contactUrl"),
    downloadUrl: document.getElementById("downloadUrl"),
    gameUrl: document.getElementById("gameUrl")
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
      loginPanel.classList.remove("is-hidden");
      configPanel.classList.add("is-hidden");
      setStatus(loginStatus, "请先登录。", "error");
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

  loginForm.addEventListener("submit", login);
  loadBtn.addEventListener("click", function () {
    readConfig(true);
  });
  configForm.addEventListener("submit", saveConfig);
})();
