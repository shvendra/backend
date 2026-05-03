import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userSchema.js";
import ErrorHandler from "../middlewares/error.js";
export const getAllJobs = catchAsyncErrors(async (req, res, next) => {
  // Destructure and parse pagination/filter parameters
  const {
    role,
    state,
    district,
    page = 1, // Default to page 1
    limit = 25, // Default to 25 items per page (matching frontend default)
    search = "",
  } = req.query;

  // Ensure page and limit are positive integers
  const currentPage = Math.max(1, parseInt(page, 10));
  const limitPerPage = Math.max(1, parseInt(limit, 10));
  const skip = (currentPage - 1) * limitPerPage;

  // Build the filter query object
  const filters = {};

  if (role) filters.role = role;
  // Using $regex for case-insensitive partial matching
  if (state) filters.state = { $regex: state, $options: "i" };
  if (district) filters.district = { $regex: district, $options: "i" };

  // Add search criteria using $or for multiple fields
  // Only add if search term is not empty
  if (search) {
    filters.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      // Assuming 'city' field exists and is relevant for search
      { city: { $regex: search, $options: "i" } },
      // Add other searchable fields if necessary, e.g., block, address
      // { block: { $regex: search, $options: "i" } },
      // { address: { $regex: search, $options: "i" } },
    ];
  }

  try {
    // Get the total count of documents matching the filters
    const totalJobsCount = await User.countDocuments(filters);

    // Fetch the paginated documents
    const jobs = await User.find(filters)
      .sort({ createdAt: -1 }) // Sort by creation date descending
      .skip(skip)
      .limit(limitPerPage)
      // Optional: Select only necessary fields to reduce data transfer
      // .select('name phone role state district block address createdAt status')
      ;

    // Send the paginated data and total count
    res.status(200).json({
      success: true,
      jobs,
      totalJobsCount, // Renamed from 'total' for clarity, matching frontend expectation
      limit: limitPerPage,
      page: currentPage,
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    // Use the ErrorHandler middleware for consistent error responses
    return next(new ErrorHandler("Failed to fetch jobs", 500));
  }
});

export const postJob = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    areasOfWork,
    workExperience,
    fixedSalary,
    salaryFrom,
    salaryTo,
    gender,
    description,
    dob,
    phone,
    aadhar,
    ifscCode,
    bankAccount,
    pinCode,
    bankName,
    address,
    role,
    district,
    state,
    block,
    password,
  } = req.body;

  // Basic validations
  if (!name || !areasOfWork || !description) {
    return next(new ErrorHandler("Please provide complete worker details.", 400));
  }

  // if ((!salaryFrom || !salaryTo) && !fixedSalary) {
  //   return next(new ErrorHandler("Please either provide fixed wages or ranged wages.", 400));
  // }

  // if (salaryFrom && salaryTo && fixedSalary) {
  //   return next(new ErrorHandler("Cannot Enter Fixed and Ranged wages together.", 400));
  // }

  // Check if phone already exists
  const isPhoneExist = await User.findOne({ phone });
  if (isPhoneExist) {
    return next(new ErrorHandler("Phone number already registered!", 400));
  }

  let profileImage = "";
  if (req.file) {
    profileImage = req.file.path;
  }

  try {
    const job = await User.create({
      name,
      areasOfWork,
      workExperience,
      fixedSalary,
      salaryFrom,
      salaryTo,
      gender,
      description,
      dob,
      phone,
      kyc: {
        aadharNumber: aadhar,
      },
      bankDetails: {
        ifscCode,
        accountNumber: bankAccount,
        bankName
      },
      pinCode,
      address,
      postedBy: req.user._id,
      role,
      district,
      state,
      password,
      block,
      profile: profileImage,
    });

    return res.status(200).json({
      success: true,
      message: "Worker added Successfully!",
      job,
    });
  } catch (error) {
    console.error("Error in postJob:", error);

    // Handle Mongo duplicate key error
    if (error.code === 11000) {
      const key = Object.keys(error.keyValue)[0];
      return next(new ErrorHandler(`${key} already exists!`, 400));
    }

    return next(new ErrorHandler(error.message || "Something went wrong", 500));
  }
});




export const getMyJobs = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  const { postedBy } = req.query;
// console.log(req.query);
// console.log(role);
  if (role === "Worker") {
    return;
    // return next(
    //   new ErrorHandler("Worker not allowed to access this resource.", 400)
    // );
  }

  let filter = {};

  if (role !== "Admin" && role !== "SuperAdmin") {
    // For non-admins, use user's own ID (override any incoming postedBy)
    filter.postedBy = req.user._id;
  } else if (postedBy) {
    // Admins can filter by postedBy
    filter.postedBy = postedBy;
  }

  const myJobs = await User.find(filter).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    myJobs,
  });
});


export const updateJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Worker") {
    return;
    // return next(
    //   new ErrorHandler("Worker not allowed to access this resource.", 400)
    // );
  }
  const { id } = req.params;
  let job = await User.findById(id);
  if (!job) {
    return next(new ErrorHandler("OOPS! Job not found.", 404));
  }
  job = await User.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  res.status(200).json({
    success: true,
    message: "Worker Updated!",
  });
});

export const deleteJob = catchAsyncErrors(async (req, res, next) => {
  const { role } = req.user;
  if (role === "Job Seeker") {
    return next(
      new ErrorHandler("Job Seeker not allowed to access this resource.", 400)
    );
  }
  const { id } = req.params;
  const job = await User.findById(id);
  if (!job) {
    return next(new ErrorHandler("OOPS! Job not found.", 404));
  }
  await job.deleteOne();
  res.status(200).json({
    success: true,
    message: "Job Deleted!",
  });
});

export const getSingleJob = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  try {
    const job = await User.findById(id);
    if (!job) {
      return next(new ErrorHandler("Job not found.", 404));
    }
    res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    return next(new ErrorHandler(`Invalid ID / CastError`, 404));
  }
});
