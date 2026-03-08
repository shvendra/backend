import { Payment } from "../models/paymentSchema.js";
import { Requirement } from "../models/requirementSchema.js";
import { createPhonePePayment, status } from "../controllers/payment.js";
import axios from "axios";
import uniqid from "uniqid";
import { randomUUID } from 'crypto';


export async function addTransaction(req, res) {
  try {
    const data = req.body;
    const merchantOrderId = `TXN_${randomUUID()}`;
    // Validate required fields
    if (data.paymentType !== "subscription" && data.paymentType !== "verifiedbadge") {
      if (!data.requirementId || !data.employerId || !data.agentId || !data.amount || !data.paymentType) {
        throw new Error("Missing required fields");
      }
    }

    if (data.paymentType !== "credit" && data.paymentType !== "subscription" && data.paymentType !== "verifiedbadge") {
      throw new Error('Payment type must be "credit" for employer transactions.');
    }

    // Create PhonePe payment using SDK
    const paymentData = await createPhonePePayment(req.body, merchantOrderId, data.paymentType);

    const totalAmount = parseFloat(data.amount);
    let platformCharges = 0, gstCharges = 0, incentiveCharges = 0;

    if (data.paymentType !== "subscription" && data.paymentType !== "verifiedbadge") {
      const platformChargeRate = parseFloat(process.env.PLATFORM_CHARGES || "0.0945");
      const gstRate = 0.18;
      const multiplier = 1 + platformChargeRate * (1 + gstRate);
      const payableAmount = totalAmount / multiplier;

      platformCharges = payableAmount * platformChargeRate;
      gstCharges = platformCharges * gstRate;
      incentiveCharges = +(platformCharges * 0.5).toFixed(3);
    }

    // Save transaction in DB
    const payment = new Payment({
      requirementId: data?.requirementId || null,
      employerId: data.employerId,
      employerName: data.firstName || "",
      agentId: data?.agentId || null,
      agentName: data.agentName || "",
      ernStatus: data?.ernStatus,
      paymentType: data.paymentType,
      creditTransactionId: merchantOrderId,
      creditStatus: "pending",
      creditPaymentMethod: "online",
      amount: totalAmount - (parseFloat(platformCharges.toFixed(2)) + parseFloat(gstCharges.toFixed(2))),
      platformCharges: parseFloat(platformCharges.toFixed(2)),
      gstCharges: parseFloat(gstCharges.toFixed(2)),
      incentiveCharges: incentiveCharges,
    });

    await payment.save();

    return res.status(201).json({ url: paymentData.redirectUrl, merchantOrderId });
  } catch (error) {
    console.error("❌ addTransaction Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
}

export async function addWithdrawal(req, res) {
  try {
    const data = req.body;

    // Required field validation
    if (!data.agentId || !data.amount || !data.paymentType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Ensure correct payment type
    if (data.paymentType !== "debit") {
      return res
        .status(400)
        .json({ error: 'Payment type must be "debit" for agent withdrawal.' });
    }

    // Create payment object
    const payment = new Payment({
      requirementId: data.requirementId,
      employerId: data.employerId,
      employerName: data.employerName,
      agentId: data.agentId,
      agentName: data.agentName,
      paymentType: "debit",
      amount: data.amount,
      withdrawalTransactionId: data.withdrawalTransactionId,
      withdrawalStatus: data.withdrawalStatus || "pending",
      withdrawalDateTime: new Date(),
      withdrawalBackAcc: data.withdrawalBackAcc,
      withdrawalIfscCode: data?.withdrawalIfscCode,
      withdrawalUpiNumber: data?.withdrawalUpiNumber || "NO",
      withdrawalPaymentMode: data.withdrawalPaymentMode || "bank_transfer",
      platformCharges: data.platformCharges || 0,
      gstCharges: data.gstCharges || 0,
      incentiveCharges: data.incentiveCharges || 0,
    });

    // console.log("Saving withdrawal payment:", payment);

    await payment.save();

    return res
      .status(200)
      .json({ message: "Withdrawal added successfully", payment });
  } catch (error) {
    console.error("Error in addWithdrawal:", error.message, error);
    return res.status(500).json({ error: "Server error: " + error.message });
  }
}

export async function getTransactionsByERN(req, res) {
  try {
    const { ernNumber } = req.params;

    // Fetch transactions with matching ERN_NUMBER
    const transactions = await Payment.find({
      requirementId: ernNumber,
    }).populate("employerId agentId");

    if (!transactions || transactions.length === 0) {
      return res
        .status(404)
        .json({ message: "No transactions found for this ERN number." });
    }

    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
export async function getTransactionsByAgent(req, res) {
  try {
    const { agentId } = req.params;

    if (!agentId) {
      return res.status(400).json({ message: "Missing agentId parameter" });
    }

    // Fetch all transactions (credit + debit)
    const transactions = await Payment.find({ agentId }).sort({
      createdAt: -1,
    });

    // Filter for totals
    const totalCredit = transactions
      .filter(
        (txn) =>
          txn.paymentType === "credit" && txn.creditStatus === "COMPLETED"
      )
      .reduce((sum, txn) => sum + (txn.amount || 0), 0);

  const totalDebit = transactions
  .filter(
    (txn) => txn.paymentType === "debit" && txn.paymentStatus !== "REJECTED"
  )
  .reduce((sum, txn) => sum + (txn.amount || 0), 0);


    const availableAmount = totalCredit - totalDebit;

    const incentiveCreditAmount = transactions
      .filter(
        (txn) =>
          txn.paymentType === "credit" && txn.creditStatus === "COMPLETED"
      )
      .reduce((sum, txn) => sum + (txn.incentiveCharges || 0), 0);

    const incentiveDebitAmount = transactions
      .filter((txn) => txn.paymentType === "debit")
      .reduce((sum, txn) => sum + (txn.incentiveCharges || 0), 0);

    // Net Incentive = Total Credited Incentive - Debited Incentive
    const incentiveAmount = incentiveCreditAmount - incentiveDebitAmount;
    // Filter only debit transactions for history
const debitTransactions = transactions.filter(
  (txn) => txn.paymentType === "debit" && txn.paymentStatus !== "REJECTED"
);


    return res.status(200).json({
      agentId,
      totalCredit,
      totalDebit,
      incentiveDebitAmount,
      availableAmount,
      incentiveAmount,
      debitTransactions,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
export async function getTransactionsByEmployer(req, res) {
  try {
    const { employerId } = req.params;

    // Fetch all transactions associated with a specific employerId (both credit and debit)
const transactions = await Payment.find({
  employerId,
  creditStatus: "COMPLETED",
  paymentType: { $ne: "subscription" },
}).sort({ createdAt: -1 });

    if (!transactions || transactions.length === 0) {
      return res
        .status(404)
        .json({ message: "No transactions found for this employer." });
    }

    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export const updateTransactionStatusById = async (
  creditTransactionId,
  status
) => {
  if (!creditTransactionId || !status) throw new Error("Missing parameters");

  const updatedPayment = await Payment.findOneAndUpdate(
    { creditTransactionId },
    { $set: { creditStatus: status } },
    { new: true }
  );

  if (!updatedPayment) throw new Error("Payment not found");

  return updatedPayment;
};

export async function getStatus(req, res) {
  try {
    await status(req, res); // ✅ this already sends the response (redirect or JSON)
  } catch (error) {
    console.error("getStatus error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

export async function getAgentsPayoutList(req, res) {
  try {
    let { paymentType, paymentStatus, withdrawalStatus, creditStatus, page, limit } = req.query;

    // ✅ Default pagination values
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ Build filter object dynamically
    const filter = {};
    if (paymentType) filter.paymentType = paymentType;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (creditStatus) filter.creditStatus = creditStatus;

    if (withdrawalStatus) filter.withdrawalStatus = withdrawalStatus; // 🔄 FIXED (was using paymentStatus)

    // ✅ Get total count for pagination
    const totalCount = await Payment.countDocuments(filter);

    // ✅ Fetch paginated results
    const transactions = await Payment.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // newest first (optional)

    // ✅ Handle empty case
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: "No matching agent payouts found." });
    }

    // ✅ Return paginated response
    return res.status(200).json({
      transactions,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


export const updateTransactionDetailsByCreditTxnId = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log(req.params);
    const {
      amount,
      incentiveCharges,
      payoutComment,
      paymentStatus,
      paymentType,
      creditTransactionId,
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Missing id" });
    }

    const updateFields = {};
    if (amount !== undefined) updateFields.amount = amount;
    if (paymentType !== undefined) updateFields.paymentType = paymentType;
    if (paymentStatus !== undefined) updateFields.paymentStatus = paymentStatus;
    if (paymentStatus !== undefined)
      updateFields.withdrawalStatus = paymentStatus;
    if (paymentStatus !== undefined) updateFields.creditStatus = paymentStatus;
    if (creditTransactionId !== undefined)
      updateFields.creditTransactionId = creditTransactionId;
    if (incentiveCharges !== undefined)
      updateFields.incentiveCharges = incentiveCharges;
    if (payoutComment !== undefined) updateFields.payoutComment = payoutComment;

    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedPayment) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    res.status(200).json({ success: true, updatedPayment });
  } catch (error) {
    console.error("❌ Error updating transaction:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update transaction" });
  }
};

export async function getTransactionsByRequirementId(req, res) {
  try {
    const { requirementId } = req.params;

    if (!requirementId) {
      return res.status(400).json({ error: "Missing requirementId parameter." });
    }

    // Fetch matching transactions
    const transactions = await Payment.find({
      requirementId,
      creditStatus: "COMPLETED",
      paymentType: { $ne: "subscription" },
    });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: "No transactions found for this requirement." });
    }

    // Calculate total amount
    const totalAmount = transactions.reduce(
      (sum, txn) => sum + (Number(txn.amount) || 0),
      0
    );

    return res.status(200).json({ totalAmount });
  } catch (error) {
    console.error("Error fetching transactions by requirementId:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

