const fileInput = document.getElementById("fileInput");
const passwordInput = document.getElementById("password");
const progressFill = document.getElementById("progress");
const statusText = document.getElementById("status");
const historyList = document.getElementById("history");
const fileNameDisplay = document.getElementById("fileName");
const dropZone = document.getElementById("dropZone");

let selectedFile = null;

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files[0];
  fileNameDisplay.textContent = selectedFile ? selectedFile.name : "No file selected";
});

document.getElementById("togglePassword").addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  document.getElementById("togglePassword").textContent = isPassword ? "🙈" : "👁️";
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  if (e.dataTransfer.files.length > 0) {
    selectedFile = e.dataTransfer.files[0];
    fileNameDisplay.textContent = selectedFile.name;
    fileInput.files = e.dataTransfer.files;
  }
});

const strengthMeter = document.getElementById("strengthMeter");
const pixelBars = strengthMeter.querySelectorAll(".pixel-bar");
const strengthLabel = document.getElementById("strengthLabel");

passwordInput.addEventListener("input", () => {
  const value = passwordInput.value;
  const strength = getPasswordStrength(value);

  pixelBars.forEach((bar, index) => {
    bar.className = "pixel-bar";
    if (strength > index) {
      bar.classList.add(`active-${strength}`);
    }
  });

  strengthLabel.textContent = getStrengthText(strength, value.length);
});

function getPasswordStrength(pw) {
  let strength = 0;
  if (pw.length >= 8) strength++;
  if (/[A-Z]/.test(pw)) strength++;
  if (/[0-9]/.test(pw)) strength++;
  if (/[^A-Za-z0-9]/.test(pw)) strength++;
  return Math.min(strength, 4);
}

function getStrengthText(strength, length) {
  if (length < 8) return "⚠️ Minimum 8 characters required";
  if (strength <= 1) return "🔴 Weak";
  if (strength === 2) return "🟠 Moderate";
  if (strength === 3) return "🟡 Good";
  return "🟢 Strong";
}

function updateProgress(percent) {
  progressFill.style.width = `${percent}%`;
  progressFill.textContent = `${percent}%`;
}

function downloadBlob(blob, name) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  addToHistory(name);
}

function addToHistory(filename) {
  const li = document.createElement("li");
  li.textContent = filename;
  historyList.prepend(li);
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function handleEncrypt() {
  const file = selectedFile;
  const password = passwordInput.value;
  if (!file || !password) return alert("Select file and enter password.");
  if (password.length < 8) return alert("Password must be at least 8 characters long.");

  updateProgress(10);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  updateProgress(30);

  const data = new Uint8Array(await file.arrayBuffer());
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  updateProgress(70);

  const blob = new Blob([salt, iv, new Uint8Array(encrypted)]);
  downloadBlob(blob, file.name);
  updateProgress(100);
  statusText.textContent = "✅ Encryption complete.";
}

async function handleDecrypt() {
  const file = selectedFile;
  const password = passwordInput.value;
  if (!file || !password) return alert("Select file and enter password.");
  if (password.length < 8) return alert("Password must be at least 8 characters long.");

  const buffer = new Uint8Array(await file.arrayBuffer());
  const salt = buffer.slice(0, 16);
  const iv = buffer.slice(16, 28);
  const encrypted = buffer.slice(28);

  const key = await deriveKey(password, salt);
  updateProgress(40);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
    const blob = new Blob([decrypted]);
    downloadBlob(blob, file.name);
    updateProgress(100);
    statusText.textContent = "✅ Decryption complete.";
  } catch (e) {
    statusText.textContent = "❌ Decryption failed. Wrong password or corrupt file.";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("encryptButton").addEventListener("click", handleEncrypt);
  document.getElementById("decryptButton").addEventListener("click", handleDecrypt);
});
