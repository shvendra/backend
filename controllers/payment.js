import axios from "axios";
import { getToken } from "./auth.js";
import { Payment } from "../models/paymentSchema.js";
import { updateTransactionStatusById } from "./paymentController.js";
import { updateRequirementStatus } from "./requirementController.js";
import { updateEmployerPaymentStatus, updateEmployerPaymentVerifiedBadgeStatus } from "./userController.js";


import sendInvoiceEmail from "./sendInvoice.js";
const ENV = process.env.PAYMENT_ENV || "dev";
const BACKEND_URL =
  ENV === "dev" ? process.env.L_BACKEND_URL : process.env.BACKEND_URL;
  const FRONTEND_URL =
  ENV === "dev" ? process.env.L_FRONTEND_URL : process.env.FRONTEND_URL;

import { StandardCheckoutClient, Env, MetaInfo, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';

const env = ENV === "prod" ? Env.PRODUCTION : Env.SANDBOX;

const clientId =
  ENV === "prod"
    ? process.env.PROD_CLIENT_ID
    : process.env.SANDBOX_CLIENT_ID;

const clientSecret =
  ENV === "prod"
    ? process.env.PROD_CLIENT_SECRET
    : process.env.SANDBOX_CLIENT_SECRET;

const clientVersion =
  ENV === "prod"
    ? process.env.PROD_CLIENT_VERSION
    : process.env.SANDBOX_CLIENT_VERSION;

const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);

export const createPhonePePayment = async (data, merchantOrderId, paymentType) => {
  const { firstName, lastName = "", email = "", employer_phone, amount, productName = "Worker Payment" } = data;

  if (!firstName || !employer_phone || !amount) {
    throw new Error("Missing required parameters.");
  }
console.log(data);
  const fullName = `${firstName} ${lastName}`.trim();

  // Build meta info
const metaInfo = MetaInfo.builder()
  .udf1(fullName)
  .udf2(email || "")
  .udf3(employer_phone)
  .udf4(productName)
  .udf5(JSON.stringify({
    planId: data.planId,
    employerType: data.employerType,
  }))
  .build();


  // Build payment request
  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId(merchantOrderId)
    .amount(Math.round(amount * 100)) // in paise
    .redirectUrl(`${BACKEND_URL}/api/v1/payment/status/${merchantOrderId}/${paymentType}`)
    .metaInfo(metaInfo)
    .build();

  try {
    const response = await client.pay(request);
    const redirectUrl = response.redirectUrl;

    if (!redirectUrl) {
      console.error("❌ No redirect URL received:", response);
      throw new Error("Payment initiation failed: No redirect URL.");
    }

    return { merchantOrderId, redirectUrl };
  } catch (err) {
    console.error("❌ PhonePe SDK Payment Error:", err);
    throw new Error("Payment initiation failed.");
  }
};


export const callback = async (req, res) => {
  const data = req.body;

  try {
    if (!data.event || !data.payload) {
      return res.status(400).send({
        message: "Invalid data format. 'event' and 'payload' are required.",
      });
    }

    // Example: Extract relevant data from payload
    const { merchantOrderId, transactionId, state, amount } = data.payload;

    if (!merchantOrderId) {
      return res
        .status(400)
        .send({ message: "Missing merchantOrderId in payload." });
    }

    // Update payment status in your DB according to state
    if (state === "COMPLETED") {
      await updateTransactionStatusById(merchantOrderId, "COMPLETED");
      // You can also update other related data, send email, etc.
      // e.g. update employer payment status, send invoice email, etc.
    } else if (state === "FAILED") {
      await updateTransactionStatusById(merchantOrderId, "FAILED");
    } else if (state === "PENDING") {
      await updateTransactionStatusById(merchantOrderId, "PENDING");
    }

    // Save callback info if needed (logging, audit)
    // await CallbackResponse.create({ event: data.event, payload: data.payload });

    // Return success response to PhonePe
    res.status(200).send({ message: "Callback data processed successfully." });
  } catch (error) {
    console.error("Error processing callback:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

export const status = async (req, res) => {
  try {
    const { merchantOrderId, paymenttype } = req.params;

    if (!merchantOrderId) {
      return res.status(400).json({ error: "Missing merchantOrderId parameter." });
    }

    console.log("Params:", req.params);

    const ENV = process.env.PAYMENT_ENV || "dev";
console.log("Payment ENV:", ENV);
const STATUS_BASE_URL =
  ENV === "prod"
    ? "https://api.phonepe.com/apis/pg/checkout/v2"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2";

    const URL = `${STATUS_BASE_URL}/order/${merchantOrderId}/status`;

    const token = getToken();
    if (!token) {
      return res.status(500).json({ error: "OAuth token not available." });
    }

    console.log("Checking status from PhonePe:", URL);

    const response = await axios.get(URL, {
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${token}`, // ✅ FIXED
      },
    });

const meta = JSON.parse(response.data?.metaInfo?.udf5 || "{}");

    const { state, amount } = response.data;
    const lowerState = (state || "").toLowerCase();

    // ✅ DB updates based on state
    if (state === "COMPLETED") {
     // Always update transaction first (common logic)
  const txn = await updateTransactionStatusById(merchantOrderId, "Done");
if (paymenttype === "subscription") {
  console.log("Processing subscription payment for txn:", txn);
  const userDetail = await updateEmployerPaymentStatus(txn?.employerId, meta?.employerType || "", meta?.planId || "");

  if (userDetail) {
    try {
      await sendInvoiceEmail(userDetail, txn);
      console.log("Invoice email sent successfully");
    } catch (err) {
      console.error("Email sending failed:", err);
    }
  }

} else if (paymenttype === "verifiedbadge") {
  console.log("Processing verified badge payment for txn:", txn);
  // ✅ Only update verified badge status (no invoice)
  await updateEmployerPaymentVerifiedBadgeStatus(txn?.employerId);

} else {
  // Existing requirement/payment flow
        const txns = await updateTransactionStatusById(merchantOrderId, "COMPLETED");
  if (txns?.requirementId && txns?.ernStatus) {
    await updateRequirementStatus(txns.requirementId, txns.ernStatus);
  }
}
    }

    if (state === "FAILED" && paymenttype !== "subscription") {
      await updateTransactionStatusById(merchantOrderId, "FAILED");
    }

    // ✅ Redirect once for all states
    if (["COMPLETED", "FAILED", "PENDING"].includes(state)) {
      return res.redirect(
        `${FRONTEND_URL}/payment/callback?merchantOrderId=${merchantOrderId}&status=${lowerState}&amount=${amount / 100}`
      );
    }

    return res.status(500).json({ message: "Unexpected payment state." });
  } catch (error) {
    console.error("Status Error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Failed to fetch payment status." });
  }
};

