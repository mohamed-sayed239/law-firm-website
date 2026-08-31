// ============================================
// js/article.js
// عرض مقال واحد بناءً على slug من URL
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

const container = document.getElementById("article-container");

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
// Helper: Update SEO Metadata
// ============================================

function updateSEO(article) {
  if (!article) return;

  // Title
  if (article.title) {
    document.title = `${article.title} | مكتب عمرو عبدالحكيم للمحاماة`;
  }

  // Meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && article.excerpt) {
    metaDesc.content = article.excerpt;
  } else if (metaDesc && article.title) {
    metaDesc.content = `اقرأ المقال: ${article.title} من مكتب عمرو عبدالحكيم للمحاماة.`;
  }

  // Open Graph
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && article.title) {
    ogTitle.content = `${article.title} | مكتب عمرو عبدالحكيم للمحاماة`;
  }

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && article.excerpt) {
    ogDesc.content = article.excerpt;
  }

  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage && article.image) {
    ogImage.content = article.image;
  }
}

// ============================================
// Render Article
// ============================================

function renderArticle(article) {
  if (!container) return;

  // Clear container
  container.innerHTML = "";

  // Back link
  const backLink = document.createElement("a");
  backLink.className = "article-back-link";
  backLink.href = "articles.html";
  backLink.textContent = "← العودة إلى المقالات";
  container.appendChild(backLink);

  // Article header
  const header = document.createElement("header");
  header.className = "article-header";

  // Category (optional)
  if (article.category && article.category.trim() !== "") {
    const categorySpan = document.createElement("span");
    categorySpan.className = "article-category";
    categorySpan.textContent = article.category;
    header.appendChild(categorySpan);
  }

  // Title
  const titleEl = document.createElement("h1");
  titleEl.className = "article-title";
  titleEl.textContent = article.title || "بدون عنوان";
  header.appendChild(titleEl);

  // Meta (date + excerpt)
  const metaDiv = document.createElement("div");
  metaDiv.className = "article-meta";

  // Date
  if (article.date && article.date.trim() !== "") {
    const dateSpan = document.createElement("span");
    dateSpan.className = "article-date";
    dateSpan.textContent = article.date;
    metaDiv.appendChild(dateSpan);
  }

  // Excerpt (if exists, show it in meta)
  if (article.excerpt && article.excerpt.trim() !== "") {
    const excerptP = document.createElement("p");
    excerptP.className = "article-excerpt";
    excerptP.textContent = article.excerpt;
    metaDiv.appendChild(excerptP);
  }

  header.appendChild(metaDiv);
  container.appendChild(header);

  // Image (optional)
  if (article.image && article.image.trim() !== "") {
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "article-image-wrapper";

    const img = document.createElement("img");
    img.src = article.image;
    img.alt = article.title || "صورة المقال";
    img.loading = "lazy";
    img.onerror = function () {
      this.style.display = "none";
      const fallback = document.createElement("div");
      fallback.className = "image-fallback";
      fallback.textContent = "📄";
      this.parentNode.appendChild(fallback);
    };
    imageWrapper.appendChild(img);
    container.appendChild(imageWrapper);
  }

  // Content (using textContent for safety)
  const contentDiv = document.createElement("div");
  contentDiv.className = "article-content";

  if (article.content && article.content.trim() !== "") {
    // Split by newlines to create paragraphs
    const paragraphs = article.content.split(/\n+/);
    paragraphs.forEach((para) => {
      if (para.trim() !== "") {
        const p = document.createElement("p");
        p.textContent = para.trim();
        contentDiv.appendChild(p);
      }
    });
  } else {
    const p = document.createElement("p");
    p.textContent = "المقال لا يحتوي على محتوى مكتوب حالياً.";
    contentDiv.appendChild(p);
  }

  container.appendChild(contentDiv);

  // CTA
  const ctaSection = document.createElement("section");
  ctaSection.className = "article-cta";
  ctaSection.innerHTML = `
    <h3>هل تحتاج إلى استشارة قانونية؟</h3>
    <p>نحن هنا لمساعدتك. احجز استشارتك اليوم وتواصل مع فريقنا المتخصص.</p>
    <div class="cta-buttons">
      <a href="consultation.html" class="btn btn-accent">احجز استشارة</a>
      <a href="contact.html" class="btn btn-outline">تواصل معنا</a>
    </div>
  `;
  container.appendChild(ctaSection);

  // Update SEO
  updateSEO(article);
}

// ============================================
// Show Loading State
// ============================================

function showLoading() {
  if (!container) return;
  container.innerHTML = `
    <div class="article-state" id="article-loading">
      <div class="spinner"></div>
      <p>جاري تحميل المقال...</p>
    </div>
  `;
}

// ============================================
// Show Not Found State
// ============================================

function showNotFound() {
  if (!container) return;
  container.innerHTML = `
    <div class="article-state">
      <span class="state-icon">📄</span>
      <h2>المقال غير موجود</h2>
      <p>المقال المطلوب غير موجود أو لم يعد منشوراً.</p>
      <a href="articles.html" class="btn btn-primary">العودة إلى المقالات</a>
    </div>
  `;
}

// ============================================
// Show Error State
// ============================================

function showError() {
  if (!container) return;
  container.innerHTML = `
    <div class="article-state">
      <span class="state-icon">⚠️</span>
      <h2>حدث خطأ</h2>
      <p>تعذر تحميل المقال حاليًا. يرجى المحاولة مرة أخرى لاحقاً.</p>
      <a href="articles.html" class="btn btn-primary">العودة إلى المقالات</a>
    </div>
  `;
}

// ============================================
// Load Article by Slug
// ============================================

async function loadArticle(slug) {
  if (!slug || slug.trim() === "") {
    showNotFound();
    return;
  }

  showLoading();

  try {
    const q = query(
      collection(db, "articles"),
      where("slug", "==", slug),
      where("published", "==", true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      showNotFound();
      return;
    }

    // Get the first matching article (slug should be unique)
    let articleData = null;
    snapshot.forEach((doc) => {
      const data = doc.data();
      articleData = {
        id: doc.id,
        title: data.title || "",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        image: data.image || "",
        category: data.category || "",
        date: data.date || "",
        published: data.published,
      };
    });

    if (!articleData) {
      showNotFound();
      return;
    }

    renderArticle(articleData);

  } catch (error) {
    console.error("❌ خطأ في تحميل المقال:", error);
    showError();
  }
}

// ============================================
// Initialize
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  loadArticle(slug);
});