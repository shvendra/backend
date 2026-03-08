import express from "express";
import {verifyTopupTransaction, addTopupTransaction, getTransactionsByRequirementId, updateTransactionDetailsByCreditTxnId, getAgentsPayoutList, getStatus, addTransaction, addWithdrawal, getTransactionsByERN, getTransactionsByAgent, getTransactionsByEmployer } from "../controllers/paymentController.js";
import { isAuthenticated,  } from "../middlewares/auth.js";
import { authorizeAdminOrSuperAdmin } from "../utils/authorizeAdminOrSuperAdmin.js"; // Assuming you have these middlewares

const router = express.Router();

router.post("/add-trans", isAuthenticated, addTransaction);
router.post("/add-topup-trans", addTopupTransaction);
router.post("/verify-topup-trans", verifyTopupTransaction);
router.get("/get-payment-requid", isAuthenticated, getTransactionsByRequirementId);
router.get('/transactions/by-requirement/:requirementId', isAuthenticated, getTransactionsByRequirementId);

router.get(
  '/status/:merchantOrderId/:paymenttype',
  getStatus
);
router.post("/add-withdrawal", isAuthenticated, addWithdrawal);  // For adding a withdrawal (debit)
router.get("/transactions/by-ern/:ernNumber", isAuthenticated, getTransactionsByERN);  // Get transactions by ERN
router.get("/transactions/by-agent/:agentId", isAuthenticated, getTransactionsByAgent);  // Get transactions by agent ID
router.get("/transactions/by-employer/:employerId", isAuthenticated, getTransactionsByEmployer);  // Get transactions by employer ID
router.get("/agents-payout-list",isAuthenticated, authorizeAdminOrSuperAdmin, getAgentsPayoutList);  // Get agents payout list
router.put("/approve-payout/:id", isAuthenticated, updateTransactionDetailsByCreditTxnId);  // Get agents payout list

export default router;
