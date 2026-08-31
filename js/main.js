// ============================================
// main.js - الموقع الأساسي لمكتب المحاماة
// يحتوي على: Firebase, Navigation, Scroll, Reveal, Toast, Data Loading, Forms
// ============================================

import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ============================================
// 1. Navigation (تفعيل الرابط النشط)
// ============================================

function initActiveNavigation() {
  const currentPath =
    window.location.pathname.split("/").pop() || "index.html";

  const navLinks = document.querySelectorAll(
    ".navbar-links a, .mobile-bottom-nav a"
  );

  navLinks.forEach((link) => {
    const linkPath = link.getAttribute("href");
    if (linkPath === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}


// ============================================
// 2. Navbar Scroll (تغيير خلفية الناف بار عند التمرير)
// ============================================

function initNavbarScroll() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  function handleScroll() {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", handleScroll);
  handleScroll();
}


// ============================================
// 3. Scroll Reveal (ظهور العناصر عند التمرير)
// ============================================

function initScrollReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }
  );

  elements.forEach((el) => observer.observe(el));
}

function addRevealClasses() {
  document.querySelectorAll("section").forEach((section) => {
    section.classList.add("reveal");
  });
  initScrollReveal();
}


// ============================================
// 4. Toast (رسائل منبثقة)
// ============================================

export function showToast(message, type = "info") {
  const container = document.querySelector(".toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}


// ============================================
// 5. Firebase Data Loading
// ============================================

// ----- 5.1 Settings (إعدادات الموقع) -----
async function loadSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "site"));
    if (!settingsDoc.exists()) {
      console.log("ℹ️ لا توجد إعدادات في Firebase، سيتم استخدام البيانات الافتراضية.");
      return;
    }

    const data = settingsDoc.data();

    // 1. اسم المكتب في التذييل
    const footerName = document.getElementById("footer-office-name");
    if (footerName && data.officeName) {
      footerName.textContent = data.officeName;
    }

    // 2. البريد الإلكتروني
    if (data.email) {
      const emailElements = document.querySelectorAll("#contact-email, #footer-email");
      emailElements.forEach((el) => {
        if (el.tagName === "A") {
          el.href = `mailto:${data.email}`;
        }
        el.textContent = data.email;
      });
    }

    // 3. الهاتف
    if (data.phone) {
      const phoneElements = document.querySelectorAll("#contact-phone, #footer-phone");
      phoneElements.forEach((el) => {
        if (el.tagName === "A") {
          el.href = `tel:${data.phone}`;
        }
        el.textContent = data.phone;
      });
    }

    // 4. واتساب
    if (data.whatsapp) {
      const cleanNumber = data.whatsapp.replace(/\D/g, "");
      const whatsappElements = document.querySelectorAll("#contact-whatsapp, #footer-whatsapp");
      whatsappElements.forEach((el) => {
        if (el.tagName === "A") {
          el.href = `https://wa.me/${cleanNumber}`;
        }
        el.textContent = data.whatsapp;
      });
    }

    // 5. العنوان
    const addressEl = document.getElementById("contact-address");
    if (addressEl && data.address) {
      addressEl.textContent = data.address;
    }

    // 6. سنوات الخبرة وعدد القضايا
    const expYears = document.getElementById("experience-years");
    if (expYears && data.experienceYears) {
      expYears.textContent = data.experienceYears;
    }

    const casesCount = document.getElementById("cases-count");
    if (casesCount && data.casesCount) {
      casesCount.textContent = data.casesCount;
    }

    console.log("✅ تم تحميل إعدادات الموقع من Firebase.");
  } catch (error) {
    console.error("❌ حدث خطأ أثناء تحميل الإعدادات:", error);
  }
}


// ----- 5.2 Services (الخدمات) -----
async function loadServices() {
  const container = document.getElementById("services-container");
  if (!container) return;

  try {
    const q = query(
      collection(db, "services"),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);

    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <p>لا توجد خدمات قانونية منشورة حالياً.</p>
        </div>
      `;
      return;
    }

    const services = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      services.push({
        title: data.title || "خدمة قانونية",
        description: data.description || "خدمة قانونية متخصصة لحماية حقوقك.",
        icon: data.icon || null,
      });
    });

    services.forEach((service, index) => {
      const card = document.createElement("article");
      card.className = "card service-card";

      // رقم الخدمة
      const numberSpan = document.createElement("span");
      numberSpan.className = "service-number";
      numberSpan.textContent = String(index + 1).padStart(2, "0");
      card.appendChild(numberSpan);

      // الأيقونة
      const iconDiv = document.createElement("div");
      iconDiv.className = "service-icon";
      if (service.icon) {
        iconDiv.innerHTML = service.icon; // SVG آمن لأننا نتحكم في المصدر
      } else {
        iconDiv.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        `;
      }
      card.appendChild(iconDiv);

      // العنوان
      const titleElem = document.createElement("h3");
      titleElem.className = "card-title";
      titleElem.textContent = service.title;
      card.appendChild(titleElem);

      // الوصف
      const descElem = document.createElement("p");
      descElem.className = "card-text";
      descElem.textContent = service.description;
      card.appendChild(descElem);

      // رابط "اقرأ المزيد"
      const linkElem = document.createElement("a");
      linkElem.className = "card-link";
      linkElem.href = "services.html";
      linkElem.textContent = "اقرأ المزيد ←";
      card.appendChild(linkElem);

      container.appendChild(card);
    });

    console.log(`✅ تم تحميل ${services.length} خدمة من Firebase.`);
  } catch (error) {
    console.error("❌ خطأ في تحميل الخدمات:", error);
    container.innerHTML = `
      <div class="empty-state">
        <p>حدث خطأ أثناء تحميل الخدمات. يرجى المحاولة لاحقاً.</p>
      </div>
    `;
  }
}


// ----- 5.3 Lawyers (المحامين) -----
async function loadLawyers() {
  const container = document.getElementById("lawyers-container");
  if (!container) return;

  try {
    const q = query(
      collection(db, "lawyers"),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);

    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <p>لا يوجد محامون منشورون حالياً.</p>
        </div>
      `;
      return;
    }

    const lawyers = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      lawyers.push({
        name: data.name || "محامي",
        role: data.role || "",
        bio: data.bio || "",
        image: data.image || "",
      });
    });

    lawyers.forEach((lawyer) => {
      const card = document.createElement("article");
      card.className = "lawyer-card";

      // الصورة
      const img = document.createElement("img");
      if (lawyer.image && lawyer.image.trim() !== "") {
        img.src = lawyer.image;
        img.alt = `صورة ${lawyer.name}`;
        img.loading = "lazy";
        img.onerror = function () {
          this.style.display = "none";
        };
      } else {
        img.style.display = "none";
      }
      card.appendChild(img);

      // المعلومات
      const infoDiv = document.createElement("div");
      infoDiv.className = "lawyer-info";

      const nameElem = document.createElement("h3");
      nameElem.textContent = lawyer.name;
      infoDiv.appendChild(nameElem);

      if (lawyer.role && lawyer.role.trim() !== "") {
        const roleElem = document.createElement("p");
        roleElem.className = "lawyer-role";
        roleElem.textContent = lawyer.role;
        infoDiv.appendChild(roleElem);
      }

      if (lawyer.bio && lawyer.bio.trim() !== "") {
        const bioElem = document.createElement("p");
        bioElem.className = "card-text";
        bioElem.textContent = lawyer.bio;
        infoDiv.appendChild(bioElem);
      }

      card.appendChild(infoDiv);
      container.appendChild(card);
    });

    console.log(`✅ تم تحميل ${lawyers.length} محامي من Firebase.`);
  } catch (error) {
    console.error("❌ خطأ في تحميل المحامين:", error);
    container.innerHTML = `
      <div class="empty-state">
        <p>حدث خطأ أثناء تحميل المحامين. يرجى المحاولة لاحقاً.</p>
      </div>
    `;
  }
}


// ----- 5.4 Articles (المقالات) -----
async function loadArticles() {
  const container = document.getElementById("articles-container");
  if (!container) return;

  try {
    const q = query(
      collection(db, "articles"),
      where("published", "==", true)
    );
    const snapshot = await getDocs(q);

    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <p>لا توجد مقالات منشورة حالياً.</p>
        </div>
      `;
      return;
    }

    const articles = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      articles.push({
        title: data.title || "مقال",
        slug: data.slug || "",
        excerpt: data.excerpt || "",
        image: data.image || "",
        category: data.category || "",
        date: data.date || "",
      });
    });

    articles.forEach((article) => {
      const card = document.createElement("article");
      card.className = "article-card";

      // الصورة (إذا كانت موجودة)
      const imageDiv = document.createElement("div");
      imageDiv.className = "article-image";
      if (article.image && article.image.trim() !== "") {
        imageDiv.style.backgroundImage = `url('${article.image}')`;
      } else {
        // إذا لم توجد صورة، نخفي العنصر أو نعطيه خلفية محايدة بدون 404
        imageDiv.style.display = "none";
      }
      card.appendChild(imageDiv);

      // المحتوى
      const contentDiv = document.createElement("div");
      contentDiv.className = "article-content";

      // الفئة (إذا كانت موجودة)
      if (article.category && article.category.trim() !== "") {
        const categorySpan = document.createElement("span");
        categorySpan.className = "article-category";
        categorySpan.textContent = article.category;
        contentDiv.appendChild(categorySpan);
      }

      // العنوان
      const titleElem = document.createElement("h3");
      titleElem.className = "article-title";
      titleElem.textContent = article.title;
      contentDiv.appendChild(titleElem);

      // الملخص
      const excerptElem = document.createElement("p");
      excerptElem.className = "article-excerpt";
      excerptElem.textContent = article.excerpt;
      contentDiv.appendChild(excerptElem);

      // الميتا (التاريخ والرابط)
      const metaDiv = document.createElement("div");
      metaDiv.className = "article-meta";

      // التاريخ (إذا كان موجوداً)
      if (article.date && article.date.trim() !== "") {
        const dateSpan = document.createElement("span");
        dateSpan.className = "article-date";
        dateSpan.textContent = article.date;
        metaDiv.appendChild(dateSpan);
      }

      // رابط "اقرأ المزيد"
      const linkElem = document.createElement("a");
      linkElem.className = "card-link";
      if (article.slug) {
        linkElem.href = `article.html?slug=${encodeURIComponent(article.slug)}`;
      } else {
        linkElem.href = "#";
      }
      linkElem.textContent = "اقرأ المزيد ←";
      metaDiv.appendChild(linkElem);

      contentDiv.appendChild(metaDiv);
      card.appendChild(contentDiv);
      container.appendChild(card);
    });

    console.log(`✅ تم تحميل ${articles.length} مقال من Firebase.`);
  } catch (error) {
    console.error("❌ خطأ في تحميل المقالات:", error);
    container.innerHTML = `
      <div class="empty-state">
        <p>حدث خطأ أثناء تحميل المقالات. يرجى المحاولة لاحقاً.</p>
      </div>
    `;
  }
}


// ============================================
// 6. Form Handling (نموذج الاتصال)
// ============================================

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("contact-name")?.value.trim() || "";
    const phone = document.getElementById("contact-phone-input")?.value.trim() || "";
    const message = document.getElementById("contact-message")?.value.trim() || "";

    if (!name || !phone || !message) {
      showToast("يرجى ملء جميع الحقول المطلوبة.", "error");
      return;
    }

    try {
      await addDoc(collection(db, "messages"), {
        name,
        phone,
        message,
        status: "new",
        createdAt: serverTimestamp(),
      });

      showToast("تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.", "success");
      form.reset();
    } catch (error) {
      console.error("❌ خطأ في إرسال الرسالة:", error);
      showToast("حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة لاحقاً.", "error");
    }
  });
}


// ============================================
// 7. Website Initialization
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  // تهيئة الوظائف الأساسية
  initActiveNavigation();
  initNavbarScroll();
  addRevealClasses();

  // تحميل البيانات من Firebase
  loadSettings();
  loadServices();
  loadLawyers();
  loadArticles();

  // تهيئة النماذج
  initContactForm();
});