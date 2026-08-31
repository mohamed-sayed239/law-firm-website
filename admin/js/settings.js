// ============================================
// admin/js/settings.js
// إدارة إعدادات الموقع (قراءة وتحديث settings/site)
// ============================================

import { auth, db } from "../../js/firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// Configuration
// ============================================

const ADMIN_UID = "eJpkkgoYHhhdQKtTxseVy7DURyE3"; // استبدل هذا بالـ UID الخاص بك من Firebase Auth

// ============================================
// DOM Elements
// ============================================

const form = document.getElementById("settingsForm");
const loadingEl = document.getElementById("settingsLoading");
const messageEl = document.getElementById("settingsMessage");
const saveBtn = document.getElementById("saveSettingsBtn");
const userEmailEl = document.getElementById("adminUserEmail");
const logoutBtn = document.getElementById("logoutButton");

// Form fields
const officeName = document.getElementById("officeName");
const officeEmail = document.getElementById("officeEmail");
const officePhone = document.getElementById("officePhone");
const officeWhatsapp = document.getElementById("officeWhatsapp");
const officeAddress = document.getElementById("officeAddress");
const officeWorkingHours = document.getElementById("officeWorkingHours");
const experienceYears = document.getElementById("experienceYears");
const casesCount = document.getElementById("casesCount");

// Sidebar toggle
const sidebar = document.getElementById("adminSidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const toggleBtn = document.getElementById("sidebarToggle");

// ============================================
// State
// ============================================

let isSaving = false;
let isDirty = false;
let originalData = {};

// ============================================
// Sidebar Toggle (Mobile)
// ============================================

function toggleSidebar(open) {
  if (!sidebar || !backdrop) return;
  const isOpen = open !== undefined ? open : sidebar.classList.toggle("open");
  if (isOpen) {
    sidebar.classList.add("open");
    backdrop.classList.add("open");
  } else {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
  }
}

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => toggleSidebar());
}
if (backdrop) {
  backdrop.addEventListener("click", () => toggleSidebar(false));
}

// ============================================
// Toast
// ============================================

function showToast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";
    container.style.width = "auto";
    container.style.maxWidth = "90vw";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.padding = "12px 20px";
  toast.style.borderRadius = "6px";
  toast.style.background =
    type === "success"
      ? "#28a745"
      : type === "error"
      ? "#dc3545"
      : "#0a1a2f";
  toast.style.color = "#fff";
  toast.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
  toast.style.animation = "slideIn 0.3s ease";
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) {
      container.remove();
    }
  }, 3000);
}

// ============================================
// Helper: Show/Hide Message
// ============================================

function showMessage(text, type = "success") {
  messageEl.textContent = text;
  messageEl.className = `settings-message visible ${type}`;
}

function hideMessage() {
  messageEl.className = "settings-message";
  messageEl.textContent = "";
}

// ============================================
// Helper: Set Loading State
// ============================================

function setLoading(state) {
  if (state) {
    saveBtn.classList.add("loading");
    saveBtn.disabled = true;
  } else {
    saveBtn.classList.remove("loading");
    saveBtn.disabled = false;
  }
}

// ============================================
// Helper: Validate Email
// ============================================

function isValidEmail(email) {
  if (!email) return true; // Empty is allowed
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// Helper: Validate Number
// ============================================

function isValidNumber(value) {
  if (value === "" || value === null || value === undefined) return true;
  const num = Number(value);
  return !isNaN(num) && num >= 0 && Number.isFinite(num);
}

// ============================================
// Load Settings
// ============================================

async function loadSettings() {
  try {
    const docRef = doc(db, "settings", "site");
    const docSnap = await getDoc(docRef);

    // Show form, hide loading
    loadingEl.style.display = "none";
    form.style.display = "block";

    if (!docSnap.exists()) {
      // No settings yet, use empty form
      originalData = {};
      return;
    }

    const data = docSnap.data();
    originalData = { ...data };

    // Populate form
    officeName.value = data.officeName || "";
    officeEmail.value = data.email || "";
    officePhone.value = data.phone || "";
    officeWhatsapp.value = data.whatsapp || "";
    officeAddress.value = data.address || "";
    officeWorkingHours.value = data.workingHours || "";
    experienceYears.value = data.experienceYears !== undefined ? data.experienceYears : "";
    casesCount.value = data.casesCount !== undefined ? data.casesCount : "";

  } catch (error) {
    console.error("❌ خطأ في تحميل الإعدادات:", error);
    loadingEl.style.display = "none";
    form.style.display = "block";
    showMessage("حدث خطأ أثناء تحميل الإعدادات. يرجى تحديث الصفحة.", "error");
  }
}

// ============================================
// Save Settings
// ============================================

async function saveSettings(e) {
  e.preventDefault();
  hideMessage();

  if (isSaving) return;

  // Validation
  const name = officeName.value.trim();
  if (!name) {
    showMessage("يرجى إدخال اسم المكتب.", "error");
    officeName.focus();
    return;
  }

  const email = officeEmail.value.trim();
  if (email && !isValidEmail(email)) {
    showMessage("يرجى إدخال بريد إلكتروني صحيح.", "error");
    officeEmail.focus();
    return;
  }

  const expYears = experienceYears.value.trim();
  if (expYears && !isValidNumber(expYears)) {
    showMessage("يرجى إدخال عدد صحيح غير سالب لسنوات الخبرة.", "error");
    experienceYears.focus();
    return;
  }

  const cases = casesCount.value.trim();
  if (cases && !isValidNumber(cases)) {
    showMessage("يرجى إدخال عدد صحيح غير سالب لعدد القضايا.", "error");
    casesCount.focus();
    return;
  }

  const data = {
    officeName: name,
    email: email,
    phone: officePhone.value.trim(),
    whatsapp: officeWhatsapp.value.trim(),
    address: officeAddress.value.trim(),
    workingHours: officeWorkingHours.value.trim(),
    experienceYears: expYears !== "" ? Number(expYears) : null,
    casesCount: cases !== "" ? Number(cases) : null,
  };

  // Remove null values (they will be deleted from Firestore)
  // But we want to keep them as null to allow clearing fields
  // Actually, we should keep them as null to indicate intentional clearing

  try {
    isSaving = true;
    setLoading(true);

    await setDoc(doc(db, "settings", "site"), data, { merge: true });

    // Update original data
    originalData = { ...data };

    showMessage("تم حفظ إعدادات الموقع بنجاح.", "success");
    showToast("تم حفظ إعدادات الموقع بنجاح.", "success");

    isDirty = false;

  } catch (error) {
    console.error("❌ خطأ في حفظ الإعدادات:", error);
    showMessage("حدث خطأ أثناء حفظ الإعدادات. حاول مرة أخرى.", "error");
    showToast("حدث خطأ أثناء حفظ الإعدادات.", "error");
  } finally {
    isSaving = false;
    setLoading(false);
  }
}

// ============================================
// Track Unsaved Changes
// ============================================

function checkDirty() {
  const currentData = {
    officeName: officeName.value.trim(),
    email: officeEmail.value.trim(),
    phone: officePhone.value.trim(),
    whatsapp: officeWhatsapp.value.trim(),
    address: officeAddress.value.trim(),
    workingHours: officeWorkingHours.value.trim(),
    experienceYears: experienceYears.value.trim(),
    casesCount: casesCount.value.trim(),
  };

  const original = {
    officeName: originalData.officeName || "",
    email: originalData.email || "",
    phone: originalData.phone || "",
    whatsapp: originalData.whatsapp || "",
    address: originalData.address || "",
    workingHours: originalData.workingHours || "",
    experienceYears: originalData.experienceYears !== undefined ? String(originalData.experienceYears) : "",
    casesCount: originalData.casesCount !== undefined ? String(originalData.casesCount) : "",
  };

  const isEqual =
    currentData.officeName === original.officeName &&
    currentData.email === original.email &&
    currentData.phone === original.phone &&
    currentData.whatsapp === original.whatsapp &&
    currentData.address === original.address &&
    currentData.workingHours === original.workingHours &&
    currentData.experienceYears === original.experienceYears &&
    currentData.casesCount === original.casesCount;

  isDirty = !isEqual;
}

// Add input listeners to track changes
form.querySelectorAll("input").forEach((input) => {
  input.addEventListener("input", checkDirty);
});

// ============================================
// Logout
// ============================================

async function handleLogout() {
  try {
    // Check for unsaved changes
    if (isDirty) {
      const confirmLeave = confirm(
        "لديك تغييرات غير محفوظة. هل أنت متأكد من مغادرة الصفحة؟"
      );
      if (!confirmLeave) return;
    }
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("❌ خطأ في تسجيل الخروج:", error);
    showToast("حدث خطأ أثناء تسجيل الخروج. حاول مرة أخرى.", "error");
  }
}

// ============================================
// Authentication & Authorization
// ============================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (user.uid !== ADMIN_UID) {
    console.warn("⚠️ محاولة دخول من UID غير مصرح به:", user.uid);
    await signOut(auth);
    window.location.replace("login.html");
    return;
  }

  if (userEmailEl) {
    userEmailEl.textContent = user.email || "Admin";
  }
  await loadSettings();
});

// ============================================
// Event Listeners
// ============================================

form.addEventListener("submit", saveSettings);

if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

// Warn before leaving with unsaved changes
window.addEventListener("beforeunload", (e) => {
  if (isDirty) {
    e.preventDefault();
    e.returnValue = "لديك تغييرات غير محفوظة. هل أنت متأكد من مغادرة الصفحة؟";
  }
});

// Close sidebar on resize
window.addEventListener("resize", () => {
  if (window.innerWidth > 992) {
    toggleSidebar(false);
  }
});

// ============================================
// Keyboard shortcuts
// ============================================

document.addEventListener("keydown", (e) => {
  // Ctrl+S or Cmd+S to save
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    if (!isSaving) {
      form.dispatchEvent(new Event("submit"));
    }
  }
});