// ============================================
// analytics.js - دوال مساعدة لتسجيل أحداث Analytics
// ============================================

import { analytics } from './firebase.js';
import { logEvent } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js';

/**
 * تسجيل حدث عام
 * @param {string} eventName - اسم الحدث
 * @param {Object} eventParams - بيانات إضافية للحدث (المسموح بها فقط)
 */
function trackEvent(eventName, eventParams = {}) {
  try {
    logEvent(analytics, eventName, eventParams);
  } catch (error) {
    console.error('Analytics event error:', error);
  }
}

/**
 * تسجيل النقر على زر واتساب
 * @param {string} location - مكان الزر (مثل: navbar, hero, footer)
 */
export function trackWhatsAppClick(location) {
  trackEvent('whatsapp_click', { location });
}

/**
 * تسجيل النقر على رقم الهاتف
 * @param {string} location - مكان الرابط (مثل: navbar, contact)
 */
export function trackPhoneClick(location) {
  trackEvent('phone_click', { location });
}

/**
 * تسجيل النقر على البريد الإلكتروني
 * @param {string} location - مكان الرابط (مثل: navbar, contact)
 */
export function trackEmailClick(location) {
  trackEvent('email_click', { location });
}

/**
 * تسجيل إرسال نموذج الاتصال
 * @param {string} formType - نوع النموذج (مثل: contact_form, consultation_form)
 */
export function trackContactSubmit(formType) {
  trackEvent('contact_submit', { form_type: formType });
}

/**
 * تسجيل إرسال طلب استشارة
 * @param {string} formType - نوع النموذج (مثل: consultation_form)
 */
export function trackConsultationSubmit(formType) {
  trackEvent('consultation_submit', { form_type: formType });
}

/**
 * تسجيل مشاهدة خدمة
 * @param {string} serviceId - معرف الخدمة
 */
export function trackServiceView(serviceId) {
  trackEvent('service_view', { service_id: serviceId });
}

/**
 * تسجيل مشاهدة مقال
 * @param {string} articleId - معرف المقال
 */
export function trackArticleView(articleId) {
  trackEvent('article_view', { article_id: articleId });
}

/**
 * تسجيل النقر على زر CTA عام
 * @param {string} ctaType - نوع CTA (مثل: contact, consultation, whatsapp)
 * @param {string} location - مكان الزر (مثل: navbar, hero, footer)
 */
export function trackCTAClick(ctaType, location) {
  trackEvent('cta_click', {
    cta_type: ctaType,
    location: location
  });
}