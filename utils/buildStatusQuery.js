export const buildStatusQuery = (statusMode, status) => {
  if (statusMode === "active") {
    return { status: { $in: ["Assigned", "Approved"] } };
  }

  if (statusMode === "inactive") {
    return { status: { $nin: ["Assigned", "Approved", "Closed", "Expired"] } };
  }

  if (status) {
    return { status };
  }

  return { status: { $nin: ["Closed", "Expired"] } };
};