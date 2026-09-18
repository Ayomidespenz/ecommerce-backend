import { Request, Response } from "express";
import SellerFinanceService from "../services/SellerFinanceService";
import SellerPromotionService from "../services/SellerPromotionService";
import SellerVerificationService from "../services/SellerVerificationService";
import { asyncHandler } from "../utils/apiErrors";

class SellerOperationsController {
  wallet = asyncHandler(async (req: Request, res: Response) => {
    res.json({ wallet: await SellerFinanceService.wallet(req.user!.id) });
  });

  transactions = asyncHandler(async (req: Request, res: Response) => {
    res.json(await SellerFinanceService.transactions(req.user!.id, req.query as any));
  });

  transaction = asyncHandler(async (req: Request, res: Response) => {
    res.json({ transaction: await SellerFinanceService.transaction(req.user!.id, req.params.id) });
  });

  transactionReceipt = asyncHandler(async (req: Request, res: Response) => {
    res.json(await SellerFinanceService.transactionReceipt(req.user!.id, req.params.id));
  });

  listBankAccounts = asyncHandler(async (req: Request, res: Response) => {
    res.json(await SellerFinanceService.listBankAccounts(req.user!.id));
  });

  createBankAccount = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ bank_account: await SellerFinanceService.createBankAccount(req.user!.id, req.body) });
  });

  getBankAccount = asyncHandler(async (req: Request, res: Response) => {
    res.json({ bank_account: await SellerFinanceService.getBankAccount(req.user!.id, req.params.id) });
  });

  updateBankAccount = asyncHandler(async (req: Request, res: Response) => {
    res.json({ bank_account: await SellerFinanceService.updateBankAccount(req.user!.id, req.params.id, req.body) });
  });

  deleteBankAccount = asyncHandler(async (req: Request, res: Response) => {
    res.json(await SellerFinanceService.deleteBankAccount(req.user!.id, req.params.id));
  });

  defaultBankAccount = asyncHandler(async (req: Request, res: Response) => {
    res.json({ bank_account: await SellerFinanceService.setDefaultBankAccount(req.user!.id, req.params.id) });
  });

  verifyBankAccount = asyncHandler(async (req: Request, res: Response) => {
    res.json({ bank_account: await SellerFinanceService.verifyBankAccount(req.user!.id, req.params.id) });
  });

  withdrawalQuote = asyncHandler(async (req: Request, res: Response) => {
    res.json(await SellerFinanceService.withdrawalQuote(req.user!.id, req.body.amount, req.body.bank_account_id));
  });

  createWithdrawal = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ withdrawal: await SellerFinanceService.createWithdrawal(req.user!.id, req.body) });
  });

  withdrawals = asyncHandler(async (req: Request, res: Response) => {
    res.json(await SellerFinanceService.withdrawals(req.user!.id, req.query as any));
  });

  withdrawal = asyncHandler(async (req: Request, res: Response) => {
    res.json({ withdrawal: await SellerFinanceService.withdrawal(req.user!.id, req.params.id) });
  });

  withdrawalReceipt = asyncHandler(async (req: Request, res: Response) => {
    res.json(await SellerFinanceService.withdrawalReceipt(req.user!.id, req.params.id));
  });

  promotionPlans = asyncHandler(async (_req: Request, res: Response) => {
    res.json(await SellerPromotionService.plans());
  });

  listingPromotions = asyncHandler(async (req: Request, res: Response) => {
    res.json(await SellerPromotionService.list(req.user!.id, req.params.listingId));
  });

  createListingPromotion = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({
      promotion: await SellerPromotionService.create(req.user!.id, req.params.listingId, req.body.plan_id),
    });
  });

  cancelPromotion = asyncHandler(async (req: Request, res: Response) => {
    res.json({ promotion: await SellerPromotionService.cancel(req.user!.id, req.params.id) });
  });

  verification = asyncHandler(async (req: Request, res: Response) => {
    res.json({ verification: await SellerVerificationService.getVerification(req.user!.id) });
  });

  addVerificationDocument = asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({
      verification: await SellerVerificationService.addDocument(req.user!.id, req.body),
    });
  });

  submitVerification = asyncHandler(async (req: Request, res: Response) => {
    res.json({ verification: await SellerVerificationService.submit(req.user!.id, req.body) });
  });

  settings = asyncHandler(async (req: Request, res: Response) => {
    res.json({ settings: await SellerVerificationService.settings(req.user!.id) });
  });

  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    res.json({ settings: await SellerVerificationService.updateSettings(req.user!.id, req.body) });
  });
}

export default new SellerOperationsController();
