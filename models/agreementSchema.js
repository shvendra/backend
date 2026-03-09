import mongoose from "mongoose";

const agreementSchema = new mongoose.Schema(
  {
    ern: { type: String, required: true },
    employer: {
      name: String,
      company: String,
      address: String,
      aadhaar: String,
      gst: String,
      photoUrl: String,
      phone: String,
    },
    work: {
      title: String,
      description: String,
      numberOfWorkers: String,
      location: String,
      duration: String,
      dutyHours: String,
      weeklyOff: String,
      overtime: String,
      wages: String,
      paymentCycle: String,
      paymentMode: String,
      advance: String,
      stay: String,
      food: String,
      transport: String,
      safetyGears: String,
      experienceLevel: String,
      licenseRequired: String,
      uniform: String,
      reportingPerson: String,
      attendance: String,
    },
    terms: [String], // ✅ store dynamic terms selected by admin
    signatureUrl: String,
    signedAt: Date,
  },
  { timestamps: true }
);

export const Agreement = mongoose.model("Agreement", agreementSchema);
