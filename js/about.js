// ============================================
// js/about.js
// صفحة عن المكتب - تحميل بيانات المكتب والمحامين
// ============================================

import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// DOM Elements - Settings
// ============================================

const experienceYearsEl = document.getElementById("about-experience-years");
const casesCountEl = document.getElementById("about-cases-count");
const statsSection = document.getElementById("about-stats-section");

// ============================================
// DOM Elements - Lawyers
// ============================================

const lawyersContainer = document.getElementById("about-lawyers-container");

// ============================================
// DOM Elements - Footer (تحديث من main.js أيضاً)
// ============================================

const footerOfficeName = document.getElementById("footer-office-name");
const footerPhone = document.getElementById("footer-phone");
const footerWhatsapp = document.getElementById("footer-whatsapp");
const footerEmail = document.getElementById("footer-email");

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
// Load Settings
// ============================================

async function loadSettings() {
  try {
    const docRef = doc(db, "settings", "site");
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const data = docSnap.data();

    // Experience Years
    if (data.experienceYears !== undefined && data.experienceYears !== null) {
      experienceYearsEl.textContent = data.experienceYears;
    } else {
      // Hide stats section if no data
      if (statsSection) statsSection.style.display = "none";
    }

    // Cases Count
    if (data.casesCount !== undefined && data.casesCount !== null) {
      casesCountEl.textContent = data.casesCount;
    }

    // Footer updates
    if (data.officeName && footerOfficeName) {
      footerOfficeName.textContent = data.officeName;
    }

    if (data.phone && footerPhone) {
      footerPhone.href = `tel:${data.phone}`;
      footerPhone.textContent = data.phone;
    }

    if (data.whatsapp && footerWhatsapp) {
      const cleanNumber = data.whatsapp.replace(/\D/g, "");
      footerWhatsapp.href = `https://wa.me/${cleanNumber}`;
      footerWhatsapp.textContent = data.whatsapp;
    }

    if (data.email && footerEmail) {
      footerEmail.href = `mailto:${data.email}`;
      footerEmail.textContent = data.email;
    }

  } catch (error) {
    console.error("❌ خطأ في تحميل إعدادات المكتب:", error);
  }
}

// ============================================
// Load Lawyers
// ============================================

async function loadLawyers() {
  if (!lawyersContainer) return;

  try {
    const q = query(
      collection(db, "lawyers"),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);

    // Clear loading text
    lawyersContainer.innerHTML = "";

    if (snapshot.empty) {
      lawyersContainer.innerHTML = `
        <div style="text-align:center; grid-column:1/-1; color:var(--color-muted); padding:var(--spacing-lg);">
          لا يوجد محامون منشورون حالياً.
        </div>
      `;
      return;
    }

    const lawyers = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      lawyers.push({
        id: doc.id,
        name: data.name || "محامي",
        role: data.role || "",
        bio: data.bio || "",
        image: data.image || "",
      });
    });

    lawyers.forEach((lawyer) => {
      const card = document.createElement("div");
      card.className = "lawyer-card-about";

      // Image
      const hasImage = lawyer.image && lawyer.image.trim() !== "";

      if (hasImage) {
        const img = document.createElement("img");
        img.className = "lawyer-image";
        img.src = lawyer.image;
        img.alt = `صورة ${lawyer.name}`;
        img.loading = "lazy";
        img.onerror = function () {
          this.style.display = "none";
          const fallback = document.createElement("div");
          fallback.className = "lawyer-image-fallback";
          fallback.textContent = lawyer.name.charAt(0).toUpperCase();
          this.parentNode.insertBefore(fallback, this);
        };
        card.appendChild(img);
      } else {
        const fallback = document.createElement("div");
        fallback.className = "lawyer-image-fallback";
        fallback.textContent = lawyer.name.charAt(0).toUpperCase();
        card.appendChild(fallback);
      }

      // Info
      const infoDiv = document.createElement("div");
      infoDiv.className = "lawyer-info";

      const nameEl = document.createElement("h3");
      nameEl.textContent = lawyer.name;
      infoDiv.appendChild(nameEl);

      if (lawyer.role && lawyer.role.trim() !== "") {
        const roleEl = document.createElement("p");
        roleEl.className = "lawyer-role";
        roleEl.textContent = lawyer.role;
        infoDiv.appendChild(roleEl);
      }

      if (lawyer.bio && lawyer.bio.trim() !== "") {
        const bioEl = document.createElement("p");
        bioEl.className = "lawyer-bio";
        bioEl.textContent = lawyer.bio;
        infoDiv.appendChild(bioEl);
      }

      card.appendChild(infoDiv);
      lawyersContainer.appendChild(card);
    });

  } catch (error) {
    console.error("❌ خطأ في تحميل المحامين:", error);
    lawyersContainer.innerHTML = `
      <div style="text-align:center; grid-column:1/-1; color:#dc3545; padding:var(--spacing-lg);">
        حدث خطأ أثناء تحميل فريق العمل.
      </div>
    `;
  }
}

// ============================================
// Initialize
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  loadLawyers();
});