import mongoose from "mongoose";

const workerAttendanceSchema = new mongoose.Schema({
  agent_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  employer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  requirement_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Requirement",
    required: true,
  },
  number_of_worker: {
    type: Number,
    required: true,
    min: 1,
  },
  sent_by_agent: {
    type: Boolean,
    default: false,
  },
  received_by_employer: {
    type: Boolean,
    default: false,
  },
  send_date_time: {
    type: Date,
    default: null,
  },
  received_date_time: {
    type: Date,
    default: null,
  },
  employer_accepted: {
    type: Boolean,
    default: false,
  },
  per_worker_rates: {
    type: Number,
    required: true,
  },
  agent_name: {
    type: String,
    required: true,
  },
  employer_name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: "Pending",
  },
  work_location: {
    type: String,
    // required: true,
  },
  ERN_number: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Auto-set dates before save
workerAttendanceSchema.pre("save", function (next) {
  const now = new Date();

  if (this.isModified("sent_by_agent") && this.sent_by_agent && !this.send_date_time) {
    this.send_date_time = now;
  }

  if (this.isModified("employer_accepted") && this.employer_accepted && !this.received_date_time) {
    this.received_date_time = now;
  }

  next();
});

export const WorkerAttendance = mongoose.model("WorkerAttendance", workerAttendanceSchema);
