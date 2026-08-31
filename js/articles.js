// ============================================
// js/articles.js
// صفحة المقالات - تحميل وعرض المقالات من Firestore
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

const container = document.getElementById("articles-container");

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
  if (!container) return;

  container.innerHTML = "";

  if (!articles || articles.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>لا توجد مقالات منشورة حالياً.</p>
      </div>
    `;
    return;
  }

  articles.forEach((article) => {
    const card = document.createElement("article");
    card.className = "article-card";

    // Image
    const hasImage = article.image && article.image.trim() !== "";

    if (hasImage) {
      const imageDiv = document.createElement("div");
      imageDiv.className = "article-image";
      imageDiv.style.backgroundImage = `url('${escapeHtml(article.image)}')`;
      card.appendChild(imageDiv);
    } else {
      // Fallback without external file
      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "article-image-fallback";
      fallbackDiv.textContent = "📄";
      card.appendChild(fallbackDiv);
    }

    // Content
    const contentDiv = document.createElement("div");
    contentDiv.className = "article-content";

    // Category (optional)
    if (article.category && article.category.trim() !== "") {
      const categorySpan = document.createElement("span");
      categorySpan.className = "article-category";
      categorySpan.textContent = article.category;
      contentDiv.appendChild(categorySpan);
    }

    // Title
    const titleEl = document.createElement("h3");
    titleEl.className = "article-title";
    titleEl.textContent = article.title || "مقال";
    contentDiv.appendChild(titleEl);

    // Excerpt (optional)
    if (article.excerpt && article.excerpt.trim() !== "") {
      const excerptEl = document.createElement("p");
      excerptEl.className = "article-excerpt";
      excerptEl.textContent = article.excerpt;
      contentDiv.appendChild(excerptEl);
    }

    // Meta (date + read more)
    const metaDiv = document.createElement("div");
    metaDiv.className = "article-meta";

    // Date (optional)
    if (article.date && article.date.trim() !== "") {
      const dateSpan = document.createElement("span");
      dateSpan.className = "article-date";
      dateSpan.textContent = article.date;
      metaDiv.appendChild(dateSpan);
    }

    // Read more link
    const linkEl = document.createElement("a");
    linkEl.className = "card-link";

    if (article.slug && article.slug.trim() !== "") {
      linkEl.href = `article.html?slug=${encodeURIComponent(article.slug)}`;
      linkEl.textContent = "اقرأ المزيد ←";
    } else {
      // If no slug, make it a non-functional link or hide it
      linkEl.href = "#";
      linkEl.textContent = "اقرأ المزيد ←";
      linkEl.style.opacity = "0.5";
      linkEl.style.pointerEvents = "none";
    }

    metaDiv.appendChild(linkEl);
    contentDiv.appendChild(metaDiv);
    card.appendChild(contentDiv);

    container.appendChild(card);
  });
}

// ============================================
// Load Articles from Firestore
// ============================================

async function loadArticles() {
  if (!container) return;

  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>جاري تحميل المقالات...</p>
    </div>
  `;

  try {
    const q = query(
      collection(db, "articles"),
      where("published", "==", true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      renderArticles([]);
      return;
    }

    const articles = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      articles.push({
        id: doc.id,
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        image: data.image || "",
        category: data.category || "",
        date: data.date || "",
        published: data.published,
      });
    });

    // Sort by date if available, otherwise by title
    articles.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date) - new Date(a.date);
      }
      return (a.title || "").localeCompare(b.title || "");
    });

    renderArticles(articles);

  } catch (error) {
    console.error("❌ خطأ في تحميل المقالات:", error);
    container.innerHTML = `
      <div class="error-state">
        <p>تعذر تحميل المقالات حاليًا. يرجى المحاولة مرة أخرى لاحقاً.</p>
      </div>
    `;
  }
}

// ============================================
// Initialize
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  loadArticles();
});