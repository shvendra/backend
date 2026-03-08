export const getPagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = query.limit ? parseInt(query.limit) : null;
  const skip = limit ? (page - 1) * limit : 0;

  return { page, limit, skip };
};
