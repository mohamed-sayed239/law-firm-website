// ============================================
// js/services.js
// صفحة الخدمات - تحميل وعرض الخدمات من Firestore
// ============================================

import { db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// DOM References
// ============================================

const container = document.getElementById("services-container");

// ============================================
// Helper: Escape HTML (XSS prevention)
// ============================================

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Default SVG Icon (إذا لم يوجد icon في البيانات)
// ============================================

const defaultIconSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
`;

// ============================================
// Render Services
// ============================================

function renderServices(services) {
  if (!container) return;

  // مسح المحتوى الحالي
  container.innerHTML = "";

  if (!services || services.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>لا توجد خدمات قانونية منشورة حالياً.</p>
      </div>
    `;
    return;
  }

  services.forEach((service, index) => {
    const card = document.createElement("article");
    card.className = "card service-card";

    // رقم الخدمة (تسلسلي)
    const numberSpan = document.createElement("span");
    numberSpan.className = "service-number";
    numberSpan.textContent = String(index + 1).padStart(2, "0");
    card.appendChild(numberSpan);

    // أيقونة الخدمة
    const iconDiv = document.createElement("div");
    iconDiv.className = "service-icon";

    // إذا كان هناك حقل icon يستخدم SVG آمن
    // نستخدم textContent للتحقق من وجود قيمة، ثم نضيف SVG بأمان
    if (service.icon && service.icon.trim() !== "") {
      // نستخدم innerHTML فقط لأننا نتحكم في مصدر SVG (من Firebase)
      // ولكن لضمان الأمان، نتحقق من أن الخدمة تحتوي على SVG صالح
      // نقوم بتصفية أي محتوى HTML ضار
      const iconContent = service.icon.trim();
      // تحقق بسيط: نسمح فقط بالمحتوى الذي يبدو وكأنه SVG
      if (iconContent.includes('<svg') && iconContent.includes('</svg>')) {
        iconDiv.innerHTML = iconContent;
      } else {
        iconDiv.innerHTML = defaultIconSVG;
      }
    } else {
      iconDiv.innerHTML = defaultIconSVG;
    }
    card.appendChild(iconDiv);

    // عنوان الخدمة
    const titleElem = document.createElement("h3");
    titleElem.className = "card-title";
    titleElem.textContent = service.title || "خدمة قانونية";
    card.appendChild(titleElem);

    // وصف الخدمة
    const descElem = document.createElement("p");
    descElem.className = "card-text";
    descElem.textContent = service.description || "خدمة قانونية متخصصة وفق طبيعة الحالة واحتياجات العميل.";
    card.appendChild(descElem);

    // رابط "اقرأ المزيد" (يؤدي إلى صفحة التواصل أو حجز الاستشارة)
    const linkElem = document.createElement("a");
    linkElem.className = "card-link";
    linkElem.href = "contact.html";
    linkElem.innerHTML = `اقرأ المزيد <span>←</span>`;
    card.appendChild(linkElem);

    container.appendChild(card);
  });
}

// ============================================
// Load Services from Firestore
// ============================================

async function loadServices() {
  if (!container) return;

  // عرض حالة التحميل
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل الخدمات...</p>
    </div>
  `;

  try {
    const q = query(
      collection(db, "services"),
      where("published", "==", true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      renderServices([]);
      return;
    }

    const services = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      services.push({
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        icon: data.icon || "",
        published: data.published,
      });
    });

    renderServices(services);

  } catch (error) {
    console.error("❌ خطأ في تحميل الخدمات:", error);
    container.innerHTML = `
      <div class="error-state">
        <p>تعذر تحميل الخدمات حالياً. يرجى المحاولة مرة أخرى لاحقاً.</p>
      </div>
    `;
  }
}

// ============================================
// Initialize
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadServices();
});