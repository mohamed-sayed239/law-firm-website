// ============================================
// admin/js/messages.js
// إدارة رسائل العملاء (عرض، بحث، تصفية، تغيير الحالة، حذف)
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

const ADMIN_UID = "ACccyzUM8YXVhqY1PEAnRo43Wgk2";

// ============================================
// DOM Elements
// ============================================

const messagesList = document.getElementById("messagesList");
const searchInput = document.getElementById("messagesSearch");
const filterSelect = document.getElementById("messagesFilter");
const userEmailEl = document.getElementById("adminUserEmail");
const logoutBtn = document.getElementById("logoutButton");

// Message Detail Modal
const messageModal = document.getElementById("messageModal");
const modalTitle = document.getElementById("modalTitle");
const messageDetail = document.getElementById("messageDetail");
const statusSelect = document.getElementById("messageStatusSelect");
const updateStatusBtn = document.getElementById("updateStatusBtn");
const deleteFromModalBtn = document.getElementById("deleteFromModalBtn");
const closeMessageModalBtn = document.getElementById("closeMessageModal");
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

let allMessages = [];
let filteredMessages = [];
let currentMessageId = null;
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
    read: { class: "status-read", label: "مقروءة" },
    replied: { class: "status-replied", label: "تم الرد" },
    closed: { class: "status-closed", label: "مغلقة" },
  };
  const s = statusMap[status] || { class: "status-unknown", label: status || "غير معروف" };
  return `<span class="status-badge ${s.class}">${s.label}</span>`;
}

// ============================================
// Render Messages
// ============================================

function renderMessages(messages) {
  if (!messagesList) return;

  if (!messages || messages.length === 0) {
    messagesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>لا توجد رسائل حتى الآن.</p>
      </div>
    `;
    return;
  }

  // Build table using DOM methods
  const wrap = document.createElement("div");
  wrap.className = "messages-table-wrap";

  const table = document.createElement("table");
  table.className = "messages-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["المرسل", "الموضوع", "مقتطف", "الحالة", "التاريخ", "الإجراءات"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  messages.forEach((msg) => {
    const tr = document.createElement("tr");
    tr.dataset.id = msg.id;

    // 1. المرسل
    const tdName = document.createElement("td");
    tdName.textContent = msg.name || "مجهول";
    tdName.style.fontWeight = msg.status === "new" ? "600" : "normal";
    tr.appendChild(tdName);

    // 2. الموضوع
    const tdSubject = document.createElement("td");
    tdSubject.className = "message-subject";
    tdSubject.textContent = msg.subject || "بدون موضوع";
    tr.appendChild(tdSubject);

    // 3. مقتطف
    const tdPreview = document.createElement("td");
    tdPreview.className = "message-preview";
    const preview = msg.message ? msg.message.substring(0, 60) : "";
    tdPreview.textContent = preview + (preview.length === 60 ? "..." : "");
    tr.appendChild(tdPreview);

    // 4. الحالة
    const tdStatus = document.createElement("td");
    tdStatus.innerHTML = statusBadgeHTML(msg.status);
    tr.appendChild(tdStatus);

    // 5. التاريخ
    const tdDate = document.createElement("td");
    tdDate.textContent = formatDate(msg.createdAt);
    tr.appendChild(tdDate);

    // 6. الإجراءات
    const tdActions = document.createElement("td");
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "actions-cell";

    // View button
    const viewBtn = document.createElement("button");
    viewBtn.className = "btn-sm view";
    viewBtn.dataset.id = msg.id;
    viewBtn.textContent = "عرض";
    viewBtn.addEventListener("click", () => openMessageModal(msg.id));
    actionsDiv.appendChild(viewBtn);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-sm delete";
    deleteBtn.dataset.id = msg.id;
    deleteBtn.textContent = "حذف";
    deleteBtn.addEventListener("click", () => openDeleteModal(msg.id));
    actionsDiv.appendChild(deleteBtn);

    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);

  messagesList.innerHTML = "";
  messagesList.appendChild(wrap);
}

// ============================================
// Load Messages from Firestore
// ============================================

async function loadMessages() {
  if (!messagesList) return;

  messagesList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل الرسائل...</p>
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, "messages"));

    allMessages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      allMessages.push({
        id: doc.id,
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        subject: data.subject || "",
        message: data.message || "",
        status: data.status || "new",
        createdAt: data.createdAt || null,
      });
    });

    // Sort by createdAt descending (newest first)
    allMessages.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    applyFiltersAndRender();
    return allMessages;
  } catch (error) {
    console.error("❌ خطأ في تحميل الرسائل:", error);
    messagesList.innerHTML = `
      <div class="empty-state">
        <p style="color: #dc3545;">حدث خطأ أثناء تحميل الرسائل. يرجى المحاولة لاحقاً.</p>
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

  filteredMessages = allMessages.filter((msg) => {
    // Search
    const matchesSearch =
      !searchTerm ||
      (msg.name && msg.name.toLowerCase().includes(searchTerm)) ||
      (msg.phone && msg.phone.includes(searchTerm)) ||
      (msg.email && msg.email.toLowerCase().includes(searchTerm)) ||
      (msg.subject && msg.subject.toLowerCase().includes(searchTerm)) ||
      (msg.message && msg.message.toLowerCase().includes(searchTerm));

    // Filter
    const matchesFilter = filterStatus === "all" || msg.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  renderMessages(filteredMessages);
}

if (searchInput) {
  searchInput.addEventListener("input", applyFiltersAndRender);
}

if (filterSelect) {
  filterSelect.addEventListener("change", applyFiltersAndRender);
}

// ============================================
// Message Detail Modal
// ============================================

function openMessageModal(id) {
  const msg = allMessages.find((m) => m.id === id);
  if (!msg) {
    showToast("لم يتم العثور على الرسالة", "error");
    return;
  }

  currentMessageId = id;

  // Build detail HTML using textContent
  const html = `
    <div class="detail-row">
      <span class="detail-label">الاسم:</span>
      <span class="detail-value">${escapeHtml(msg.name) || "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">الهاتف:</span>
      <span class="detail-value">${msg.phone ? `<a href="tel:${escapeHtml(msg.phone)}">${escapeHtml(msg.phone)}</a>` : "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">البريد:</span>
      <span class="detail-value">${msg.email ? `<a href="mailto:${escapeHtml(msg.email)}">${escapeHtml(msg.email)}</a>` : "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">الموضوع:</span>
      <span class="detail-value">${escapeHtml(msg.subject) || "—"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">التاريخ:</span>
      <span class="detail-value">${formatDate(msg.createdAt)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">الحالة:</span>
      <span class="detail-value">${statusBadgeHTML(msg.status)}</span>
    </div>
    <div class="message-body">${escapeHtml(msg.message) || "—"}</div>
  `;

  messageDetail.innerHTML = html;

  // Set status select
  statusSelect.value = msg.status;

  // Open modal
  messageModal.classList.add("open");

  // Auto-mark as read if status is "new"
  if (msg.status === "new") {
    updateMessageStatus(id, "read", false);
  }
}

function closeMessageModal() {
  messageModal.classList.remove("open");
  currentMessageId = null;
}

// ============================================
// Update Status
// ============================================

async function updateMessageStatus(id, newStatus, showToastMsg = true) {
  try {
    await updateDoc(doc(db, "messages", id), {
      status: newStatus,
    });

    // Update local data
    const msg = allMessages.find((m) => m.id === id);
    if (msg) {
      msg.status = newStatus;
    }

    // Update status display in modal if open
    if (currentMessageId === id && messageModal.classList.contains("open")) {
      const statusValue = messageDetail.querySelector(".detail-value:last-child");
      if (statusValue) {
        statusValue.innerHTML = statusBadgeHTML(newStatus);
      }
      statusSelect.value = newStatus;
    }

    if (showToastMsg) {
      const statusLabels = { new: "جديدة", read: "مقروءة", replied: "تم الرد", closed: "مغلقة" };
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
// Delete Message
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
    await deleteDoc(doc(db, "messages", currentDeleteId));

    // Remove from local data
    const index = allMessages.findIndex((m) => m.id === currentDeleteId);
    if (index !== -1) {
      allMessages.splice(index, 1);
    }

    showToast("تم حذف الرسالة بنجاح", "success");
    closeDeleteModal();

    // If message modal is open and showing the deleted message, close it
    if (currentMessageId === currentDeleteId) {
      closeMessageModal();
    }

    applyFiltersAndRender();
  } catch (error) {
    console.error("❌ خطأ في حذف الرسالة:", error);
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
  await loadMessages();
});

// ============================================
// Event Listeners
// ============================================

// Modal controls
if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeMessageModal);
if (closeMessageModalBtn) closeMessageModalBtn.addEventListener("click", closeMessageModal);

if (messageModal) {
  messageModal.addEventListener("click", (e) => {
    if (e.target === messageModal) closeMessageModal();
  });
}

// Update status
if (updateStatusBtn) {
  updateStatusBtn.addEventListener("click", () => {
    if (currentMessageId) {
      const newStatus = statusSelect.value;
      updateMessageStatus(currentMessageId, newStatus);
    }
  });
}

// Delete from modal
if (deleteFromModalBtn) {
  deleteFromModalBtn.addEventListener("click", () => {
    if (currentMessageId) {
      closeMessageModal();
      setTimeout(() => openDeleteModal(currentMessageId), 300);
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
    if (messageModal?.classList.contains("open")) closeMessageModal();
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