export const buildStatusQuery = (statusMode, status) => {
  if (statusMode === "active") {
    return { status: { $in: ["assigned", "Approved"] } };
  }

  if (statusMode === "inactive") {
    return { status: { $nin: ["assigned", "Approved", "Closed", "Expired"] } };
  }

  if (status) {
    return { status };
  }

  return { status: { $nin: ["Closed", "Expired"] } };
};
