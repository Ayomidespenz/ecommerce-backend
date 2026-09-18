import { Router } from 'express';
import { getApiHealth } from '../controllers/healthController';
import CatalogController from '../controllers/catalogController';
import CartController from '../controllers/cartController';
import AddressController from '../controllers/addressController';
import PaymentMethodController from '../controllers/paymentMethodController';
import CheckoutController from '../controllers/checkoutController';
import PaymentController from '../controllers/paymentController';
import OrderController from '../controllers/orderController';
import ProfileController from '../controllers/profileController';
import NotificationController from '../controllers/notificationController';
import FeedbackController from '../controllers/feedbackController';
import PersonalizationController from '../controllers/personalizationController';
import SupportController from '../controllers/supportController';
import ReferralController from '../controllers/referralController';
import ContentController from '../controllers/contentController';
import SellerListingController from '../controllers/sellerListingController';
import SellerOperationsController from '../controllers/sellerOperationsController';
import MessagingController from '../controllers/messagingController';
import AdminOperationsController from '../controllers/adminOperationsController';
import { authenticate, optionalAuthenticate, requireBuyer, requireRole } from '../middleware/auth';
import { requireSeller, requireAdmin } from '../middleware/auth';
import { sellerResourceParamSchema, listingPromotionParamSchema, sellerTransactionQuerySchema, sellerWithdrawalQuerySchema, createBankAccountSchema, updateBankAccountSchema, withdrawalQuoteSchema, createWithdrawalSchema, createPromotionSchema, verificationDocumentSchema, submitVerificationSchema, sellerSettingsSchema } from '../validation/sellerOperationsSchemas';
import { conversationParamSchema, conversationMessageParamSchema, messageParamSchema, conversationListQuerySchema, messageListQuerySchema, createConversationSchema, updateConversationSchema, createMessageSchema, updateMessageSchema, conversationReadSchema } from '../validation/messagingSchemas';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { adminResourceParamSchema, adminListingReviewSchema, adminVerificationUpdateSchema, adminOrderUpdateSchema, adminRefundUpdateSchema, adminSupportTicketUpdateSchema, adminPayoutQuerySchema } from '../validation/adminSchemas';
import { singleImage } from '../middleware/upload';
import {
  catalogQuerySchema,
  createReviewSchema,
  productIdSchema,
  reviewQuerySchema,
  searchSuggestionSchema,
} from '../validation/catalogSchemas';
import {
  personalCollectionQuerySchema,
  productParamSchema,
  productReferenceSchema,
} from '../validation/personalizationSchemas';
import {
  addCartItemSchema,
  cartItemParamSchema,
  updateCartItemSchema,
} from '../validation/cartSchemas';
import {
  addressParamSchema,
  createAddressSchema,
  createPaymentMethodSchema,
  paymentMethodParamSchema,
  updateAddressSchema,
  updatePaymentMethodSchema,
} from '../validation/accountDataSchemas';
import {
  cancelOrderSchema,
  checkoutQuoteSchema,
  createOrderSchema,
  orderListQuerySchema,
  orderParamSchema,
  paymentInitializeSchema,
  paymentReferenceParamSchema,
  promoCodeValidationSchema,
  refundOrderSchema,
  returnOrderSchema,
  sellerOrderListQuerySchema,
  sellerOrderStatusSchema,
} from '../validation/orderSchemas';
import {
  appFeedbackSchema,
  notificationIdSchema,
  notificationQuerySchema,
  preferencesSchema,
  profilePhotoSchema,
  profileSchema,
} from '../validation/profileSchemas';
import {
  createSupportTicketSchema,
  faqQuerySchema,
  referralApplySchema,
  referralQuerySchema,
  supportTicketMessageSchema,
  supportTicketParamSchema,
  supportTicketQuerySchema,
} from '../validation/supportSchemas';
import {
  createSellerListingSchema,
  listingAnalyticsQuerySchema,
  listingImageSchema,
  sellerDashboardQuerySchema,
  sellerListingImageParamSchema,
  sellerListingParamSchema,
  sellerListingQuerySchema,
  updateSellerListingSchema,
  uploadMetadataSchema,
} from '../validation/sellerSchemas';

const router = Router();

router.get('/health', getApiHealth);

router.get('/categories', CatalogController.categories);

router.get('/me/favorites', authenticate, validateQuery(personalCollectionQuerySchema), PersonalizationController.listFavorites);
router.post('/me/favorites', authenticate, validateBody(productReferenceSchema), PersonalizationController.addFavorite);
router.delete('/me/favorites', authenticate, PersonalizationController.clearFavorites);
router.delete('/me/favorites/:productId', authenticate, validateParams(productParamSchema), PersonalizationController.removeFavorite);

router.get('/me/recently-viewed', authenticate, validateQuery(personalCollectionQuerySchema), PersonalizationController.listRecentlyViewed);
router.post('/me/recently-viewed', authenticate, validateBody(productReferenceSchema), PersonalizationController.addRecentlyViewed);
router.delete('/me/recently-viewed', authenticate, PersonalizationController.clearRecentlyViewed);
router.delete('/me/recently-viewed/:productId', authenticate, validateParams(productParamSchema), PersonalizationController.removeRecentlyViewed);

router.get('/cart', authenticate, requireBuyer, CartController.getCart);
router.post('/cart/items', authenticate, requireBuyer, validateBody(addCartItemSchema), CartController.addItem);
router.patch('/cart/items/:itemId', authenticate, requireBuyer, validateParams(cartItemParamSchema), validateBody(updateCartItemSchema), CartController.updateItem);
router.delete('/cart/items/:itemId', authenticate, requireBuyer, validateParams(cartItemParamSchema), CartController.removeItem);
router.delete('/cart', authenticate, requireBuyer, CartController.clearCart);

router.get('/addresses', authenticate, AddressController.list);
router.post('/addresses', authenticate, validateBody(createAddressSchema), AddressController.create);
router.post('/addresses/:id/default', authenticate, validateParams(addressParamSchema), AddressController.setDefault);
router.get('/addresses/:id', authenticate, validateParams(addressParamSchema), AddressController.get);
router.patch('/addresses/:id', authenticate, validateParams(addressParamSchema), validateBody(updateAddressSchema), AddressController.update);
router.delete('/addresses/:id', authenticate, validateParams(addressParamSchema), AddressController.remove);

router.get('/payment-methods', authenticate, PaymentMethodController.list);
router.post('/payment-methods', authenticate, validateBody(createPaymentMethodSchema), PaymentMethodController.create);
router.post('/payment-methods/:id/default', authenticate, validateParams(paymentMethodParamSchema), PaymentMethodController.setDefault);
router.get('/payment-methods/:id', authenticate, validateParams(paymentMethodParamSchema), PaymentMethodController.get);
router.patch('/payment-methods/:id', authenticate, validateParams(paymentMethodParamSchema), validateBody(updatePaymentMethodSchema), PaymentMethodController.update);
router.delete('/payment-methods/:id', authenticate, validateParams(paymentMethodParamSchema), PaymentMethodController.remove);

router.get('/me/profile', authenticate, ProfileController.get);
router.patch('/me/profile', authenticate, validateBody(profileSchema), ProfileController.update);
router.post('/me/profile/photo', authenticate, validateBody(profilePhotoSchema), ProfileController.photo);
router.get('/me/preferences', authenticate, ProfileController.getPreferences);
router.patch('/me/preferences', authenticate, validateBody(preferencesSchema), ProfileController.updatePreferences);

router.get('/notifications', authenticate, validateQuery(notificationQuerySchema), NotificationController.list);
router.get('/notifications/unread-count', authenticate, NotificationController.unreadCount);
router.patch('/notifications/:id/read', authenticate, validateParams(notificationIdSchema), NotificationController.markRead);
router.post('/notifications/read-all', authenticate, NotificationController.readAll);
router.delete('/notifications/:id', authenticate, validateParams(notificationIdSchema), NotificationController.remove);

router.post('/app-feedback', authenticate, validateBody(appFeedbackSchema), FeedbackController.create);

router.get('/faqs', validateQuery(faqQuerySchema), ContentController.faqs);
router.get('/content/privacy-policy', (req, res, next) => { (req.params as Record<string, string>).slug = "privacy-policy"; return ContentController.get(req, res, next); });
router.get('/content/terms', (req, res, next) => { (req.params as Record<string, string>).slug = "terms"; return ContentController.get(req, res, next); });
router.get('/content/contact-information', (req, res, next) => { (req.params as Record<string, string>).slug = "contact-information"; return ContentController.get(req, res, next); });

router.post('/support/tickets', authenticate, validateBody(createSupportTicketSchema), SupportController.create);
router.get('/support/tickets', authenticate, validateQuery(supportTicketQuerySchema), SupportController.list);
router.get('/support/tickets/:id', authenticate, validateParams(supportTicketParamSchema), SupportController.get);
router.post('/support/tickets/:id/messages', authenticate, validateParams(supportTicketParamSchema), validateBody(supportTicketMessageSchema), SupportController.addMessage);

router.get('/referrals/summary', authenticate, ReferralController.summary);
router.get('/referrals', authenticate, validateQuery(referralQuerySchema), ReferralController.list);
router.post('/referrals/apply', authenticate, validateBody(referralApplySchema), ReferralController.apply);

// Admin operations are internal-only and require an authenticated admin role.
router.get('/admin/listings/:id/review', authenticate, requireAdmin, validateParams(adminResourceParamSchema), AdminOperationsController.getListingReview);
router.patch('/admin/listings/:id/review', authenticate, requireAdmin, validateParams(adminResourceParamSchema), validateBody(adminListingReviewSchema), AdminOperationsController.updateListingReview);
router.get('/admin/verifications/:id', authenticate, requireAdmin, validateParams(adminResourceParamSchema), AdminOperationsController.getVerification);
router.patch('/admin/verifications/:id', authenticate, requireAdmin, validateParams(adminResourceParamSchema), validateBody(adminVerificationUpdateSchema), AdminOperationsController.updateVerification);
router.get('/admin/orders/:id', authenticate, requireAdmin, validateParams(adminResourceParamSchema), AdminOperationsController.getOrder);
router.patch('/admin/orders/:id', authenticate, requireAdmin, validateParams(adminResourceParamSchema), validateBody(adminOrderUpdateSchema), AdminOperationsController.updateOrder);
router.get('/admin/refunds/:id', authenticate, requireAdmin, validateParams(adminResourceParamSchema), AdminOperationsController.getRefund);
router.patch('/admin/refunds/:id', authenticate, requireAdmin, validateParams(adminResourceParamSchema), validateBody(adminRefundUpdateSchema), AdminOperationsController.updateRefund);
router.get('/admin/support/tickets/:id', authenticate, requireAdmin, validateParams(adminResourceParamSchema), AdminOperationsController.getSupportTicket);
router.patch('/admin/support/tickets/:id', authenticate, requireAdmin, validateParams(adminResourceParamSchema), validateBody(adminSupportTicketUpdateSchema), AdminOperationsController.updateSupportTicket);
router.get('/admin/payouts', authenticate, requireAdmin, validateQuery(adminPayoutQuerySchema), AdminOperationsController.payouts);

router.get('/seller/wallet', authenticate, requireSeller, SellerOperationsController.wallet);
router.get('/seller/transactions', authenticate, requireSeller, validateQuery(sellerTransactionQuerySchema), SellerOperationsController.transactions);
router.get('/seller/transactions/:id', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.transaction);
router.get('/seller/transactions/:id/receipt', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.transactionReceipt);
router.get('/seller/bank-accounts', authenticate, requireSeller, SellerOperationsController.listBankAccounts);
router.post('/seller/bank-accounts', authenticate, requireSeller, validateBody(createBankAccountSchema), SellerOperationsController.createBankAccount);
router.get('/seller/bank-accounts/:id', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.getBankAccount);
router.patch('/seller/bank-accounts/:id', authenticate, requireSeller, validateParams(sellerResourceParamSchema), validateBody(updateBankAccountSchema), SellerOperationsController.updateBankAccount);
router.delete('/seller/bank-accounts/:id', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.deleteBankAccount);
router.post('/seller/bank-accounts/:id/default', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.defaultBankAccount);
router.post('/seller/bank-accounts/:id/verify', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.verifyBankAccount);
router.post('/seller/withdrawals/quote', authenticate, requireSeller, validateBody(withdrawalQuoteSchema), SellerOperationsController.withdrawalQuote);
router.post('/seller/withdrawals', authenticate, requireSeller, validateBody(createWithdrawalSchema), SellerOperationsController.createWithdrawal);
router.get('/seller/withdrawals', authenticate, requireSeller, validateQuery(sellerWithdrawalQuerySchema), SellerOperationsController.withdrawals);
router.get('/seller/withdrawals/:id', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.withdrawal);
router.get('/seller/withdrawals/:id/receipt', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.withdrawalReceipt);
router.get('/seller/promotion-plans', authenticate, requireSeller, SellerOperationsController.promotionPlans);
router.post('/seller/listings/:listingId/promotions', authenticate, requireSeller, validateParams(listingPromotionParamSchema), validateBody(createPromotionSchema), SellerOperationsController.createListingPromotion);
router.get('/seller/listings/:listingId/promotions', authenticate, requireSeller, validateParams(listingPromotionParamSchema), SellerOperationsController.listingPromotions);
router.post('/seller/promotions/:id/cancel', authenticate, requireSeller, validateParams(sellerResourceParamSchema), SellerOperationsController.cancelPromotion);
router.get('/seller/verification', authenticate, requireSeller, SellerOperationsController.verification);
router.post('/seller/verification/documents', authenticate, requireSeller, validateBody(verificationDocumentSchema), SellerOperationsController.addVerificationDocument);
router.post('/seller/verification/submit', authenticate, requireSeller, validateBody(submitVerificationSchema), SellerOperationsController.submitVerification);
router.get('/seller/settings', authenticate, requireSeller, SellerOperationsController.settings);
router.patch('/seller/settings', authenticate, requireSeller, validateBody(sellerSettingsSchema), SellerOperationsController.updateSettings);

router.post('/conversations', authenticate, requireRole('buyer', 'seller'), validateBody(createConversationSchema), MessagingController.createConversation);
router.get('/conversations', authenticate, requireRole('buyer', 'seller'), validateQuery(conversationListQuerySchema), MessagingController.listConversations);
router.get('/conversations/:id', authenticate, requireRole('buyer', 'seller'), validateParams(conversationParamSchema), MessagingController.getConversation);
router.patch('/conversations/:id', authenticate, requireRole('buyer', 'seller'), validateParams(conversationParamSchema), validateBody(updateConversationSchema), MessagingController.updateConversation);
router.delete('/conversations/:id', authenticate, requireRole('buyer', 'seller'), validateParams(conversationParamSchema), MessagingController.deleteConversation);
router.get('/conversations/:id/messages', authenticate, requireRole('buyer', 'seller'), validateParams(conversationParamSchema), validateQuery(messageListQuerySchema), MessagingController.listMessages);
router.get('/conversations/:id/messages/:messageId', authenticate, requireRole('buyer', 'seller'), validateParams(conversationMessageParamSchema), MessagingController.getMessage);
router.post('/conversations/:id/messages', authenticate, requireRole('buyer', 'seller'), validateParams(conversationParamSchema), validateBody(createMessageSchema), MessagingController.sendMessage);
router.patch('/conversations/:id/messages/:messageId', authenticate, requireRole('buyer', 'seller'), validateParams(conversationMessageParamSchema), validateBody(updateMessageSchema), MessagingController.updateMessage);
router.post('/conversations/:id/read', authenticate, requireRole('buyer', 'seller'), validateParams(conversationParamSchema), validateBody(conversationReadSchema), MessagingController.markRead);
router.delete('/messages/:messageId', authenticate, requireRole('buyer', 'seller'), validateParams(messageParamSchema), MessagingController.deleteMessage);

router.get('/seller/orders', authenticate, requireSeller, validateQuery(sellerOrderListQuerySchema), OrderController.sellerList);
router.get('/seller/orders/:id', authenticate, requireSeller, validateParams(orderParamSchema), OrderController.sellerGet);
router.patch('/seller/orders/:id/status', authenticate, requireSeller, validateParams(orderParamSchema), validateBody(sellerOrderStatusSchema), OrderController.sellerUpdateStatus);
router.post('/seller/orders/:id/cancel', authenticate, requireSeller, validateParams(orderParamSchema), validateBody(cancelOrderSchema), OrderController.sellerCancel);
router.get('/seller/orders/:id/timeline', authenticate, requireSeller, validateParams(orderParamSchema), OrderController.sellerTimeline);

router.get('/seller/dashboard', authenticate, requireSeller, validateQuery(sellerDashboardQuerySchema), SellerListingController.dashboard);
router.get('/seller/listings', authenticate, requireSeller, validateQuery(sellerListingQuerySchema), SellerListingController.list);
router.post('/seller/listings', authenticate, requireSeller, validateBody(createSellerListingSchema), SellerListingController.create);
router.get('/seller/listings/:id/analytics', authenticate, requireSeller, validateParams(sellerListingParamSchema), validateQuery(listingAnalyticsQuerySchema), SellerListingController.analytics);
router.post('/seller/listings/:id/publish', authenticate, requireSeller, validateParams(sellerListingParamSchema), SellerListingController.publish);
router.post('/seller/listings/:id/pause', authenticate, requireSeller, validateParams(sellerListingParamSchema), SellerListingController.pause);
router.post('/seller/listings/:id/mark-sold', authenticate, requireSeller, validateParams(sellerListingParamSchema), SellerListingController.markSold);
router.post('/seller/listings/:id/images', authenticate, requireSeller, validateParams(sellerListingParamSchema), singleImage('file'), validateBody(listingImageSchema), SellerListingController.addImage);
router.delete('/seller/listings/:id/images/:imageId', authenticate, requireSeller, validateParams(sellerListingImageParamSchema), SellerListingController.removeImage);
router.get('/seller/listings/:id', authenticate, requireSeller, validateParams(sellerListingParamSchema), SellerListingController.get);
router.patch('/seller/listings/:id', authenticate, requireSeller, validateParams(sellerListingParamSchema), validateBody(updateSellerListingSchema), SellerListingController.update);
router.delete('/seller/listings/:id', authenticate, requireSeller, validateParams(sellerListingParamSchema), SellerListingController.remove);
router.post('/uploads', authenticate, requireSeller, singleImage('file'), validateBody(uploadMetadataSchema), SellerListingController.upload);

router.post('/checkout/quote', authenticate, requireBuyer, validateBody(checkoutQuoteSchema), CheckoutController.quote);
router.post('/promo-codes/validate', authenticate, requireBuyer, validateBody(promoCodeValidationSchema), CheckoutController.validatePromo);

router.post('/payments/webhook', PaymentController.webhook);
router.post('/payments/initialize', authenticate, requireBuyer, validateBody(paymentInitializeSchema), PaymentController.initialize);
router.get('/payments/:reference', authenticate, requireBuyer, validateParams(paymentReferenceParamSchema), PaymentController.get);

router.post('/orders', authenticate, requireBuyer, validateBody(createOrderSchema), OrderController.create);
router.get('/orders', authenticate, requireBuyer, validateQuery(orderListQuerySchema), OrderController.list);
router.get('/orders/:id/tracking', authenticate, requireBuyer, validateParams(orderParamSchema), OrderController.tracking);
router.post('/orders/:id/cancel', authenticate, requireBuyer, validateParams(orderParamSchema), validateBody(cancelOrderSchema), OrderController.cancel);
router.post('/orders/:id/reorder', authenticate, requireBuyer, validateParams(orderParamSchema), OrderController.reorder);
router.post('/orders/:id/return', authenticate, requireBuyer, validateParams(orderParamSchema), validateBody(returnOrderSchema), OrderController.returnOrder);
router.post('/orders/:id/refund', authenticate, requireBuyer, validateParams(orderParamSchema), validateBody(refundOrderSchema), OrderController.refund);
router.get('/orders/:id/receipt', authenticate, requireBuyer, validateParams(orderParamSchema), OrderController.receipt);
router.get('/orders/:id', authenticate, requireBuyer, validateParams(orderParamSchema), OrderController.get);

// Static product paths must be registered before /products/:id.
router.get('/products/featured', validateQuery(catalogQuerySchema), CatalogController.collection('featured'));
router.get('/products/flash-sales', validateQuery(catalogQuerySchema), CatalogController.collection('flash_sales'));
router.get('/products/best-selling', validateQuery(catalogQuerySchema), CatalogController.collection('best_selling'));
router.get('/products/exclusive-offers', validateQuery(catalogQuerySchema), CatalogController.collection('exclusive_offers'));
router.get('/products/recommended', validateQuery(catalogQuerySchema), CatalogController.collection('recommended'));
router.get('/products/search-suggestions', validateQuery(searchSuggestionSchema), CatalogController.searchSuggestions);

router.get('/products', validateQuery(catalogQuerySchema), CatalogController.products);
router.get('/products/:id/reviews', validateParams(productIdSchema), validateQuery(reviewQuerySchema), CatalogController.reviews);
router.post(
  '/products/:id/reviews',
  validateParams(productIdSchema),
  authenticate,
  requireBuyer,
  validateBody(createReviewSchema),
  CatalogController.createReview
);
router.post('/products/:id/views', validateParams(productIdSchema), optionalAuthenticate, CatalogController.recordView);
router.get('/products/:id', validateParams(productIdSchema), CatalogController.product);

export default router;
