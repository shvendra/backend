import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../middlewares/error.js";
import { Requirement } from "../models/requirementSchema.js";
import { getAgents } from "../controllers/userController.js";
import mongoose from "mongoose";
import { buildSearchQuery } from "../utils/buildSearchQuery.js";
import { buildStatusQuery } from "../utils/buildStatusQuery.js";
import { buildDistrictFilter } from "../utils/buildDistrictFilter.js";
import { getPagination } from "../utils/getPagination.js";
// Insert Requirement (Only Employer Can Create)
import {
  notifyAgents,
  sendWhatsappMessageAgent,
} from "../utils/notifyAgents.js";

export const insertRequirement = catchAsyncErrors(async (req, res, next) => {
  const { role, _id, name, phone } = req.user;

  if (role !== "Employer") {
    return next(
      new ErrorHandler("Only Employers can create requirements.", 403)
    );
  }

  const requiredFields = [
    "workType",
    "workerQuantitySkilled",
    "state",
    "district",
  ];
  for (let field of requiredFields) {
    if (!req.body[field]) {
      return next(new ErrorHandler(`Missing required field: ${field}`, 400));
    }
  }

  const requirementData = {
    ...req.body,
    employerId: _id,
    employerName: name,
    employerPhone: phone,
  };

  const requirement = await Requirement.create(requirementData);

  notifyAgents({
    state: requirement.state,
    district: requirement.district,
    workType: requirement.workType,
  });
  const io = req.app.get("io");
  io.emit("new-requirement", {
    _id: requirement._id,
    district: requirement.district,
    employerId: requirement.employerId,
    state: requirement.state,
  });

  res.status(201).json({
    success: true,
    message: "Requirement posted successfully!",
    requirement,
  });
});

export const getFilteredRequirements = catchAsyncErrors(async (req, res, next) => {
  const { role, _id, district: userDistrict, serviceArea = [] } = req.user || {};
  const query = {};

  // if (role === "Employer") {
  //   query.employerId = _id;
  // }
  // 🔍 SEARCH (ERN, employer, district, site, workType)
if (req.query.search) {
 const searchValue = req.query.search.trim();
  const searchRegex = new RegExp(searchValue, "i");

  query.$or = [
    !isNaN(Number(searchValue)) ? { ERN_NUMBER: Number(searchValue) } : null,
    { employerName: searchRegex },
    { district: searchRegex },
    { workLocation: searchRegex },
    { workType: searchRegex },
  ].filter(Boolean); // remove nulls
}

// statusMode = active | inactive
if (req.query.statusMode === "active") {
  query.status = { $in: ["assigned", "Approved"] };
}

if (req.query.statusMode === "inactive") {
  query.status = { $nin: ["assigned", "Approved", "Closed", "Expired"] };
}

  // Employer filter
  if (req.query.employerId) {
    query.employerId = req.query.employerId;
  } else {
    // ⛔ Exclude Office_Staff only when employerId not provided
    if (role === "Employer") {
      query.req_type = { $ne: "Office_Staff" };
    }
  }

  // ✅ District filtering logic
  let districtFilter = [];

  if (req.queryPolluted?.district) {
    districtFilter = Array.isArray(req.queryPolluted?.district)
      ? req.queryPolluted?.district
      : [req.queryPolluted?.district];
  } else if (req.query.district) {
    districtFilter = Array.isArray(req.query.district)
      ? req.query.district
      : [req.query.district];
  }
  if (districtFilter.length === 0 && (role === "Agent" || role === "SelfWorker")) {
    const districtSet = new Set();
    if (userDistrict) districtSet.add(userDistrict);
    if (Array.isArray(serviceArea)) {
      serviceArea.forEach((d) => {
        if (typeof d === "string") districtSet.add(d);
      });
    }
    districtFilter = Array.from(districtSet);
  }

  if (districtFilter.length > 0) {
    // Filter out invalid or empty strings
    const safeDistricts = districtFilter
      .filter((d) => typeof d === "string" && d.trim().length > 0)
      .map((d) => new RegExp(d.trim(), "i"));

    // if (safeDistricts.length > 0) {
    //   query.district = { $in: safeDistricts };
    // }
  }


  if (req.query.ERN_NUMBER) query.ERN_NUMBER = req.query.ERN_NUMBER;
  if (req.query.state) query.state = req.query.state;
  if (req.query.workType) query.workType = req.query.workType;

  if (req.query.status) {
    query.status = req.query.status;
  } else {
    query.status = { $nin: ["Closed", "Expired"] };
  }

  // ---------- 🧩 UPDATED PAGINATION LOGIC ----------
  const page = parseInt(req.query.page) || 1;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const skip = limit ? (page - 1) * limit : 0;
  // ------------------------------------------------

  const totalCount = await Requirement.countDocuments(query);

  let requirementsQuery = Requirement.find(query).sort({ createdAt: -1 });
  // ✅ Apply skip/limit only when limit is provided
  if (limit) {
    requirementsQuery = requirementsQuery.skip(skip).limit(limit);
  }
  const requirements = await requirementsQuery;

  res.status(200).json({
    success: true,
    requirements,
    pagination: {
      totalCount,
      currentPage: page,
      totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      limit: limit || "all",
    },
  });
});
export const getFilteredRequirementsAdmin = catchAsyncErrors(async (req, res) => {
  const { role, _id, district, serviceArea = [] } = req.user || {};

  let query = {};

  // 🔍 Search
  Object.assign(query, buildSearchQuery(req.query.search));

  // 📌 Status
  Object.assign(
    query,
    buildStatusQuery(req.query.tab, req.query.status)
  );

  // 🧑 Employer filter
  if (req.query.employerId) {
    query.employerId = req.query.employerId;
  } else if (role === "Employer") {
    query.req_type = { $ne: "Office_Staff" };
  }

  // 📍 District
  Object.assign(
    query,
    buildDistrictFilter({
      req,
      role,
      userDistrict: district,
      serviceArea,
    })
  );

  // 🎯 Other filters
  if (req.query.ERN_NUMBER) query.ERN_NUMBER = req.query.ERN_NUMBER;
  if (req.query.state) query.state = req.query.state;
  if (req.query.workType) query.workType = req.query.workType;

  // 📄 Pagination
  const { page, limit, skip } = getPagination(req.query);

  const totalCount = await Requirement.countDocuments(query);

  let mongoQuery = Requirement.find(query).sort({ createdAt: -1 });

  if (limit) mongoQuery = mongoQuery.skip(skip).limit(limit);

  const requirements = await mongoQuery;

  res.status(200).json({
    success: true,
    requirements,
    pagination: {
      totalCount,
      currentPage: page,
      totalPages: limit ? Math.ceil(totalCount / limit) : 1,
      limit: limit || "all",
    },
  });
});
export const assignAgentToRequirement = catchAsyncErrors(
  async (req, res, next) => {
    const {
      agentId,
      ern,
      assignedAgentName,
      assignedAgentPhone,
      finalAgentRequiredWage,
    } = req.body;

    if (!agentId || !ern) {
      return next(new ErrorHandler("Missing agentId or ern", 400));
    }

    const requirement = await Requirement.findOne({ ERN_NUMBER: ern });
    if (!requirement) {
      return next(
        new ErrorHandler("Requirement not found with given ERN", 404)
      );
    }

    requirement.assignedAgentId = agentId;
    requirement.status = "Assigned";
    requirement.assignedAgentName = assignedAgentName;
    requirement.assignedAgentPhone = assignedAgentPhone;
    requirement.finalAgentRequiredWage = finalAgentRequiredWage;
    //agent
    await requirement.save();

    sendWhatsappMessageAgent(
      assignedAgentName,
      requirement.workType + "" + requirement.subCategory,
      requirement.district +
        "" +
        requirement.tehsil +
        " " +
        requirement.workLocation,
      assignedAgentPhone
    );

    res.status(200).json({
      success: true,
      message: "Agent assigned successfully",
      requirement,
    });
  }
);

export const UnassignOrAcceptAgentToRequirement = catchAsyncErrors(
  async (req, res, next) => {
    const { agentId, ern, isAgentAccepted } = req.body;

    if (!ern) {
      return next(new ErrorHandler("Missing agentId or ern", 400));
    }

    const requirement = await Requirement.findOne({ ERN_NUMBER: ern });
    if (!requirement) {
      return next(
        new ErrorHandler("Requirement not found with given ERN", 404)
      );
    }

    if (requirement.intrestedAgents && requirement.intrestedAgents.length > 0) {
      // Filter out the agent with the matching agentId
      requirement.intrestedAgents = requirement.intrestedAgents.filter(
        (agent) => agent.agentId.toString() !== agentId.toString()
      );
    }
    // If the agent is accepted, update the required fields
    if (isAgentAccepted === "Yes") {
      requirement.assignedAgentId = agentId;
      requirement.isAgentAccepted = "Yes";
      requirement.status = "Assigned";
      //employer
    } else {
      requirement.assignedAgentId = null;
      requirement.assignedAgentName = "";
      requirement.isAgentAccepted = "No";
      requirement.assignedAgentPhone = "";
      requirement.status = "Unassigned";
    }

    await requirement.save(); // Save the changes back to the database

    // await requirement.save();
    res.status(200).json({
      success: true,
      message: isAgentAccepted
        ? "Accepted successfully"
        : "Rrejected successfully",
      requirement,
    });
  }
);

export const updateRequirementStatus = async (id, status) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid requirement ID");
  }

  const updatedRequirement = await Requirement.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!updatedRequirement) {
    throw new Error("Requirement not found");
  }

  return updatedRequirement;
};

export const updateRequirementStatusUpdate = async (req, res) => {
  try {
    const { id, status } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid requirement ID" });
    }

    const updatedRequirement = await Requirement.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedRequirement) {
      return res
        .status(404)
        .json({ success: false, message: "Requirement not found" });
    }

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: updatedRequirement,
    });
  } catch (error) {
    console.error("Error updating requirement:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating status",
      error: error.message,
    });
  }
};

export const updateRequirementType = async (req, res) => {
  try {
    const { id, req_type } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid requirement ID" });
    }

    const updatedRequirement = await Requirement.findByIdAndUpdate(
      id,
      { req_type },
      { new: true }
    );

    if (!updatedRequirement) {
      return res
        .status(404)
        .json({ success: false, message: "Requirement not found" });
    }

    res.status(200).json({
      success: true,
      message: "Requirement type updated successfully",
      data: updatedRequirement,
    });
  } catch (error) {
    console.error("Error updating requirement type:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating requirement type",
      error: error.message,
    });
  }
};

export const updateRequirementRemarks = async (req, res) => {
  try {
    const {
      id,
      remarks,
      status,
      finalAgentRequiredWage,
      minBudgetPerWorker,
      maxBudgetPerWorker,
    } = req.body;

    // ✅ Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid requirement ID",
      });
    }

    // ✅ Fetch existing requirement
    const existing = await Requirement.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Requirement not found",
      });
    }

    // ✅ Base update object (existing behavior preserved)
    const updateData = {};

    if (typeof remarks !== "undefined") {
      updateData.remarks = remarks;
    }

    // ✅ Budget fields (ALL req types)
    if (typeof minBudgetPerWorker !== "undefined") {
      updateData.minBudgetPerWorker = minBudgetPerWorker;
    }

    if (typeof maxBudgetPerWorker !== "undefined") {
      updateData.maxBudgetPerWorker = maxBudgetPerWorker;
    }

    // ✅ Office Staff specific logic (UNCHANGED)
    if (existing.req_type === "Office_Staff") {
      if (typeof status !== "undefined") {
        updateData.status = status;
      }
      if (typeof finalAgentRequiredWage !== "undefined") {
        updateData.finalAgentRequiredWage = finalAgentRequiredWage;
      }
    }

    // ✅ Boolean fields (SAFE + SCALABLE)
    const booleanFields = [
      "accommodationAvailable",
      "foodAvailable",
      "incentive",
      "bonus",
      "transportProvided",
      "weeklyOff",
      "overtimeAvailable",
      "insuranceAvailable",
      "pfAvailable",
      "esicAvailable",
    ];

    booleanFields.forEach((field) => {
      if (typeof req.body[field] !== "undefined") {
        updateData[field] = req.body[field];
      }
    });

    // 🚨 Safety check: nothing to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    // ✅ Perform update
    const updatedRequirement = await Requirement.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Requirement updated successfully",
      data: updatedRequirement,
    });
  } catch (error) {
    console.error("Error updating remarks:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating remarks",
      error: error.message,
    });
  }
};



export const expressInterest = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params; // This is a string
  const agentId = req.user._id; // Also a string or ObjectId
  const { wage } = req.body; // Add wage to support per-head wage

  // Validate inputs
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new Error("Invalid requirement ID"));
  }

  if (!wage || isNaN(wage)) {
    return next(new Error("Invalid wage input"));
  }

  // Use $addToSet to prevent duplicates
  const requirement = await Requirement.findById(id);
  if (!requirement) {
    return next(new Error("Requirement not found"));
  }
  const alreadyInterested = requirement?.intrestedAgents.some((entry) =>
    entry?.agentId?.equals(agentId)
  );
  if (!alreadyInterested) {
    const updatedRequirement = await Requirement.findByIdAndUpdate(
      id,
      {
        $addToSet: {
          intrestedAgents: { agentId, agentRequiredWage: wage },
        },
      },
      { new: true }
    );
    if (!updatedRequirement) {
      return next(new Error("Requirement not found"));
    }

    return res.json({
      success: true,
      message: "Interest submitted successfully",
      data: updatedRequirement.intrestedAgents,
    });
  } else {
    return res.json({
      success: false,
      message: "You have already expressed interest in this requirement",
    });
  }
});

export const getRequirements = async (req, res) => {
  try {
    const { user } = req; // Assuming you're attaching user to req in middleware

    const filter = {};

    if (user.role === "Agent" || user.role === "SelfWorker") {
      filter.assignedAgentId = user._id;
    } else {
      filter.employerId = user._id;
    }

    const requirements = await Requirement.find(filter)
      .select("assignedAgentName ERN_NUMBER finalAgentRequiredWage createdAt")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      requirements,
    });
  } catch (error) {
    console.error("❌ Error fetching requirements:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch requirements",
    });
  }
};
