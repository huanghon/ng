(function () {
  const defaultConfig = {
    customerServiceId: "2379548014",
    contactUrl: "https://www.paopaomiyu.xyz/",
    downloadUrl: "https://www.paopaomiyu.xyz/",
    gameUrl: "https://h5.cggames.top/#/Main/home",
    topLeftButtonText: "泡泡下载",
    topLeftButtonUrl: "https://www.paopaomiyu.xyz/",
    topRightButtonText: "游戏娱乐",
    topRightButtonUrl: "https://h5.cggames.top/#/Main/home",
    middleLeftButtonText: "EG/CG币出售",
    middleLeftButtonUrl: "https://www.paopaomiyu.xyz/",
    middleRightButtonText: "账户报白",
    middleRightButtonUrl: "https://www.paopaomiyu.xyz/",
    siteTitle: "南宫承兑",
    logoUrl: "/images/logo.jpeg"
  };

  let currentConfig = { ...defaultConfig };
  let currentModalTargetUrl = defaultConfig.middleLeftButtonUrl;

  const sellCBtn = document.getElementById("sellCBtn");
  const accountWhitelistBtn = document.getElementById("accountWhitelistBtn");
  const copySuccessModal = document.getElementById("copySuccessModal");
  const copiedIdDisplay = document.getElementById("copiedIdDisplay");
  const modalConfirmBtn = document.getElementById("modalConfirmBtn");
  const modalCancelBtn = document.getElementById("modalCancelBtn");
  const downloadLink = document.getElementById("downloadLink");
  const gameLink = document.getElementById("gameLink");
  const siteTitle = document.getElementById("siteTitle");
  const siteLogo = document.getElementById("siteLogo");

  function normalizeConfig(config) {
    return {
      ...defaultConfig,
      ...(config || {})
    };
  }

  function applyConfig(config) {
    currentConfig = normalizeConfig(config);
    document.title = currentConfig.siteTitle || defaultConfig.siteTitle;
    siteTitle.textContent = currentConfig.siteTitle || defaultConfig.siteTitle;
    downloadLink.textContent = currentConfig.topLeftButtonText || defaultConfig.topLeftButtonText;
    downloadLink.href = currentConfig.topLeftButtonUrl || currentConfig.downloadUrl || defaultConfig.topLeftButtonUrl;
    gameLink.textContent = currentConfig.topRightButtonText || defaultConfig.topRightButtonText;
    gameLink.href = currentConfig.topRightButtonUrl || currentConfig.gameUrl || defaultConfig.topRightButtonUrl;
    sellCBtn.textContent = currentConfig.middleLeftButtonText || defaultConfig.middleLeftButtonText;
    sellCBtn.href = currentConfig.middleLeftButtonUrl || currentConfig.contactUrl || defaultConfig.middleLeftButtonUrl;
    accountWhitelistBtn.textContent = currentConfig.middleRightButtonText || defaultConfig.middleRightButtonText;
    accountWhitelistBtn.href = currentConfig.middleRightButtonUrl || currentConfig.contactUrl || defaultConfig.middleRightButtonUrl;

    siteLogo.classList.remove("is-hidden");
    siteLogo.src = currentConfig.logoUrl || defaultConfig.logoUrl;
  }

  async function loadConfig() {
    try {
      const response = await fetch(`/api/config?t=${Date.now()}`, {
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("配置读取失败");
      }

      const config = await response.json();
      applyConfig(config);
    } catch (error) {
      console.warn("使用默认配置：", error);
      applyConfig(defaultConfig);
    }
  }

  function fallbackCopyToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      console.error("备用复制失败：", error);
    } finally {
      document.body.removeChild(textarea);
    }

    return copied;
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.warn("Clipboard API 失败，尝试备用复制：", error);
      }
    }

    return fallbackCopyToClipboard(text);
  }

  function showModal() {
    copiedIdDisplay.textContent = currentConfig.customerServiceId;
    copySuccessModal.classList.add("show");
  }

  function hideModal() {
    copySuccessModal.classList.remove("show");
  }

  async function handleServiceButtonClick(event) {
    event.preventDefault();
    currentModalTargetUrl = event.currentTarget.href || currentConfig.contactUrl || defaultConfig.middleLeftButtonUrl;
    await copyText(currentConfig.customerServiceId);
    showModal();
  }

  sellCBtn.addEventListener("click", handleServiceButtonClick);
  accountWhitelistBtn.addEventListener("click", handleServiceButtonClick);

  modalConfirmBtn.addEventListener("click", function () {
    hideModal();
    window.location.href = currentModalTargetUrl || currentConfig.contactUrl || defaultConfig.middleLeftButtonUrl;
  });

  modalCancelBtn.addEventListener("click", hideModal);

  copySuccessModal.addEventListener("click", function (event) {
    if (event.target === copySuccessModal) {
      hideModal();
    }
  });

  siteLogo.addEventListener("error", function () {
    siteLogo.classList.add("is-hidden");
  });

  loadConfig();
})();
