// ============================================
// admin/js/lawyers.js
// إدارة المحامين (CRUD + Publish toggle + Search)
// ============================================

import { auth, db } from "../../js/firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// Configuration
// ============================================

const ADMIN_UID = "ACccyzUM8YXVhqY1PEAnRo43Wgk2";

// ============================================
// DOM Elements
// ============================================

const lawyersList = document.getElementById("lawyersList");
const searchInput = document.getElementById("lawyersSearch");
const addBtn = document.getElementById("addLawyerBtn");
const userEmailEl = document.getElementById("adminUserEmail");
const logoutBtn = document.getElementById("logoutButton");

// Modal elements
const modal = document.getElementById("lawyerModal");
const modalTitle = document.getElementById("modalTitle");
const form = document.getElementById("lawyerForm");
const lawyerId = document.getElementById("lawyerId");
const lawyerName = document.getElementById("lawyerName");
const lawyerRole = document.getElementById("lawyerRole");
const lawyerBio = document.getElementById("lawyerBio");
const lawyerImage = document.getElementById("lawyerImage");
const lawyerPublished = document.getElementById("lawyerPublished");
const saveBtn = document.getElementById("saveLawyerBtn");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");

// Delete modal
const deleteModal = document.getElementById("deleteModal");
const deleteConfirm = document.getElementById("deleteConfirm");
const deleteCancel = document.getElementById("deleteCancel");

// Sidebar toggle
const sidebar = document.getElementById("adminSidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const toggleBtn = document.getElementById("sidebarToggle");

// ============================================
// State
// ============================================

let allLawyers = [];
let currentDeleteId = null;
let isEditMode = false;

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
// Toast (Simple standalone)
// ============================================

function showToast(message, type = "info") {
  // Try to find existing toast container
  let container = document.querySelector(".toast-container");
  if (!container) {
    // Create one if not exists
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

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) {
      container.remove();
    }
  }, 3000);
}

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
  if (!lawyersList) return;

  if (!lawyers || lawyers.length === 0) {
    lawyersList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👨‍⚖️</div>
        <p>لا يوجد محامون مضافون حتى الآن.</p>
        <button class="btn btn-primary" id="emptyAddBtn">+ إضافة أول محامي</button>
      </div>
    `;
    const emptyAdd = document.getElementById("emptyAddBtn");
    if (emptyAdd) emptyAdd.addEventListener("click", openAddModal);
    return;
  }

  // Build table using DOM methods for safety
  const wrap = document.createElement("div");
  wrap.className = "lawyers-table-wrap";

  const table = document.createElement("table");
  table.className = "lawyers-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["الصورة", "الاسم", "المنصب", "الحالة", "الإجراءات"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  lawyers.forEach((lawyer) => {
    const tr = document.createElement("tr");
    tr.dataset.id = lawyer.id;

    // 1. الصورة
    const tdImage = document.createElement("td");
    const hasImage = lawyer.image && lawyer.image.trim() !== "";
    if (hasImage) {
      const img = document.createElement("img");
      img.src = lawyer.image;
      img.alt = lawyer.name || "محامي";
      img.className = "lawyer-avatar";
      img.loading = "lazy";
      img.onerror = function () {
        this.style.display = "none";
        const fallback = document.createElement("div");
        fallback.className = "lawyer-avatar empty";
        fallback.textContent = (lawyer.name || "?").charAt(0).toUpperCase();
        this.parentNode.appendChild(fallback);
      };
      tdImage.appendChild(img);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "lawyer-avatar empty";
      fallback.textContent = (lawyer.name || "?").charAt(0).toUpperCase();
      tdImage.appendChild(fallback);
    }
    tr.appendChild(tdImage);

    // 2. الاسم
    const tdName = document.createElement("td");
    const nameStrong = document.createElement("strong");
    nameStrong.textContent = lawyer.name || "—";
    tdName.appendChild(nameStrong);
    tr.appendChild(tdName);

    // 3. المنصب
    const tdRole = document.createElement("td");
    tdRole.textContent = lawyer.role || "—";
    tr.appendChild(tdRole);

    // 4. الحالة
    const tdStatus = document.createElement("td");
    const isPublished = lawyer.published === true;
    const badge = document.createElement("span");
    badge.className = `status-badge ${isPublished ? "published" : "unpublished"}`;
    badge.textContent = isPublished ? "منشور" : "غير منشور";
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    // 5. الإجراءات
    const tdActions = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "actions-cell";

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "btn-sm edit";
    editBtn.dataset.id = lawyer.id;
    editBtn.textContent = "تعديل";
    editBtn.addEventListener("click", () => openEditModal(lawyer.id));
    actionsDiv.appendChild(editBtn);

    // Toggle publish button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = `btn-sm toggle-pub ${isPublished ? "unpublish" : "publish"}`;
    toggleBtn.dataset.id = lawyer.id;
    toggleBtn.textContent = isPublished ? "إخفاء" : "نشر";
    toggleBtn.addEventListener("click", () => togglePublished(lawyer.id));
    actionsDiv.appendChild(toggleBtn);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-sm delete";
    deleteBtn.dataset.id = lawyer.id;
    deleteBtn.textContent = "حذف";
    deleteBtn.addEventListener("click", () => openDeleteModal(lawyer.id));
    actionsDiv.appendChild(deleteBtn);

    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);

  // Clear and append
  lawyersList.innerHTML = "";
  lawyersList.appendChild(wrap);
}

// ============================================
// Load Lawyers from Firestore
// ============================================

async function loadLawyers() {
  if (!lawyersList) return;

  lawyersList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل فريق العمل...</p>
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, "lawyers"));

    allLawyers = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      allLawyers.push({
        id: doc.id,
        name: data.name || "",
        role: data.role || "",
        bio: data.bio || "",
        image: data.image || "",
        published: data.published === true,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      });
    });

    // Sort alphabetically by name
    allLawyers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    renderLawyers(allLawyers);
    return allLawyers;
  } catch (error) {
    console.error("❌ خطأ في تحميل المحامين:", error);
    lawyersList.innerHTML = `
      <div class="empty-state">
        <p style="color: #dc3545;">حدث خطأ أثناء تحميل المحامين. يرجى المحاولة لاحقاً.</p>
      </div>
    `;
    return [];
  }
}

// ============================================
// Search (Client-side)
// ============================================

function filterLawyers(queryText) {
  if (!queryText.trim()) {
    renderLawyers(allLawyers);
    return;
  }
  const q = queryText.trim().toLowerCase();
  const filtered = allLawyers.filter((lawyer) => {
    return (
      (lawyer.name && lawyer.name.toLowerCase().includes(q)) ||
      (lawyer.role && lawyer.role.toLowerCase().includes(q))
    );
  });
  renderLawyers(filtered);
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    filterLawyers(e.target.value);
  });
}

// ============================================
// Modal Helpers
// ============================================

function openModal(title, data = null) {
  if (!modal) return;
  isEditMode = !!data;
  modalTitle.textContent = title;
  lawyerId.value = data?.id || "";
  lawyerName.value = data?.name || "";
  lawyerRole.value = data?.role || "";
  lawyerBio.value = data?.bio || "";
  lawyerImage.value = data?.image || "";
  lawyerPublished.checked = data?.published !== undefined ? data.published : true;
  saveBtn.textContent = isEditMode ? "حفظ التعديلات" : "إضافة";
  modal.classList.add("open");
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("open");
  form.reset();
  lawyerId.value = "";
  isEditMode = false;
  lawyerPublished.checked = true;
}

function openAddModal() {
  openModal("إضافة محامي جديد");
}

function openEditModal(id) {
  const lawyer = allLawyers.find((l) => l.id === id);
  if (!lawyer) {
    showToast("لم يتم العثور على المحامي", "error");
    return;
  }
  openModal("تعديل بيانات المحامي", lawyer);
}

// ============================================
// Save Lawyer (Add / Update)
// ============================================

async function saveLawyer(e) {
  e.preventDefault();

  const name = lawyerName.value.trim();
  if (!name) {
    showToast("يرجى إدخال اسم المحامي", "error");
    lawyerName.focus();
    return;
  }

  const data = {
    name,
    role: lawyerRole.value.trim() || "",
    bio: lawyerBio.value.trim() || "",
    image: lawyerImage.value.trim() || "",
    published: lawyerPublished.checked,
    updatedAt: serverTimestamp(),
  };

  try {
    if (isEditMode) {
      const id = lawyerId.value;
      await updateDoc(doc(db, "lawyers", id), data);
      showToast("تم تحديث بيانات المحامي بنجاح", "success");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "lawyers"), data);
      showToast("تم إضافة المحامي بنجاح", "success");
    }

    closeModal();
    await loadLawyers();
  } catch (error) {
    console.error("❌ خطأ في حفظ المحامي:", error);
    showToast("حدث خطأ أثناء حفظ البيانات. حاول مرة أخرى.", "error");
  }
}

// ============================================
// Delete Lawyer
// ============================================

function openDeleteModal(id) {
  currentDeleteId = id;
  if (deleteModal) deleteModal.classList.add("open");
}

function closeDeleteModal() {
  if (deleteModal) deleteModal.classList.remove("open");
  currentDeleteId = null;
}

async function confirmDelete() {
  if (!currentDeleteId) return;

  try {
    await deleteDoc(doc(db, "lawyers", currentDeleteId));
    showToast("تم حذف المحامي بنجاح", "success");
    closeDeleteModal();
    await loadLawyers();
  } catch (error) {
    console.error("❌ خطأ في حذف المحامي:", error);
    showToast("حدث خطأ أثناء الحذف. حاول مرة أخرى.", "error");
    closeDeleteModal();
  }
}

// ============================================
// Toggle Published Status
// ============================================

async function togglePublished(id) {
  const lawyer = allLawyers.find((l) => l.id === id);
  if (!lawyer) {
    showToast("لم يتم العثور على المحامي", "error");
    return;
  }

  const newStatus = !lawyer.published;
  try {
    await updateDoc(doc(db, "lawyers", id), {
      published: newStatus,
      updatedAt: serverTimestamp(),
    });
    showToast(newStatus ? "تم نشر المحامي" : "تم إخفاء المحامي", "success");
    await loadLawyers();
  } catch (error) {
    console.error("❌ خطأ في تغيير حالة النشر:", error);
    showToast("حدث خطأ أثناء تغيير الحالة.", "error");
  }
}

// ============================================
// Logout
// ============================================

async function handleLogout() {
  try {
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

  // Admin authorized
  if (userEmailEl) {
    userEmailEl.textContent = user.email || "Admin";
  }
  await loadLawyers();
});

// ============================================
// Event Listeners (with null checks)
// ============================================

if (addBtn) addBtn.addEventListener("click", openAddModal);
if (modalClose) modalClose.addEventListener("click", closeModal);
if (modalCancel) modalCancel.addEventListener("click", closeModal);

// Close modal on backdrop click
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
}

if (deleteCancel) deleteCancel.addEventListener("click", closeDeleteModal);
if (deleteConfirm) deleteConfirm.addEventListener("click", confirmDelete);

// Close delete modal on backdrop click
if (deleteModal) {
  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });
}

if (form) {
  form.addEventListener("submit", saveLawyer);
}

if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

// Close sidebar on resize to desktop
window.addEventListener("resize", () => {
  if (window.innerWidth > 992) {
    toggleSidebar(false);
  }
});

// ============================================
// Keyboard shortcuts (Accessibility)
// ============================================

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modal && modal.classList.contains("open")) closeModal();
    if (deleteModal && deleteModal.classList.contains("open")) closeDeleteModal();
  }
});