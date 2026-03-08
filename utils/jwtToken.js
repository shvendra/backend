export const sendToken = (user, statusCode, res, message = "Success", extraData = {}) => {
  const token = user.getJWTToken();

  const options = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: "lax",
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      message,
      token,
      user,
      ...extraData,
    });
};
