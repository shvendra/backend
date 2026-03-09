export const buildDistrictFilter = ({ req, role, userDistrict, serviceArea }) => {
  let districts = [];

  if (req.queryPolluted?.district) {
    districts = Array.isArray(req.queryPolluted.district)
      ? req.queryPolluted.district
      : [req.queryPolluted.district];
  } else if (req.query.district) {
    districts = Array.isArray(req.query.district)
      ? req.query.district
      : [req.query.district];
  }

  if (!districts.length && (role === "Agent" || role === "SelfWorker")) {
    const set = new Set();
    if (userDistrict) set.add(userDistrict);
    if (Array.isArray(serviceArea)) {
      serviceArea.forEach((d) => typeof d === "string" && set.add(d));
    }
    districts = Array.from(set);
  }

  const safe = districts
    .filter((d) => typeof d === "string" && d.trim())
    .map((d) => new RegExp(d.trim(), "i"));

  return safe.length ? { district: { $in: safe } } : {};
};
