// ============================================
// admin/js/articles.js
// إدارة المقالات (CRUD + Publish toggle + Search)
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

const ADMIN_UID = "eJpkkgoYHhhdQKtTxseVy7DURyE3"; // استبدل هذا بالـ UID الخاص بك من Firebase Auth

// ============================================
// DOM Elements
// ============================================

const articlesList = document.getElementById("articlesList");
const searchInput = document.getElementById("articlesSearch");
const addBtn = document.getElementById("addArticleBtn");
const userEmailEl = document.getElementById("adminUserEmail");
const logoutBtn = document.getElementById("logoutButton");

// Modal elements
const modal = document.getElementById("articleModal");
const modalTitle = document.getElementById("modalTitle");
const form = document.getElementById("articleForm");
const articleId = document.getElementById("articleId");
const articleTitle = document.getElementById("articleTitle");
const articleSlug = document.getElementById("articleSlug");
const articleExcerpt = document.getElementById("articleExcerpt");
const articleContent = document.getElementById("articleContent");
const articleImage = document.getElementById("articleImage");
const articleCategory = document.getElementById("articleCategory");
const articleDate = document.getElementById("articleDate");
const articlePublished = document.getElementById("articlePublished");
const saveBtn = document.getElementById("saveArticleBtn");
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

let allArticles = [];
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
// Helper: Slug Generator
// ============================================

function generateSlug(text) {
  if (!text) return "";
  // Remove special characters, replace spaces with hyphens
  // Keep Arabic letters, numbers, and hyphens
  let slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, "") // Keep Arabic, English, numbers, spaces, hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

  // If after cleaning it's empty, use a timestamp
  if (!slug) {
    slug = `article-${Date.now()}`;
  }

  return slug;
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
// Render Articles
// ============================================

function renderArticles(articles) {
  if (!articlesList) return;

  if (!articles || articles.length === 0) {
    articlesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>لا توجد مقالات مضافة حتى الآن.</p>
        <button class="btn btn-primary" id="emptyAddBtn">+ إضافة أول مقال</button>
      </div>
    `;
    const emptyAdd = document.getElementById("emptyAddBtn");
    if (emptyAdd) emptyAdd.addEventListener("click", openAddModal);
    return;
  }

  // Build table using DOM methods for safety
  const wrap = document.createElement("div");
  wrap.className = "articles-table-wrap";

  const table = document.createElement("table");
  table.className = "articles-table";

  // Header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["العنوان", "الرابط", "النص المختصر", "الحالة", "الإجراءات"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  articles.forEach((article) => {
    const tr = document.createElement("tr");
    tr.dataset.id = article.id;

    // 1. العنوان
    const tdTitle = document.createElement("td");
    tdTitle.className = "article-title-cell";
    tdTitle.textContent = article.title || "بدون عنوان";
    tr.appendChild(tdTitle);

    // 2. Slug
    const tdSlug = document.createElement("td");
    tdSlug.className = "article-slug-cell";
    tdSlug.textContent = article.slug || "—";
    tr.appendChild(tdSlug);

    // 3. النص المختصر
    const tdExcerpt = document.createElement("td");
    tdExcerpt.className = "article-excerpt-cell";
    tdExcerpt.textContent = article.excerpt || "—";
    tr.appendChild(tdExcerpt);

    // 4. الحالة
    const tdStatus = document.createElement("td");
    const isPublished = article.published === true;
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
    editBtn.dataset.id = article.id;
    editBtn.textContent = "تعديل";
    editBtn.addEventListener("click", () => openEditModal(article.id));
    actionsDiv.appendChild(editBtn);

    // Toggle publish button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = `btn-sm toggle-pub ${isPublished ? "unpublish" : "publish"}`;
    toggleBtn.dataset.id = article.id;
    toggleBtn.textContent = isPublished ? "إخفاء" : "نشر";
    toggleBtn.addEventListener("click", () => togglePublished(article.id));
    actionsDiv.appendChild(toggleBtn);

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-sm delete";
    deleteBtn.dataset.id = article.id;
    deleteBtn.textContent = "حذف";
    deleteBtn.addEventListener("click", () => openDeleteModal(article.id));
    actionsDiv.appendChild(deleteBtn);

    tdActions.appendChild(actionsDiv);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  wrap.appendChild(table);

  // Clear and append
  articlesList.innerHTML = "";
  articlesList.appendChild(wrap);
}

// ============================================
// Load Articles from Firestore
// ============================================

async function loadArticles() {
  if (!articlesList) return;

  articlesList.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل المقالات...</p>
    </div>
  `;

  try {
    const snapshot = await getDocs(collection(db, "articles"));

    allArticles = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      allArticles.push({
        id: doc.id,
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        image: data.image || "",
        category: data.category || "",
        date: data.date || "",
        published: data.published === true,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      });
    });

    // Sort by createdAt descending (newest first)
    allArticles.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    renderArticles(allArticles);
    return allArticles;
  } catch (error) {
    console.error("❌ خطأ في تحميل المقالات:", error);
    articlesList.innerHTML = `
      <div class="empty-state">
        <p style="color: #dc3545;">حدث خطأ أثناء تحميل المقالات. يرجى المحاولة لاحقاً.</p>
      </div>
    `;
    return [];
  }
}

// ============================================
// Search (Client-side)
// ============================================

function filterArticles(queryText) {
  if (!queryText.trim()) {
    renderArticles(allArticles);
    return;
  }
  const q = queryText.trim().toLowerCase();
  const filtered = allArticles.filter((article) => {
    return (
      (article.title && article.title.toLowerCase().includes(q)) ||
      (article.slug && article.slug.toLowerCase().includes(q)) ||
      (article.excerpt && article.excerpt.toLowerCase().includes(q))
    );
  });
  renderArticles(filtered);
}

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    filterArticles(e.target.value);
  });
}

// ============================================
// Modal Helpers
// ============================================

function openModal(title, data = null) {
  if (!modal) return;
  isEditMode = !!data;
  modalTitle.textContent = title;
  articleId.value = data?.id || "";
  articleTitle.value = data?.title || "";
  articleSlug.value = data?.slug || "";
  articleExcerpt.value = data?.excerpt || "";
  articleContent.value = data?.content || "";
  articleImage.value = data?.image || "";
  articleCategory.value = data?.category || "";
  articleDate.value = data?.date || "";
  articlePublished.checked = data?.published !== undefined ? data.published : true;
  saveBtn.textContent = isEditMode ? "حفظ التعديلات" : "إضافة";
  modal.classList.add("open");
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("open");
  form.reset();
  articleId.value = "";
  isEditMode = false;
  articlePublished.checked = true;
}

function openAddModal() {
  openModal("إضافة مقال جديد");
}

function openEditModal(id) {
  const article = allArticles.find((a) => a.id === id);
  if (!article) {
    showToast("لم يتم العثور على المقال", "error");
    return;
  }
  openModal("تعديل المقال", article);
}

// ============================================
// Save Article (Add / Update)
// ============================================

async function saveArticle(e) {
  e.preventDefault();

  const title = articleTitle.value.trim();
  const content = articleContent.value.trim();

  if (!title) {
    showToast("يرجى إدخال عنوان المقال", "error");
    articleTitle.focus();
    return;
  }

  if (!content) {
    showToast("يرجى إدخال محتوى المقال", "error");
    articleContent.focus();
    return;
  }

  // Generate slug if empty
  let slug = articleSlug.value.trim();
  if (!slug) {
    slug = generateSlug(title);
  }

  const data = {
    title,
    slug,
    excerpt: articleExcerpt.value.trim() || "",
    content,
    published: articlePublished.checked,
    updatedAt: serverTimestamp(),
  };

  // Optional fields (only add if they have values)
  const image = articleImage.value.trim();
  if (image) data.image = image;

  const category = articleCategory.value.trim();
  if (category) data.category = category;

  const date = articleDate.value.trim();
  if (date) data.date = date;

  try {
    if (isEditMode) {
      const id = articleId.value;
      await updateDoc(doc(db, "articles", id), data);
      showToast("تم تحديث المقال بنجاح", "success");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "articles"), data);
      showToast("تم إضافة المقال بنجاح", "success");
    }

    closeModal();
    await loadArticles();
  } catch (error) {
    console.error("❌ خطأ في حفظ المقال:", error);
    showToast("حدث خطأ أثناء حفظ البيانات. حاول مرة أخرى.", "error");
  }
}

// ============================================
// Delete Article
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
    await deleteDoc(doc(db, "articles", currentDeleteId));
    showToast("تم حذف المقال بنجاح", "success");
    closeDeleteModal();
    await loadArticles();
  } catch (error) {
    console.error("❌ خطأ في حذف المقال:", error);
    showToast("حدث خطأ أثناء الحذف. حاول مرة أخرى.", "error");
    closeDeleteModal();
  }
}

// ============================================
// Toggle Published Status
// ============================================

async function togglePublished(id) {
  const article = allArticles.find((a) => a.id === id);
  if (!article) {
    showToast("لم يتم العثور على المقال", "error");
    return;
  }

  const newStatus = !article.published;
  try {
    await updateDoc(doc(db, "articles", id), {
      published: newStatus,
      updatedAt: serverTimestamp(),
    });
    showToast(newStatus ? "تم نشر المقال" : "تم إخفاء المقال", "success");
    await loadArticles();
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
  await loadArticles();
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
  form.addEventListener("submit", saveArticle);
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

// Auto-generate slug from title when user types
if (articleTitle && articleSlug) {
  let titleTimeout;
  articleTitle.addEventListener("input", () => {
    // Only auto-generate if slug field is empty or was auto-generated
    // We'll check if the slug matches the current title's generated slug
    clearTimeout(titleTimeout);
    titleTimeout = setTimeout(() => {
      const currentSlug = articleSlug.value.trim();
      // If slug is empty, auto-generate
      if (!currentSlug) {
        const generated = generateSlug(articleTitle.value);
        articleSlug.value = generated;
      }
    }, 300);
  });
}