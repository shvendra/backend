// File: backend/models/requirementSchema.js
import mongoose from "mongoose";

// Function to generate a unique 6-digit ERN_NUMBER
async function generateUniqueERN() {
  let isUnique = false;
  let newERN;

  while (!isUnique) {
    newERN = Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit number
    // Assuming 'Requirement' model is accessible here, which it is as it's defined below
    const existingERN = await Requirement.findOne({ ERN_NUMBER: newERN });
    if (!existingERN) isUnique = true;
  }

  return newERN;
}

// Define Schema
const requirementSchema = new mongoose.Schema(
  {
    workType: { type: String, required: true }, // ✅ Required
    workerQuantitySkilled: { type: Number, required: true }, // ✅ Required
    workLocation: { type: String }, // ✅ Required (Text description)
    // --- Added Latitude and Longitude fields ---
    latitude: { type: Number },
    longitude: { type: Number },
    // --- End Added fields ---
    workerNeedDate: {
      type: Date,
      default: Date.now,
    },
    state: { type: String, required: true }, // ✅ Required
    district: { type: String, required: true }, // ✅ Required
    tehsil: { type: String },
    ageGroup: { type: String },
    ernStatus: { type: String, default: "Open" }, // New field for ERN status
    budgetPerWorker: { type: Number },
    minBudgetPerWorker: { type: Number },
    maxBudgetPerWorker: { type: Number },
    inTime: { type: String }, // Consider using Date type for time if possible
    outTime: { type: String }, // Consider using Date type for time if possible
    remarks: { type: String },
    selectedCategories: { type: [String], default: [] }, // Check if this is still needed/used
    subCategory: { type: String },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employerName: { type: String, required: true },
    employerPhone: { type: String, required: true },
    assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, default: "Pending" },
    accommodationAvailable: { type: Boolean, default: false },
    foodAvailable: { type: Boolean, default: false },
    incentive: { type: Boolean, default: false },
    bonus: { type: Boolean, default: false },
    transportProvided: { type: Boolean, default: false },
    weeklyOff: { type: Boolean, default: false },
    overtimeAvailable: { type: Boolean, default: false },
    intrestedAgents: [
      {
        agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        agentRequiredWage: { type: Number },
      },
    ],
    isAgentAccepted: { type: String, default: "No", required: false },
    assignedAgentName: { type: String },
    assignedAgentPhone: { type: String },
    finalAgentRequiredWage: { type: Number },
    ERN_NUMBER: { type: Number, unique: true },
    req_type: { type: String, required: true },
    estimated_days: { type: String },
  },
  { timestamps: true }
);

// Middleware to ensure unique ERN_NUMBER before saving
requirementSchema.pre("save", async function (next) {
  // Check if ERN_NUMBER is already set (e.g., during updates)
  if (this.isNew && !this.ERN_NUMBER) {
    // Only generate for new documents if not already set
    this.ERN_NUMBER = await generateUniqueERN();
  }
  // Ensure workerNeedDate is stored as date only (midnight UTC)
  if (this.workerNeedDate && this.isModified("workerNeedDate")) {
    // Only process if date is provided and modified
    const dateOnly = new Date(this.workerNeedDate);
    dateOnly.setUTCHours(0, 0, 0, 0); // Reset time to midnight UTC
    this.workerNeedDate = dateOnly;
  }
  next();
});

// Define the model so it's available for the pre-save hook
export const Requirement = mongoose.model("Requirement", requirementSchema);
