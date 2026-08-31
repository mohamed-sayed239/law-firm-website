// ============================================
// js/lawyers.js
// صفحة فريق العمل - تحميل وعرض المحامين من Firestore
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

const container = document.getElementById("lawyers-container");

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
// Render Lawyers
// ============================================

function renderLawyers(lawyers) {
  if (!container) return;

  // Clear container
  container.innerHTML = "";

  if (!lawyers || lawyers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👨‍⚖️</div>
        <p>لا يوجد أفراد فريق منشورون حالياً.</p>
      </div>
    `;
    return;
  }

  lawyers.forEach((lawyer) => {
    const card = document.createElement("div");
    card.className = "lawyer-card";

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
        fallback.textContent = (lawyer.name || "?").charAt(0).toUpperCase();
        this.parentNode.insertBefore(fallback, this);
      };
      card.appendChild(img);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "lawyer-image-fallback";
      fallback.textContent = (lawyer.name || "?").charAt(0).toUpperCase();
      card.appendChild(fallback);
    }

    // Info
    const infoDiv = document.createElement("div");
    infoDiv.className = "lawyer-info";

    // Name
    const nameEl = document.createElement("h3");
    nameEl.textContent = lawyer.name || "محامي";
    infoDiv.appendChild(nameEl);

    // Role
    if (lawyer.role && lawyer.role.trim() !== "") {
      const roleEl = document.createElement("p");
      roleEl.className = "lawyer-role";
      roleEl.textContent = lawyer.role;
      infoDiv.appendChild(roleEl);
    }

    // Bio
    if (lawyer.bio && lawyer.bio.trim() !== "") {
      const bioEl = document.createElement("p");
      bioEl.className = "lawyer-bio";
      bioEl.textContent = lawyer.bio;
      infoDiv.appendChild(bioEl);
    }

    card.appendChild(infoDiv);
    container.appendChild(card);
  });
}

// ============================================
// Load Lawyers from Firestore
// ============================================

async function loadLawyers() {
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل فريق العمل...</p>
    </div>
  `;

  try {
    const q = query(
      collection(db, "lawyers"),
      where("published", "==", true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      renderLawyers([]);
      return;
    }

    const lawyers = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      lawyers.push({
        id: doc.id,
        name: data.name || "",
        role: data.role || "",
        bio: data.bio || "",
        image: data.image || "",
        published: data.published,
      });
    });

    // Optional: sort by name (or you can keep the order from Firestore)
    lawyers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    renderLawyers(lawyers);

  } catch (error) {
    console.error("❌ خطأ في تحميل المحامين:", error);
    container.innerHTML = `
      <div class="error-state">
        <p>تعذر تحميل بيانات فريق العمل حاليًا. يرجى المحاولة مرة أخرى لاحقاً.</p>
      </div>
    `;
  }
}

// ============================================
// Initialize
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadLawyers();
});