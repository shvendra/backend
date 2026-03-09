import { WorkerAttendance } from "../models/WorkerAttendanceSchema.js";
// import { sendEmailNotification } from "../utils/sendEmailUser.js";
export const addWorkerAttendance = async (req, res) => {
  try {
    const {
      agentId,
      streamId,
      numberOfWorkers,
      perWorkerRate,
      agentName,
      employerName,
      workLocation,
      ern,
      employer_id,
    } = req.body;
    if (
      !agentId ||
      !streamId ||
      !numberOfWorkers ||
      !perWorkerRate ||
      !agentName ||
      !employerName ||
      !ern
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const attendance = new WorkerAttendance({
      agent_id: agentId,
      requirement_id: streamId,
      number_of_worker: numberOfWorkers,
      sent_by_agent: true,
      send_date_time: new Date(),
      per_worker_rates: perWorkerRate,
      agent_name: agentName,
      employer_name: employerName,
      work_location: workLocation,
      ERN_number: ern,
      status: "Pending",
      received_by_employer: false,
      employer_accepted: false,
      employer_id: employer_id,
    });
    await attendance.save();

    res
      .status(201)
      .json({ success: true, message: "Worker attendance added successfully" });
  } catch (error) {
    console.error("Attendance creation error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getAttendanceByFilter = async (req, res) => {
  try {
    const { requirement_id, agent_id, employer_id } = req.query;
    const user = req.user;

    const filter = {};
    const isAdmin = user.role === "Admin" || user.role === "SuperAdmin";

    if (requirement_id) {
      filter.requirement_id = requirement_id;
    }
    // Employer role can only view their own data
    if (user.role === "Employer") {
      filter.employer_id = user._id;
    }

    // Agent role can only view their own data
    if (user.role === "Agent" || user.role === "SelfWorker") {
      filter.agent_id = user._id;
    }

    // If admin filters by employer/agent or requirement_id, allow
    if (isAdmin && (agent_id || employer_id)) {
      if (agent_id) filter.agent_id = agent_id;
      if (employer_id) filter.employerId = employer_id;
    }

    // Prevent non-admins from fetching all
    if (!isAdmin && !requirement_id && !agent_id && !employer_id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admin/SuperAdmin can fetch all data.",
      });
    }

    const result = await WorkerAttendance.find(filter)
      .sort({ createdAt: -1 }) // 👈 Descending order by creation time
      .lean();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching attendance by filter:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateAttendanceStatus = async (req, res) => {
  try {
    const { id } = req.query;
    const { employer_accepted } = req.body;

    if (!employer_accepted) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

   const attendance = await WorkerAttendance.findByIdAndUpdate(
  id,
  { employer_accepted },
  { new: true }
).select("ERN_number employer_id");


    if (!attendance) {
      return res
        .status(404)
        .json({ success: false, message: "Attendance not found" });
    }
    // sendEmailNotification(
    //   attendance?.ERN_number,
    //   attendance?.employer_id,
    //   "attendace Approved",
    //   "attendance approved test"
    // );
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    console.error("Error updating attendance status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



