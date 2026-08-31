// ============================================
// admin/js/services.js
// إدارة الخدمات (CRUD)
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
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// ============================================
// Configuration
// ============================================

const ADMIN_UID = "ACccyzUM8YXVhqY1PEAnRo43Wgk2";

// ============================================
// DOM References
// ============================================

const userEmailEl = document.getElementById("adminUserEmail");
const logoutBtn = document.getElementById("logoutButton");

// Sidebar elements
const sidebar = document.getElementById("adminSidebar");
const backdrop = document.getElementById("sidebarBackdrop");
const toggleBtn = document.getElementById("sidebarToggle");

// Table & Cards
const tableBody = document.getElementById("servicesTableBody");
const cardsContainer = document.getElementById("servicesCards");
const searchInput = document.getElementById("servicesSearch");

// Modal elements
const modalOverlay = document.getElementById("serviceModal");
const modalTitle = document.getElementById("modalTitle");
const form = document.getElementById("serviceForm");
const serviceIdInput = document.getElementById("serviceId");
const titleInput = document.getElementById("serviceTitle");
const descInput = document.getElementById("serviceDescription");
const iconInput = document.getElementById("serviceIcon");
const publishedCheck = document.getElementById("servicePublished");
const saveBtn = document.getElementById("saveServiceBtn");
const cancelBtn = document.getElementById("cancelModal");

// Delete modal
const deleteModal = document.getElementById("deleteModal");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDelete");

// Add button
const addBtn = document.getElementById("addServiceBtn");

// ============================================
// State
// ============================================

let services = []; // array of { id, title, description, icon, published, createdAt, updatedAt }
let editingId = null; // null = add mode, string = edit mode
let deleteTargetId = null;

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
// Toast (using simple alert for now, but could integrate with existing toast system)
// ============================================

function showToast(message, type = "success") {
  // Try to use existing toast if available
  const toastFn = window.showToast; // if defined globally
  if (typeof toastFn === "function") {
    toastFn(message, type);
    return;
  }
  // Fallback: simple alert
  alert(message);
}

// ============================================
// Load Services from Firestore
// ============================================

async function loadServices() {
  try {
    const querySnapshot = await getDocs(collection(db, "services"));
    services = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      services.push({
        id: doc.id,
        title: data.title || "بدون عنوان",
        description: data.description || "",
        icon: data.icon || "",
        published: data.published !== undefined ? data.published : true,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    // Sort by title or createdAt if needed
    renderServices();
  } catch (error) {
    console.error("❌ خطأ في تحميل الخدمات:", error);
    showToast("حدث خطأ أثناء تحميل الخدمات.", "error");
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-muted);">حدث خطأ، حاول مرة أخرى.</td></tr>`;
    cardsContainer.innerHTML = `<div class="empty-state-small">حدث خطأ، حاول مرة أخرى.</div>`;
  }
}

// ============================================
// Render Services (Table + Cards)
// ============================================

function renderServices(filter = "") {
  const filtered = services.filter(s =>
    s.title.includes(filter) || s.description.includes(filter)
  );

  // Table
  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-muted);">لا توجد خدمات مضافة حتى الآن.</td></tr>`;
    cardsContainer.innerHTML = `<div class="empty-state-small">لا توجد خدمات مضافة حتى الآن.</div>`;
    return;
  }

  // Table rows
  let tableRows = "";
  filtered.forEach((s, index) => {
    const statusClass = s.published ? "published" : "unpublished";
    const statusText = s.published ? "منشورة" : "غير منشورة";
    tableRows += `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHTML(s.title)}</strong></td>
        <td>${escapeHTML(s.description)}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <div class="actions">
            <button class="btn-edit" data-id="${s.id}" aria-label="تعديل">✏️ تعديل</button>
            <button class="btn-toggle" data-id="${s.id}" aria-label="تغيير النشر">🔄 ${s.published ? "إلغاء النشر" : "نشر"}</button>
            <button class="btn-delete" data-id="${s.id}" aria-label="حذف">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = tableRows;

  // Cards (mobile)
  let cardsHtml = "";
  filtered.forEach((s, index) => {
    const statusClass = s.published ? "published" : "unpublished";
    const statusText = s.published ? "منشورة" : "غير منشورة";
    cardsHtml += `
      <div class="service-card-item">
        <div class="card-header">
          <span class="card-title">${escapeHTML(s.title)}</span>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="card-desc">${escapeHTML(s.description)}</div>
        <div class="card-actions">
          <button class="btn-edit" data-id="${s.id}">✏️ تعديل</button>
          <button class="btn-toggle" data-id="${s.id}">🔄 ${s.published ? "إلغاء النشر" : "نشر"}</button>
          <button class="btn-delete" data-id="${s.id}">🗑️ حذف</button>
        </div>
      </div>
    `;
  });
  cardsContainer.innerHTML = cardsHtml;

  // Attach event listeners to action buttons
  document.querySelectorAll(".btn-edit").forEach(btn => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.id));
  });
  document.querySelectorAll(".btn-toggle").forEach(btn => {
    btn.addEventListener("click", () => togglePublished(btn.dataset.id));
  });
  document.querySelectorAll(".btn-delete").forEach(btn => {
    btn.addEventListener("click", () => openDeleteModal(btn.dataset.id));
  });
}

// ============================================
// Escape HTML to prevent XSS
// ============================================

function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Search
// ============================================

searchInput.addEventListener("input", (e) => {
  renderServices(e.target.value.trim());
});

// ============================================
// Modal: Open Add
// ============================================

function openAddModal() {
  editingId = null;
  modalTitle.textContent = "إضافة خدمة جديدة";
  form.reset();
  serviceIdInput.value = "";
  publishedCheck.checked = true;
  saveBtn.textContent = "حفظ";
  modalOverlay.classList.add("open");
}

addBtn.addEventListener("click", openAddModal);

// ============================================
// Modal: Open Edit
// ============================================

async function openEditModal(id) {
  const service = services.find(s => s.id === id);
  if (!service) {
    showToast("الخدمة غير موجودة.", "error");
    return;
  }
  editingId = id;
  modalTitle.textContent = "تعديل الخدمة";
  serviceIdInput.value = id;
  titleInput.value = service.title || "";
  descInput.value = service.description || "";
  iconInput.value = service.icon || "";
  publishedCheck.checked = service.published !== undefined ? service.published : true;
  saveBtn.textContent = "حفظ التعديلات";
  modalOverlay.classList.add("open");
}

// ============================================
// Modal: Close
// ============================================

function closeModal() {
  modalOverlay.classList.remove("open");
  form.reset();
  serviceIdInput.value = "";
  editingId = null;
}

cancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ============================================
// Save Service (Add or Update)
// ============================================

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (!title) {
    showToast("الرجاء إدخال عنوان الخدمة.", "error");
    return;
  }

  const data = {
    title,
    description: descInput.value.trim(),
    icon: iconInput.value.trim(),
    published: publishedCheck.checked,
    updatedAt: serverTimestamp(),
  };

  saveBtn.disabled = true;
  saveBtn.textContent = "جاري الحفظ...";

  try {
    if (editingId) {
      // Update
      await updateDoc(doc(db, "services", editingId), data);
      showToast("تم تحديث الخدمة بنجاح.", "success");
    } else {
      // Add
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "services"), data);
      showToast("تم إضافة الخدمة بنجاح.", "success");
    }
    closeModal();
    await loadServices(); // refresh list
  } catch (error) {
    console.error("❌ خطأ في حفظ الخدمة:", error);
    showToast("حدث خطأ أثناء حفظ الخدمة.", "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = editingId ? "حفظ التعديلات" : "حفظ";
  }
});

// ============================================
// Delete Confirmation
// ============================================

function openDeleteModal(id) {
  deleteTargetId = id;
  deleteModal.classList.add("open");
}

cancelDeleteBtn.addEventListener("click", () => {
  deleteModal.classList.remove("open");
  deleteTargetId = null;
});

deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) {
    deleteModal.classList.remove("open");
    deleteTargetId = null;
  }
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!deleteTargetId) return;
  try {
    await deleteDoc(doc(db, "services", deleteTargetId));
    showToast("تم حذف الخدمة بنجاح.", "success");
    deleteModal.classList.remove("open");
    deleteTargetId = null;
    await loadServices();
  } catch (error) {
    console.error("❌ خطأ في حذف الخدمة:", error);
    showToast("حدث خطأ أثناء حذف الخدمة.", "error");
  }
});

// ============================================
// Toggle Published Status
// ============================================

async function togglePublished(id) {
  const service = services.find(s => s.id === id);
  if (!service) return;
  const newStatus = !service.published;
  try {
    await updateDoc(doc(db, "services", id), {
      published: newStatus,
      updatedAt: serverTimestamp(),
    });
    showToast(`تم ${newStatus ? "نشر" : "إلغاء نشر"} الخدمة.`, "success");
    await loadServices();
  } catch (error) {
    console.error("❌ خطأ في تغيير حالة النشر:", error);
    showToast("حدث خطأ أثناء تغيير حالة النشر.", "error");
  }
}

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
  userEmailEl.textContent = user.email || "Admin";
  // Load services
  await loadServices();
});

// ============================================
// Close sidebar on resize to desktop
// ============================================

window.addEventListener("resize", () => {
  if (window.innerWidth > 992) {
    toggleSidebar(false);
  }
});