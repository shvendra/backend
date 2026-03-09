// Authorization Middleware (authorizeAdminOrSuperAdmin.js)
export const authorizeAdminOrSuperAdmin = (req, res, next) => {
    if (req.user.role !== "Admin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({ message: "Forbidden: You don't have access to this resource" });
    }
    next();
  };
  
  