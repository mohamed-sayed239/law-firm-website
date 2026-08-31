// ============================================
// js/consultation.js
// صفحة حجز الاستشارة - تحميل الخدمات وإرسال الطلب
// ============================================

import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// DOM Elements - Info
// ============================================

const officeNameEl = document.getElementById("consultation-office-name");
const officePhoneEl = document.getElementById("consultation-office-phone");
const officeWhatsappEl = document.getElementById("consultation-office-whatsapp");
const officeEmailEl = document.getElementById("consultation-office-email");
const officeAddressEl = document.getElementById("consultation-office-address");
const officeWorkingHoursEl = document.getElementById("consultation-office-working-hours");

const phoneLink = document.getElementById("consultation-phone-link");
const whatsappLink = document.getElementById("consultation-whatsapp-link");
const emailLink = document.getElementById("consultation-email-link");

const phoneContainer = document.getElementById("consultation-office-phone-container");
const whatsappContainer = document.getElementById("consultation-office-whatsapp-container");
const emailContainer = document.getElementById("consultation-office-email-container");
const addressContainer = document.getElementById("consultation-office-address-container");
const workingHoursContainer = document.getElementById("consultation-office-working-hours-container");

const footerOfficeName = document.getElementById("footer-office-name");
const footerPhone = document.getElementById("footer-phone");
const footerWhatsapp = document.getElementById("footer-whatsapp");
const footerEmail = document.getElementById("footer-email");

// ============================================
// DOM Elements - Form
// ============================================

const form = document.getElementById("consultation-form");
const formStatus = document.getElementById("consultation-form-status");
const submitBtn = document.getElementById("consultation-submit");

const nameInput = document.getElementById("consultation-name");
const phoneInput = document.getElementById("consultation-phone");
const emailInput = document.getElementById("consultation-email");
const serviceSelect = document.getElementById("consultation-service");
const dateInput = document.getElementById("consultation-date");
const messageInput = document.getElementById("consultation-message");

// ============================================
// Helper: Show/Hide Status
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
    if (btnText) btnText.textContent = "جاري إرسال الطلب...";
  } else {
    submitBtn.classList.remove("loading");
    submitBtn.disabled = false;
    const btnText = submitBtn.querySelector(".btn-text");
    if (btnText) btnText.textContent = "احجز الاستشارة";
  }
}

// ============================================
// Load Settings (بيانات المكتب)
// ============================================

async function loadSettings() {
  try {
    const docRef = doc(db, "settings", "site");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const data = docSnap.data();

    if (data.officeName && officeNameEl) {
      officeNameEl.textContent = data.officeName;
      if (footerOfficeName) footerOfficeName.textContent = data.officeName;
    }

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

    if (data.address && officeAddressEl) {
      officeAddressEl.textContent = data.address;
    } else if (addressContainer) {
      addressContainer.style.display = "none";
    }

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
// Load Services (للاختيار)
// ============================================

async function loadServices() {
  if (!serviceSelect) return;

  try {
    const q = query(
      collection(db, "services"),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);

    // Clear existing options (except first placeholder)
    serviceSelect.innerHTML = '<option value="">اختر الخدمة...</option>';

    if (snapshot.empty) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "لا توجد خدمات متاحة حالياً";
      option.disabled = true;
      serviceSelect.appendChild(option);
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const title = data.title || "خدمة بدون عنوان";
      const option = document.createElement("option");
      option.value = title;
      option.textContent = title;
      serviceSelect.appendChild(option);
    });

  } catch (error) {
    console.error("❌ خطأ في تحميل الخدمات:", error);
    serviceSelect.innerHTML = `
      <option value="">اختر الخدمة...</option>
      <option value="" disabled>حدث خطأ في تحميل الخدمات</option>
    `;
  }
}

// ============================================
// Form Submission
// ============================================

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideFormStatus();

    // Get values
    const name = nameInput?.value?.trim() || "";
    const phone = phoneInput?.value?.trim() || "";
    const email = emailInput?.value?.trim() || "";
    const service = serviceSelect?.value || "";
    const preferredDate = dateInput?.value || "";
    const message = messageInput?.value?.trim() || "";

    // Validation
    if (!name) {
      showFormStatus("يرجى إدخال الاسم الكامل.", "error");
      nameInput?.focus();
      return;
    }

    if (!phone) {
      showFormStatus("يرجى إدخال رقم الهاتف.", "error");
      phoneInput?.focus();
      return;
    }

    if (!service) {
      showFormStatus("يرجى اختيار الخدمة المطلوبة.", "error");
      serviceSelect?.focus();
      return;
    }

    if (email && !isValidEmail(email)) {
      showFormStatus("يرجى إدخال بريد إلكتروني صحيح.", "error");
      emailInput?.focus();
      return;
    }

    // Disable button and show loading
    setLoading(true);

    try {
      await addDoc(collection(db, "consultations"), {
        name,
        phone,
        email: email || "",
        service,
        preferredDate: preferredDate || "",
        message: message || "",
        status: "new",
        createdAt: serverTimestamp(),
      });

      showFormStatus("تم إرسال طلب الاستشارة بنجاح. سنتواصل معك قريبًا.", "success");
      form.reset();
      setLoading(false);

    } catch (error) {
      console.error("❌ خطأ في إرسال طلب الاستشارة:", error);
      showFormStatus("حدث خطأ أثناء إرسال طلب الاستشارة. يرجى المحاولة مرة أخرى.", "error");
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
  loadServices();
});