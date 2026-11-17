const DEFAULT_SETTINGS = {
  apiKey: "",
  model: "gemini-3.5-flash-lite",
  targetLanguage: "Tamil",
  explainStyle: "Simple",
  domainHint: "",
  showCodeBreakdown: true
};

const form = document.getElementById("settings-form");
const apiKeyInput = document.getElementById("api-key");
const modelInput = document.getElementById("model");
const targetLanguageInput = document.getElementById("target-language");
const explainStyleInput = document.getElementById("explain-style");
const domainHintInput = document.getElementById("domain-hint");
const showCodeBreakdownInput = document.getElementById("show-code-breakdown");
const saveStatus = document.getElementById("save-status");
const toggleKeyButton = document.getElementById("toggle-key");
const testConnectionButton = document.getElementById("test-connection");
const saveButton = form.querySelector('button[type="submit"]');

function setStatus(message, isError) {
  saveStatus.textContent = message;
  saveStatus.classList.toggle("is-error", Boolean(isError));
}

function readFormSettings() {
  return {
    apiKey: apiKeyInput.value.trim(),
    model: modelInput.value.trim() || DEFAULT_SETTINGS.model,
    targetLanguage: targetLanguageInput.value.trim() || DEFAULT_SETTINGS.targetLanguage,
    explainStyle: explainStyleInput.value,
    domainHint: domainHintInput.value.trim(),
    showCodeBreakdown: showCodeBreakdownInput.checked
  };
}

async function loadSettings() {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  apiKeyInput.value = typeof settings.apiKey === "string" ? settings.apiKey : DEFAULT_SETTINGS.apiKey;
  const savedModel = typeof settings.model === "string" ? settings.model : DEFAULT_SETTINGS.model;
  modelInput.value = savedModel === "gemini-flash-latest" ? DEFAULT_SETTINGS.model : savedModel;
  targetLanguageInput.value = typeof settings.targetLanguage === "string"
    ? settings.targetLanguage
    : DEFAULT_SETTINGS.targetLanguage;
  domainHintInput.value = typeof settings.domainHint === "string" ? settings.domainHint : "";
  showCodeBreakdownInput.checked = settings.showCodeBreakdown !== false;
  const savedStyle = settings.explainStyle === "Engineer-level" ? "Expert-level" : settings.explainStyle;
  explainStyleInput.value = ["Simple", "Expert-level", "ELI5"].includes(savedStyle)
    ? savedStyle
    : DEFAULT_SETTINGS.explainStyle;
}

async function saveSettings() {
  await chrome.storage.local.set(readFormSettings());
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveSettings();
    setStatus("Saved", false);
  } catch (error) {
    setStatus("Couldn't save settings. Please try again.", true);
    console.error("Highlight Brain settings could not be saved.", error);
  }
});

testConnectionButton.addEventListener("click", async () => {
  testConnectionButton.disabled = true;
  saveButton.disabled = true;
  setStatus("Saving settings before testing...", false);
  try {
    await saveSettings();
    setStatus("Testing connection...", false);
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "testConnection" }, (result) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
        } else {
          resolve(result);
        }
      });
    });
    if (!response || !response.ok) {
      setStatus(`Connection failed: ${response && response.error ? response.error : "No response from the extension."}`, true);
      return;
    }
    setStatus("Connection successful.", false);
  } catch (error) {
    setStatus(error.message || "Connection test failed. Please try again.", true);
    console.error("Highlight Brain connection test failed.", error);
  } finally {
    testConnectionButton.disabled = false;
    saveButton.disabled = false;
  }
});

toggleKeyButton.addEventListener("click", () => {
  const reveal = apiKeyInput.type === "password";
  apiKeyInput.type = reveal ? "text" : "password";
  toggleKeyButton.textContent = reveal ? "Hide" : "Show";
  toggleKeyButton.setAttribute("aria-pressed", String(reveal));
});

loadSettings().catch((error) => {
  setStatus("Couldn't load settings. Please reload this page.", true);
  console.error("Highlight Brain settings could not be loaded.", error);
});
