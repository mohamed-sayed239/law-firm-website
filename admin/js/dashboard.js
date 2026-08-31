// ============================================
// admin/js/dashboard.js
// لوحة تحكم Admin - إحصائيات وآخر البيانات
// ============================================

import { auth, db } from "../../js/firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// Configuration
// ============================================

const ADMIN_UID = "ACccyzUM8YXVhqY1PEAnRo43Wgk2";

// ============================================
// DOM Elements
// ============================================

const userEmailEl = document.getElementById("adminUserEmail");
const totalServices = document.getElementById("total-services");
const totalLawyers = document.getElementById("total-lawyers");
const totalArticles = document.getElementById("total-articles");
const newMessages = document.getElementById("new-messages");
const newConsultations = document.getElementById("new-consultations");
const recentMessagesContainer = document.getElementById("recent-messages");
const recentConsultationsContainer = document.getElementById("recent-consultations");
const logoutBtn = document.getElementById("adminLogoutBtn");

// Sidebar elements
const sidebar = document.getElementById("adminSidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const toggleBtn = document.getElementById("sidebarToggle");

// ============================================
// Sidebar Toggle (Mobile)
// ============================================

function toggleSidebar(open) {
  const isOpen = open !== undefined ? open : sidebar.classList.toggle("open");
  if (isOpen) {
    sidebar.classList.add("open");
    backdrop.classList.add("open");
  } else {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
  }
}

toggleBtn?.addEventListener("click", () => toggleSidebar());
backdrop?.addEventListener("click", () => toggleSidebar(false));

// ============================================
// Helper: Format Date
// ============================================

function formatDate(timestamp) {
  if (!timestamp) return "تاريخ غير معروف";
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "تاريخ غير معروف";
  }
}

// ============================================
// Helper: Status Badge
// ============================================

function statusBadge(status) {
  const cls = status === "new" ? "status-new"
    : status === "read" ? "status-read"
    : status === "pending" ? "status-pending"
    : status === "approved" ? "status-approved"
    : status === "rejected" ? "status-rejected"
    : "status-new";
  return `<span class="item-status ${cls}">${status || "جديد"}</span>`;
}

// ============================================
// Load Dashboard Data
// ============================================

async function loadDashboard() {
  try {
    // 1. Total Services
    const servicesSnap = await getCountFromServer(collection(db, "services"));
    totalServices.textContent = servicesSnap.data().count;

    // 2. Total Lawyers
    const lawyersSnap = await getCountFromServer(collection(db, "lawyers"));
    totalLawyers.textContent = lawyersSnap.data().count;

    // 3. Total Articles
    const articlesSnap = await getCountFromServer(collection(db, "articles"));
    totalArticles.textContent = articlesSnap.data().count;

    // 4. New Messages
    const messagesQuery = query(
      collection(db, "messages"),
      where("status", "==", "new")
    );
    const messagesSnap = await getCountFromServer(messagesQuery);
    newMessages.textContent = messagesSnap.data().count;

    // 5. New Consultations
    const consultationsQuery = query(
      collection(db, "consultations"),
      where("status", "==", "new")
    );
    const consultationsSnap = await getCountFromServer(consultationsQuery);
    newConsultations.textContent = consultationsSnap.data().count;

    // 6. Recent Messages (last 5)
    const recentMessagesQuery = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const recentMessagesSnap = await getDocs(recentMessagesQuery);
    if (recentMessagesSnap.empty) {
      recentMessagesContainer.innerHTML =
        '<div class="empty-state-small">لا توجد رسائل جديدة حالياً.</div>';
    } else {
      let html = "";
      recentMessagesSnap.forEach((doc) => {
        const data = doc.data();
        const name = data.name || "مجهول";
        const subject = data.subject || "بدون موضوع";
        const status = data.status || "new";
        const date = formatDate(data.createdAt);
        html += `
          <div class="recent-item">
            <div class="item-info">
              <span class="item-name">${name}</span>
              <span class="item-meta">${subject} • ${date}</span>
            </div>
            ${statusBadge(status)}
          </div>
        `;
      });
      recentMessagesContainer.innerHTML = html;
    }

    // 7. Recent Consultations (last 5)
    const recentConsultQuery = query(
      collection(db, "consultations"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const recentConsultSnap = await getDocs(recentConsultQuery);
    if (recentConsultSnap.empty) {
      recentConsultationsContainer.innerHTML =
        '<div class="empty-state-small">لا توجد طلبات استشارة جديدة حالياً.</div>';
    } else {
      let html = "";
      recentConsultSnap.forEach((doc) => {
        const data = doc.data();
        const name = data.name || "مجهول";
        const service = data.service || "استشارة";
        const status = data.status || "new";
        const date = formatDate(data.createdAt);
        html += `
          <div class="recent-item">
            <div class="item-info">
              <span class="item-name">${name}</span>
              <span class="item-meta">${service} • ${date}</span>
            </div>
            ${statusBadge(status)}
          </div>
        `;
      });
      recentConsultationsContainer.innerHTML = html;
    }

  } catch (error) {
    console.error("❌ خطأ في تحميل إحصائيات Dashboard:", error);
    // عرض رسائل خطأ في العناصر المتأثرة
    totalServices.textContent = "خطأ";
    totalLawyers.textContent = "خطأ";
    totalArticles.textContent = "خطأ";
    newMessages.textContent = "خطأ";
    newConsultations.textContent = "خطأ";
    recentMessagesContainer.innerHTML =
      '<div class="empty-state-small">حدث خطأ في تحميل الرسائل.</div>';
    recentConsultationsContainer.innerHTML =
      '<div class="empty-state-small">حدث خطأ في تحميل الاستشارات.</div>';
  }
}

// ============================================
// Authentication & Authorization
// ============================================

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // غير مسجل الدخول
    window.location.replace("login.html");
    return;
  }

  // التحقق من UID
  if (user.uid !== ADMIN_UID) {
    // مستخدم غير مصرح له
    console.warn("⚠️ محاولة دخول من UID غير مصرح به:", user.uid);
    await signOut(auth);
    window.location.replace("login.html");
    return;
  }

  // Admin مصرح له
  userEmailEl.textContent = user.email || "Admin";
  // تحميل البيانات
  await loadDashboard();
});

// ============================================
// Logout
// ============================================

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("❌ خطأ أثناء تسجيل الخروج:", error);
    alert("حدث خطأ أثناء تسجيل الخروج. حاول مرة أخرى.");
  }
});

// ============================================
// Optional: Close sidebar on resize to desktop
// ============================================

window.addEventListener("resize", () => {
  if (window.innerWidth > 992) {
    toggleSidebar(false);
  }
});