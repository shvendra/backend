import path from "path";
import fs from "fs";
import { Agreement } from "../models/agreementSchema.js";
import { Requirement } from "../models/requirementSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";

// 1️⃣ Get workstream by ERN
export const getWorkstreamByERN = catchAsyncErrors(async (req, res) => {
  const { ern } = req.params;
  if (!ern) return res.status(400).json({ message: "ERN is required" });

  const workstream = await Requirement.findOne({ ERN_NUMBER: ern })
    .populate("employerId", "name company address phone")
    .lean();

  if (!workstream) {
    return res.status(404).json({ message: "Workstream not found for given ERN" });
  }

  res.status(200).json({
    success: true,
    employer: workstream.employerId
      ? {
          name: workstream.employerId.name,
          company: workstream.employerId.company || "",
          address: workstream.employerId.address || "",
          phone: workstream.employerId.phone || workstream.employerPhone,
        }
      : {
          name: workstream.employerName,
          phone: workstream.employerPhone,
        },
    work: {
      title: workstream.workType,
      description: workstream.remarks,
      startDate: workstream.workerNeedDate,
      endDate: workstream.outTime || null,
      payoutProcess: workstream.budgetPerWorker || null,
      payoutDuration: workstream.estimated_days || null,
      subCategory: workstream.subCategory || "",
      state: workstream.state,
      district: workstream.district,
      tehsil: workstream.tehsil || "",
      minBudget: workstream.minBudgetPerWorker || null,
      maxBudget: workstream.maxBudgetPerWorker || null,
      assignedAgent: workstream.assignedAgentName || null,
      status: workstream.status || "Pending",
      ERN_NUMBER: workstream.ERN_NUMBER,
    },
  });
});

// 2️⃣ Create agreement (Admin generates link; signature not required)
export const createAgreement = catchAsyncErrors(async (req, res) => {
 const { ern, employer, work, terms } = req.body;
  if (!ern || !employer || !work) {
    return res.status(400).json({ message: "ERN, employer, and work details are required" });
  }

  // const agreement = await Agreement.create({ ern, employer, work });
  const agreement = await Agreement.create({ ern, employer, work, terms });
  // const BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";
const ENV = process.env.NODE_ENV; // "development" | "production"

const BASE_URL =
  ENV === "development"
    ? process.env.L_BACKEND_URL || "http://localhost:5000"
    : process.env.BACKEND_URL;

  
  const signedLink = `${BASE_URL}/agreements/${agreement._id}/sign`; // link for employer

  res.status(201).json({
    success: true,
    message: "Agreement created successfully",
    agreement,
    signedLink,
  });
});

// 3️⃣ Fetch agreement by ID (for employer view)
export const getAgreementById = async (req, res) => {
  try {
    const agreement = await Agreement.findById(req.params.id).lean();
    if (!agreement) return res.status(404).json({ success: false, message: "Agreement not found" });

    res.status(200).json({
      success: true,
      agreement: {
        ern: agreement.ern,
        employer: agreement.employer,
        work: agreement.work,
        terms: agreement.terms,
        signedAt: agreement.signedAt || null,
        signatureUrl: agreement.signatureUrl || null,
      },
    });
  } catch (err) {
    console.error("Error fetching agreement:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// 4️⃣ Employer submits signature
export const signAgreement = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { signature } = req.body; // base64 image

  if (!signature) return res.status(400).json({ message: "Signature is required" });

  const agreement = await Agreement.findById(id);
  if (!agreement) return res.status(404).json({ message: "Agreement not found" });

  // Save signature as PNG
  const signatureDir = path.join("uploads", "signatures");
  if (!fs.existsSync(signatureDir)) fs.mkdirSync(signatureDir, { recursive: true });

  const signaturePath = path.join(signatureDir, `${agreement._id}.png`);
  const base64Data = signature.replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync(signaturePath, base64Data, "base64");

  agreement.signatureUrl = `/${signaturePath.replace(/\\/g, "/")}`;
  agreement.signedAt = new Date();
  await agreement.save();

  res.status(200).json({ success: true, message: "Agreement signed successfully" });
});
