import mongoose from "mongoose";
import validator from "validator";
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your Name!"],
      minLength: [3, "Name must contain at least 3 Characters!"],
      maxLength: [100, "Name cannot exceed 100 Characters!"],
    },
    email: {
      type: String,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      required: [true, "Please select a role"],
      enum: ["Agent", "Worker", "Employer", "Admin", "SelfWorker"],
    },
    address: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male"
    },
     workExperience: {
      type: mongoose.Schema.Types.Mixed,
      default: 0,
     },
      fixedSalary: {
      type: mongoose.Schema.Types.Mixed,
      default: 0,
      },
      salaryFrom: {
        type: mongoose.Schema.Types.Mixed,
        default: 0,
      },
      salaryTo: {
        type: mongoose.Schema.Types.Mixed,
        default: 0,
      },
    employerType: {
      type: {},
      enum: ["Individual", "Contractor", "Industry", "Agency"],
      default: {},
    },
    addresses: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      default: "Unverified",
      enum: ["Unverified", "Verified", "Block"],
    },
    sourcetype: {
      type: String,
      default: "Online",
      enum: ["Online", "Offline", "Referral"],
    },
    followupstatus: {
      type: String,
      default: "Unverified",
    },
    transactionId: {
      type: String,
    },
    veryfiedBage: {
      type: Boolean,
      default: false,
    },
    lastsubscriptionDate: {
      type: Date,
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    remainingContacts: {
    type: Number,
    default: 50,
  },
  remainingPosts: {
    type: Number,
    default: 1,
  },
  subscriptionTpype: {
    type: String,
    enum: ["Monthly", "Half-Yearly", "Yearly"],
  },
  subscriptionExpery: {
    type: Date,
  },
    kyc: {
      aadharFront: {
        type: String,
      },
      aadharBack: {
        type: String,
      },
      aadharNumber: {
        type: String,
      },
      gstNumber: {
        type: String,
      },
    },
    firmDetails: {
      firmName: {
        type: String,
      },
      firmAddress: {
        type: String,
      },
    },
    profilePhoto: {
      type: String,
    },
    areasOfWork: {
      type: [String],
    },
    dob: {
      type: Number,
    },
    phone: {
      type: String,
      required: [true, "Please provide the mobile number."],
    },
    alternate: {
      type: String,
    },
    bankDetails: {
      ifscCode: {
        type: String,
      },
      accountNumber: {
        type: String,
      },
      bankName: {
        type: String,
      },
    },
    pinCode: {
      type: String,
    },
    postedBy: {
      type: String,
    },
    referredBy: {
      type: String,
    },
    serviceArea: {
      type: [String],
    },
    categories: {
      type: [String],
    },
    bmwId: {
      type: String,
    },
    state: {
      type: String,
    },
    district: {
      type: String,
    },
    block: {
      type: String,
    },
    profile: {
      type: String,
    },
  },
  { timestamps: true }
);
userSchema.index({ phone: 1, role: 1 }, { unique: true });
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export const User = mongoose.model("User", userSchema);
