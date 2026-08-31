// ============================================
// admin/js/login.js
// تسجيل الدخول إلى لوحة تحكم Admin باستخدام Firebase Auth
// ============================================

import { auth } from "../../js/firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

// ============================================
// DOM Elements
// ============================================

const form = document.getElementById("admin-login-form");
const emailInput = document.getElementById("admin-email");
const passwordInput = document.getElementById("admin-password");
const submitButton = document.getElementById("admin-login-button");
const errorContainer = document.getElementById("admin-login-error");
const togglePasswordBtn = document.getElementById("toggle-password-btn");

// ============================================
// Helpers
// ============================================

function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.add("visible");
}

function hideError() {
  errorContainer.textContent = "";
  errorContainer.classList.remove("visible");
}

function setLoading(state) {
  if (state) {
    submitButton.classList.add("loading");
    submitButton.disabled = true;
    submitButton.querySelector(".btn-text").textContent =
      "جاري تسجيل الدخول...";
  } else {
    submitButton.classList.remove("loading");
    submitButton.disabled = false;
    submitButton.querySelector(".btn-text").textContent = "تسجيل الدخول";
  }
}

// ============================================
// Toggle Password Visibility
// ============================================

togglePasswordBtn.addEventListener("click", () => {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";

  passwordInput.setAttribute("type", type);

  // تغيير الأيقونة
  const svg = togglePasswordBtn.querySelector("svg");

  if (type === "text") {
    svg.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    `;
  } else {
    svg.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
  }
});

// ============================================
// Form Submission
// ============================================

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // التحقق الأساسي
  if (!email || !password) {
    showError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
    return;
  }

  if (password.length < 6) {
    showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
    return;
  }

  setLoading(true);

  try {
    // حفظ جلسة تسجيل الدخول في المتصفح
    await setPersistence(auth, browserLocalPersistence);

    // محاولة تسجيل الدخول
    await signInWithEmailAndPassword(auth, email, password);

    // سيتم إعادة التوجيه بواسطة onAuthStateChanged
  } catch (error) {
    console.error("❌ خطأ في تسجيل الدخول:", error);

    let userMessage = "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.";

    // رسائل أخطاء شائعة
    switch (error.code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
        userMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
        break;

      case "auth/invalid-email":
        userMessage = "البريد الإلكتروني غير صالح.";
        break;

      case "auth/too-many-requests":
        userMessage = "تم إيقاف المحاولات مؤقتاً. حاول لاحقاً.";
        break;

      case "auth/network-request-failed":
        userMessage =
          "فشل الاتصال بالخادم. تحقق من اتصالك بالإنترنت.";
        break;

      default:
        userMessage = "حدث خطأ غير متوقع. حاول مرة أخرى.";
    }

    showError(userMessage);
    setLoading(false);
  }
});

// ============================================
// Auth State Listener (إعادة توجيه المستخدمين المسجلين)
// ============================================

onAuthStateChanged(auth, (user) => {
  if (user) {
    // المستخدم مسجل الدخول → توجيه إلى لوحة التحكم
    window.location.replace("index.html");
  }

  // إذا لم يكن مسجلاً، نبقى على صفحة Login
});

// ============================================
// Prevent browser autofill issues (اختياري)
// ============================================

// تنظيف حالة التحميل عند مغادرة الصفحة
window.addEventListener("beforeunload", () => {
  setLoading(false);
});

// ============================================
// (اختياري) إمكانية إعادة تعيين كلمة المرور
// ============================================

// يمكن إضافة رابط "نسيت كلمة المرور" في المستقبل
// لكن غير مطلوب حالياً