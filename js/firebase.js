// ============================================
// firebase.js - تهيئة Firebase وتهيئة الخدمات
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js';

// ضع إعدادات Firebase الخاصة بك هنا
// استبدل القيم التالية بالقيم الحقيقية من مشروعك في Firebase Console
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA-n697Wx0EJVOWWk8IIwqWJsuCcqFfCnU",
  authDomain: "law-firm-website-4471f.firebaseapp.com",
  projectId: "law-firm-website-4471f",
  storageBucket: "law-firm-website-4471f.firebasestorage.app",
  messagingSenderId: "333674590546",
  appId: "1:333674590546:web:e832acdb1478f718c70a8b",
  measurementId: "G-ZC6T7M6Q53"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تهيئة الخدمات
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// تصدير الخدمات لاستخدامها في باقي الملفات
export { app, db, auth, analytics };

