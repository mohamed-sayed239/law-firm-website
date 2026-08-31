// ============================================
// js/contact.js
// صفحة التواصل - تحميل بيانات المكتب وإرسال الرسائل
// ============================================

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// DOM Elements - Contact Info (معرفات فريدة)
// ============================================

const officeNameEl = document.getElementById("contact-office-name");
const officePhoneEl = document.getElementById("contact-office-phone");
const officeWhatsappEl = document.getElementById("contact-office-whatsapp");
const officeEmailEl = document.getElementById("contact-office-email");
const officeAddressEl = document.getElementById("contact-office-address");
const officeWorkingHoursEl = document.getElementById("contact-office-working-hours");

const phoneLink = document.getElementById("contact-phone-link");
const whatsappLink = document.getElementById("contact-whatsapp-link");
const emailLink = document.getElementById("contact-email-link");

// Containers للإخفاء عند عدم وجود بيانات
const phoneContainer = document.getElementById("contact-office-phone-container");
const whatsappContainer = document.getElementById("contact-office-whatsapp-container");
const emailContainer = document.getElementById("contact-office-email-container");
const addressContainer = document.getElementById("contact-office-address-container");
const workingHoursContainer = document.getElementById("contact-office-working-hours-container");

// Footer
const footerOfficeName = document.getElementById("footer-office-name");
const footerPhone = document.getElementById("footer-phone");
const footerWhatsapp = document.getElementById("footer-whatsapp");
const footerEmail = document.getElementById("footer-email");

// ============================================
// DOM Elements - Form (معرفات فريدة للنموذج)
// ============================================

const form = document.getElementById("contact-form");
const formStatus = document.getElementById("contact-form-status");
const submitBtn = document.getElementById("contact-submit");

const nameInput = document.getElementById("contact-name");
const phoneInput = document.getElementById("contact-phone-input");
const emailInput = document.getElementById("contact-email-input");
const subjectInput = document.getElementById("contact-subject");
const messageInput = document.getElementById("contact-message");

// ============================================
// Helper: Show/Hide Status Message
// ============================================

function showFormStatus(message, type = "success") {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status visible ${type}`;
}

function hideFormStatus() {
  if (!formStatus) return;
  formStatus.className = "form-status";
  formStatus.textContent = "";
}

// ============================================
// Helper: Set Loading State
// ============================================

function setLoading(state) {
  if (!submitBtn) return;
  if (state) {
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;
    const btnText = submitBtn.querySelector(".btn-text");
    if (btnText) btnText.textContent = "جاري الإرسال...";
  } else {
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
    const btnText = submitBtn.querySelector(".btn-text");
    if (btnText) btnText.textContent = "إرسال الرسالة";
  }
}

// ============================================
// Load Settings
// ============================================

async function loadSettings() {
  try {
    const docRef = doc(db, "settings", "site");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return;
    }

    const data = docSnap.data();

    // 1. Office Name
    if (data.officeName && officeNameEl) {
      officeNameEl.textContent = data.officeName;
      if (footerOfficeName) footerOfficeName.textContent = data.officeName;
    }

    // 2. Phone
    if (data.phone && phoneLink) {
      phoneLink.href = `tel:${data.phone}`;
      phoneLink.textContent = data.phone;
      if (officePhoneEl) officePhoneEl.textContent = "";
      if (footerPhone) {
        footerPhone.href = `tel:${data.phone}`;
        footerPhone.textContent = data.phone;
      }
    } else if (phoneContainer) {
      phoneContainer.style.display = "none";
    }

    // 3. WhatsApp
    if (data.whatsapp && whatsappLink) {
      const cleanNumber = data.whatsapp.replace(/\D/g, "");
      whatsappLink.href = `https://wa.me/${cleanNumber}`;
      whatsappLink.textContent = data.whatsapp;
      if (officeWhatsappEl) officeWhatsappEl.textContent = "";
      if (footerWhatsapp) {
        footerWhatsapp.href = `https://wa.me/${cleanNumber}`;
        footerWhatsapp.textContent = data.whatsapp;
      }
    } else if (whatsappContainer) {
      whatsappContainer.style.display = "none";
    }

    // 4. Email
    if (data.email && emailLink) {
      emailLink.href = `mailto:${data.email}`;
      emailLink.textContent = data.email;
      if (officeEmailEl) officeEmailEl.textContent = "";
      if (footerEmail) {
        footerEmail.href = `mailto:${data.email}`;
        footerEmail.textContent = data.email;
      }
    } else if (emailContainer) {
      emailContainer.style.display = "none";
    }

    // 5. Address
    if (data.address && officeAddressEl) {
      officeAddressEl.textContent = data.address;
    } else if (addressContainer) {
      addressContainer.style.display = "none";
    }

    // 6. Working Hours
    if (data.workingHours && officeWorkingHoursEl) {
      officeWorkingHoursEl.textContent = data.workingHours;
    } else if (workingHoursContainer) {
      workingHoursContainer.style.display = "none";
    }

  } catch (error) {
    console.error("❌ خطأ في تحميل إعدادات المكتب:", error);
  }
}

// ============================================
// Form Submission
// ============================================

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormStatus();

    // Get values (مع التحقق من وجود العناصر)
    const name = nameInput?.value?.trim() || "";
    const phone = phoneInput?.value?.trim() || "";
    const email = emailInput?.value?.trim() || "";
    const subject = subjectInput?.value?.trim() || "";
    const message = messageInput?.value?.trim() || "";

    // Validation
    if (!name) {
      showFormStatus("يرجى إدخال الاسم.", "error");
      nameInput?.focus();
      return;
    }

    if (!phone) {
      showFormStatus("يرجى إدخال رقم الهاتف.", "error");
      phoneInput?.focus();
      return;
    }

    if (!message) {
      showFormStatus("يرجى كتابة الرسالة.", "error");
      messageInput?.focus();
      return;
    }

    // Validate email if provided
    if (email && !isValidEmail(email)) {
      showFormStatus("يرجى إدخال بريد إلكتروني صحيح.", "error");
      emailInput?.focus();
      return;
    }

    // Disable button and show loading
    setLoading(true);

    try {
      // Save to Firestore
      await addDoc(collection(db, "messages"), {
        name,
        phone,
        email: email || "",
        subject: subject || "",
        message,
        status: "new",
        createdAt: serverTimestamp(),
      });

      // Success
      showFormStatus("تم إرسال رسالتك بنجاح. سنتواصل معك قريبًا.", "success");
      form.reset();
      setLoading(false);

    } catch (error) {
      console.error("❌ خطأ في إرسال الرسالة:", error);
      showFormStatus("حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة مرة أخرى.", "error");
      setLoading(false);
    }
  });
}

// ============================================
// Helper: Validate Email
// ============================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// Initialize
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
});