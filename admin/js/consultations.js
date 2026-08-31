// ============================================
// admin/js/consultations.js
// إدارة طلبات الاستشارة (عرض، بحث، تصفية، تغيير الحالة، حذف)
// ============================================

import { auth, db } from "../../js/firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// Configuration
// ============================================

const ADMIN_UID = "eJpkkgoYHhhdQKtTxseVy7DURyE3"; // استبدل هذا بالـ UID الخاص بك من Firebase Auth

// ============================================
// DOM Elements
// ============================================

const consultationsList = document.getElementById("consultationsList");
const searchInput = document.getElementById("consultationsSearch");
const filterSelect = document.getElementById("consultationsFilter");
const userEmailEl = document.getElementById("adminUserEmail");
const logoutBtn = document.getElementById("logoutButton");

// Detail Modal
const consultationModal = document.getElementById("consultationModal");
const modalTitle = document.getElementById("modalTitle");
const consultationDetail = document.getElementById("consultationDetail");
const statusSelect = document.getElementById("consultationStatusSelect");
const updateStatusBtn = document.getElementById("updateStatusBtn");
const deleteFromModalBtn = document.getElementById("deleteFromModalBtn");
const closeConsultationModalBtn = document.getElementById("closeConsultationModal");
const modalCloseBtn = document.getElementById("modalClose");

// Delete Confirmation Modal
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

let allConsultations = [];
let filteredConsultations = [];
let currentConsultationId = null;
let currentDeleteId = null;

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
// Helper: Format Date
// ============================================

function formatDate(timestamp) {
  if (!timestamp) return "غير محدد";
  try {
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return "غير محدد";

    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "غير محدد";
  }
}

// ============================================
// Helper: Format Preferred Date
// ============================================

function formatPreferredDate(dateStr) {
  if (!dateStr) return "غير محدد";
  // If it's already a readable string, return it as is
  return dateStr;
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
// Helper: Status Badge
// ============================================

function statusBadgeHTML(status) {
  const statusMap = {
    new: { class: "status-new", label: "جديدة" },
    contacted: { class: "status-contacted", label: "تم التواصل" },
    scheduled: { class: "status-scheduled", label: "مجدولة" },
    completed: { class: "status-completed", label: "مكتملة" },
    cancelled: { class: "status-cancelled", label: "ملغاة" },
  };
  const s = statusMap[status] || { class: "status-unknown", label: status || "غير معروف" };
  return `<span class="status-badge ${s.class}">${s.label}</span>`;
}

// ============================================
// Render Consultations
// ============================================

function renderConsultations(items) {
  if (!consultationsList) return;

  if (!items || items.length === 0) {
    consultationsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>لا توجد طلبات استشارة حتى الآن.</p>
      </div>
    `;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "consultations-table-wrap";

  const table = document.createElement("table");
  table.className = "consultations-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["العميل", "الخدمة", "الموعد المفضل", "الحالة", "التاريخ", "الإجراءات"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.dataset.id = item.id;

    // 1. العميل
    const tdName = document.createElement("td");
    tdName.textContent = item.name || "مجهول";
    tdName.style.fontWeight = item.status === "new" ? "600" : "normal";
    tr.appendChild(tdName);

    // 2. الخدمة
    const tdService = document.createElement("td");
    tdService.className = "consultation-service";
    tdService.textContent = item.service || "غير محدد";
    tr.appendChild(tdService);

    // 3. الموعد المفضل
    const tdDate = document.createElement("td");
    tdDate.textContent = formatPreferredDate(item.preferredDate);
    tr.appendChild(tdDate);

    // 4. الحالة
    const tdStatus = document.createElement("td");
    tdStatus.innerHTML = statusBadgeHTML(item.status);
    tr.appendChild(tdStatus);

    // 5. تاريخ الطلب
    const tdCreated = document.createElement("td");
    tdCreated.textContent = formatDate(item.createdAt);
    tr.appendChild(tdCreated);

    // 6. الإجراءات
    const tdActions = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "actions-cell";

    // View button
    const viewBtn = document.createElement("button");
    viewBtn.className = "btn-sm view";
    viewBtn.dataset.id = item.id;
    viewBtn.textContent = "عرض";
    viewBtn.addEventListener("click", () => openConsultationModal(item.id));
    actionsDiv.appendChild(viewBtn);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-sm delete";
    deleteBtn.dataset.id = item.id;
    deleteBtn.textContent = "حذف";
    deleteBtn.addEventListener("click", () => openDeleteModal(item.id));
    actionsDiv.appendChild(deleteBtn);

    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);

  consultationsList.innerHTML = "";
  consultationsList.appendChild(wrap);
}

// ============================================
// Load Consultations from Firestore
// ============================================

async function loadConsultations() {
  if (!consultationsList) return;

  consultationsList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل طلبات الاستشارة...</p>
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, "consultations"));

    allConsultations = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      allConsultations.push({
        id: doc.id,
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        service: data.service || "",
        preferredDate: data.preferredDate || "",
        message: data.message || "",
        status: data.status || "new",
        createdAt: data.createdAt || null,
      });
    });

    // Sort by createdAt descending (newest first)
    allConsultations.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    applyFiltersAndRender();
    return allConsultations;
  } catch (error) {
    console.error("❌ خطأ في تحميل طلبات الاستشارة:", error);
    consultationsList.innerHTML = `
      <div class="empty-state">
        <p style="color: #dc3545;">حدث خطأ أثناء تحميل طلبات الاستشارة. يرجى المحاولة لاحقاً.</p>
      </div>
    `;
    return [];
  }
}

// ============================================
// Search & Filter
// ============================================

function applyFiltersAndRender() {
  const searchTerm = searchInput?.value?.trim()?.toLowerCase() || "";
  const filterStatus = filterSelect?.value || "all";

  filteredConsultations = allConsultations.filter((item) => {
    // Search
    const matchesSearch =
      !searchTerm ||
      (item.name && item.name.toLowerCase().includes(searchTerm)) ||
      (item.phone && item.phone.includes(searchTerm)) ||
      (item.email && item.email.toLowerCase().includes(searchTerm)) ||
      (item.service && item.service.toLowerCase().includes(searchTerm)) ||
      (item.message && item.message.toLowerCase().includes(searchTerm));

    // Filter
    const matchesFilter = filterStatus === "all" || item.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  renderConsultations(filteredConsultations);
}

if (searchInput) {
  searchInput.addEventListener("input", applyFiltersAndRender);
}

if (filterSelect) {
  filterSelect.addEventListener("change", applyFiltersAndRender);
}

// ============================================
// Consultation Detail Modal
// ============================================

function openConsultationModal(id) {
  const item = allConsultations.find((c) => c.id === id);
  if (!item) {
    showToast("لم يتم العثور على طلب الاستشارة", "error");
    return;
  }

  currentConsultationId = id;

  // Build detail HTML using textContent
  const html = `
    <div class="detail-row">
      <span class="detail-label">الاسم:</span>
      <span class="detail-value">${escapeHtml(item.name) || "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">الهاتف:</span>
      <span class="detail-value">${item.phone ? `<a href="tel:${escapeHtml(item.phone)}">${escapeHtml(item.phone)}</a>` : "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">البريد:</span>
      <span class="detail-value">${item.email ? `<a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a>` : "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">الخدمة:</span>
      <span class="detail-value">${escapeHtml(item.service) || "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">الموعد المفضل:</span>
      <span class="detail-value">${escapeHtml(item.preferredDate) || "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">تاريخ الطلب:</span>
      <span class="detail-value">${formatDate(item.createdAt)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">الحالة:</span>
      <span class="detail-value">${statusBadgeHTML(item.status)}</span>
    </div>
    <div class="consultation-message">${escapeHtml(item.message) || "—"}</div>
  `;

  consultationDetail.innerHTML = html;

  // Set status select
  statusSelect.value = item.status;

  // Open modal
  consultationModal.classList.add("open");
}

function closeConsultationModal() {
  consultationModal.classList.remove("open");
  currentConsultationId = null;
}

// ============================================
// Update Status
// ============================================

async function updateConsultationStatus(id, newStatus, showToastMsg = true) {
  try {
    await updateDoc(doc(db, "consultations", id), {
      status: newStatus,
    });

    // Update local data
    const item = allConsultations.find((c) => c.id === id);
    if (item) {
      item.status = newStatus;
    }

    // Update status display in modal if open
    if (currentConsultationId === id && consultationModal.classList.contains("open")) {
      const statusValue = consultationDetail.querySelector(".detail-value:last-child");
      if (statusValue) {
        statusValue.innerHTML = statusBadgeHTML(newStatus);
      }
      statusSelect.value = newStatus;
    }

    if (showToastMsg) {
      const statusLabels = {
        new: "جديدة",
        contacted: "تم التواصل",
        scheduled: "مجدولة",
        completed: "مكتملة",
        cancelled: "ملغاة",
      };
      showToast(`تم تغيير الحالة إلى "${statusLabels[newStatus] || newStatus}"`, "success");
    }

    // Refresh list
    applyFiltersAndRender();
  } catch (error) {
    console.error("❌ خطأ في تحديث الحالة:", error);
    if (showToastMsg) {
      showToast("حدث خطأ أثناء تحديث الحالة.", "error");
    }
  }
}

// ============================================
// Delete Consultation
// ============================================

function openDeleteModal(id) {
  currentDeleteId = id;
  deleteModal.classList.add("open");
}

function closeDeleteModal() {
  deleteModal.classList.remove("open");
  currentDeleteId = null;
}

async function confirmDelete() {
  if (!currentDeleteId) return;

  try {
    await deleteDoc(doc(db, "consultations", currentDeleteId));

    // Remove from local data
    const index = allConsultations.findIndex((c) => c.id === currentDeleteId);
    if (index !== -1) {
      allConsultations.splice(index, 1);
    }

    showToast("تم حذف طلب الاستشارة بنجاح", "success");
    closeDeleteModal();

    // If consultation modal is open and showing the deleted item, close it
    if (currentConsultationId === currentDeleteId) {
      closeConsultationModal();
    }

    applyFiltersAndRender();
  } catch (error) {
    console.error("❌ خطأ في حذف طلب الاستشارة:", error);
    showToast("حدث خطأ أثناء الحذف. حاول مرة أخرى.", "error");
    closeDeleteModal();
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

  if (userEmailEl) {
    userEmailEl.textContent = user.email || "Admin";
  }
  await loadConsultations();
});

// ============================================
// Event Listeners
// ============================================

// Modal controls
if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeConsultationModal);
if (closeConsultationModalBtn) closeConsultationModalBtn.addEventListener("click", closeConsultationModal);

if (consultationModal) {
  consultationModal.addEventListener("click", (e) => {
    if (e.target === consultationModal) closeConsultationModal();
  });
}

// Update status
if (updateStatusBtn) {
  updateStatusBtn.addEventListener("click", () => {
    if (currentConsultationId) {
      const newStatus = statusSelect.value;
      updateConsultationStatus(currentConsultationId, newStatus);
    }
  });
}

// Delete from modal
if (deleteFromModalBtn) {
  deleteFromModalBtn.addEventListener("click", () => {
    if (currentConsultationId) {
      closeConsultationModal();
      setTimeout(() => openDeleteModal(currentConsultationId), 300);
    }
  });
}

// Delete confirmation
if (deleteCancel) deleteCancel.addEventListener("click", closeDeleteModal);
if (deleteConfirm) deleteConfirm.addEventListener("click", confirmDelete);

if (deleteModal) {
  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) closeDeleteModal();
  });
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (consultationModal?.classList.contains("open")) closeConsultationModal();
    if (deleteModal?.classList.contains("open")) closeDeleteModal();
  }
});

if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

// Close sidebar on resize
window.addEventListener("resize", () => {
  if (window.innerWidth > 992) {
    toggleSidebar(false);
  }
});