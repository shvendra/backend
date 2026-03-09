export const buildSearchQuery = (search) => {
  if (!search) return {};

  const value = search.trim();
  const regex = new RegExp(value, "i");

  return {
    $or: [
      !isNaN(Number(value)) ? { ERN_NUMBER: Number(value) } : null,
      { employerName: regex },
      { district: regex },
      { workLocation: regex },
      { workType: regex },
    ].filter(Boolean),
  };
};
