const FAQS = [
  { id: "faq-orders-1", category: "orders", question: "How do I track my order?", answer: "Open Orders in the app and select an order to view its current status and tracking timeline." },
  { id: "faq-orders-2", category: "orders", question: "Can I cancel an order?", answer: "Cancellation is available while the order is still eligible. Open the order and choose Cancel order." },
  { id: "faq-payments-1", category: "payments", question: "Which payment methods are supported?", answer: "FortuneMart supports the payment methods made available by the configured payment provider at checkout." },
  { id: "faq-delivery-1", category: "delivery", question: "When will my order arrive?", answer: "The estimated delivery date is shown in the order details and may vary by seller and destination." },
  { id: "faq-account-1", category: "account", question: "How do I reset my password?", answer: "Use Forgot password on the sign-in screen and follow the verification instructions." },
];

const CONTENT: Record<string, Record<string, string>> = {
  "privacy-policy": { title: "Privacy Policy", body: "FortuneMart collects and uses account, order, payment, device, and support information to provide marketplace services, secure accounts, process transactions, and improve the app. Contact support for privacy requests." },
  terms: { title: "Terms and Conditions", body: "By using FortuneMart, buyers and sellers agree to provide accurate information, follow applicable laws, and use the marketplace responsibly. Orders, returns, refunds, and account actions are subject to applicable marketplace policies." },
  "contact-information": { title: "Contact Information", body: "For help with an order, payment, account, or seller issue, open a support ticket in the FortuneMart app." },
};

class ContentService {
  faqs(category?: string) { const faqs = category ? FAQS.filter((faq) => faq.category === category.toLowerCase()) : FAQS; return { faqs, categories: [...new Set(FAQS.map((faq) => faq.category))] }; }
  get(slug: string) { const content = CONTENT[slug]; return content ? { slug, ...content, updated_at: "2026-09-18T00:00:00.000Z" } : null; }
}

export default new ContentService();
