// Express Route (routes/userStats.js or similar)
import express from "express";
import { User } from "../models/userSchema.js"; // Adjust path to your User model
const router = express.Router();

// Helper: get start of day/month
const getStartDate = (type) => {
  const now = new Date();
  if (type === "daily") {
    const start = new Date(now.setDate(now.getDate() - 6));
    start.setHours(0, 0, 0, 0);
    return start;
  } else if (type === "monthly") {
    return new Date(now.getFullYear(), 0, 1);
  }
};

// API: /api/stats/registrations?type=daily or type=monthly
router.get("/registrations", async (req, res) => {
  const { type = "daily", year = "all" } = req.query;

  try {
    const matchStage = {};

    // 🎯 Year filter
    if (year !== "all") {
      const start = new Date(`${year}-01-01T00:00:00.000Z`);
      const end = new Date(`${year}-12-31T23:59:59.999Z`);
      matchStage.createdAt = { $gte: start, $lte: end };
    }

    const format =
      type === "daily"
        ? {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "+05:30",
            },
          }
        : {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone: "+05:30",
            },
          };

    const aggregation = await User.aggregate([
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
      {
        $group: {
          _id: { role: "$role", date: format },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.role",
          data: {
            $push: {
              date: "$_id.date",
              count: "$count",
            },
          },
        },
      },
      { $sort: { "_id": 1 } },
    ]);

    // summary always all-time
    const summary = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);

    const summaryData = summary.reduce(
      (acc, cur) => {
        acc.total += cur.count;
        acc[cur._id] = cur.count;
        return acc;
      },
      { total: 0 }
    );

    res.json({
      type,
      year,
      data: aggregation,
      summary: summaryData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});




export default router;
