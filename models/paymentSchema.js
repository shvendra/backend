import mongoose from "mongoose";
import { type } from "os";

// Define the Payment Schema
const paymentSchema = new mongoose.Schema(
  {
    // The requirement for which this payment is made
    requirementId: { type: mongoose.Schema.Types.ObjectId, ref: "Requirement" },

    // Employer and Agent Details
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    employerName: { type: String },
    ernNumber: { type: String },
    gstNumber: { type: String },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    agentName: { type: String },
    ernStatus: { type: String},
    // Payment details
    paymentType: { type: String, enum: ["credit", "debit", "subscription", "verifiedbadge"] },
    amount: { type: Number, required: true },
    paymentDateTime: { type: Date, default: Date.now }, // Date and time of payment/withdrawal

    // Credit (by Employer) transaction details
    creditTransactionId: {
      type: String,
      required: function () {
        return this.paymentType === "credit";
      },
    }, // Transaction ID for credit
    creditStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    creditPaymentMethod: {
      type: String,
      enum: ["bank_transfer", "upi", "other", "online"],
      required: function () {
        return this.paymentType === "credit";
      },
    }, // Debit (by Agent) transaction details
    withdrawalTransactionId: { type: String }, // Transaction ID for withdrawal
    withdrawalStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    withdrawalDateTime: { type: Date }, // No longer required
    withdrawalBackAcc: { type: String }, // No longer required
    withdrawalIfscCode: { type: String }, // No longer required
    withdrawalUpiNumber: { type: String }, // No longer required
    payoutComment: { type: String }, // No longer required
    withdrawalPaymentMode: {
      type: String,
      enum: ["bank_transfer", "upi", "other", "cash"],
      required: function () {
        return this.paymentType === "debit";
      },
    }, // Mode of payment for agent withdrawal

    // Platform Charges and GST (for all payments)
    platformCharges: { type: Number, default: 0 }, // Platform charges applied to the transaction
    incentiveCharges: { type: Number, default: 0 }, // Incentive charges applied to the transaction
    gstCharges: { type: Number, default: 0 }, // GST charges applied to the transaction

    // Status for the overall payment
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    // Employer credit only allowed, Agent withdrawal only allowed
    isEmployerCredit: {
      type: Boolean,
      default: function () {
        return (
          this.paymentType === "credit" || this.paymentType === "subscription"
        );
      },
    },
    isAgentWithdrawal: {
      type: Boolean,
      default: function () {
        return this.paymentType === "debit";
      },
    },
  },
  { timestamps: true }
);

// Middleware to ensure valid payment conditions (Employer can only credit and Agent can only withdraw)
paymentSchema.pre("save", function (next) {
  if (this.paymentType === "credit" && this.isAgentWithdrawal) {
    next(new Error("Only employers can make credit payments."));
  }
  if (this.paymentType === "debit" && this.isEmployerCredit) {
    next(new Error("Only agents can make withdrawal transactions."));
  }
  next();
});

// Export the model
export const Payment = mongoose.model("Payment", paymentSchema);
