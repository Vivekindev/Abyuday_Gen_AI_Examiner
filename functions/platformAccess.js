import PlatformAdmin from "../models/platformAdmin.js";
import usersData from "../models/usersData.js";

export async function getPlatformRole(user) {
  if (!user) return "member";
  const owner = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  if (owner && user.email === owner) return "owner";
  return (await PlatformAdmin.exists({ user: user._id })) ? "admin" : "member";
}

export async function requirePlatformAdmin(req, res, next) {
  try {
    const user = await usersData
      .findOne({ email: req.user.email })
      .select("email userName");
    const role = await getPlatformRole(user);
    if (!["owner", "admin"].includes(role))
      return res
        .status(403)
        .json({ error: "Platform admin access is required." });
    req.platform = { user, role };
    res.set("Cache-Control", "no-store");
    next();
  } catch (error) {
    next(error);
  }
}
