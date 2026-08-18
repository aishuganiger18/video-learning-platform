const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const dotenv = require("dotenv");
const Razorpay = require("razorpay");

dotenv.config();

const app = express();

// ======================================================
// SERVER CONFIGURATION
// ======================================================

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ======================================================
// RAZORPAY CONFIGURATION
// ======================================================

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

// ======================================================
// SUBSCRIPTION PLANS
// ======================================================

const PLANS = {
  Free: {
    name: "Free",
    price: 0,
    currency: "INR",
    validityDays: null,
    downloadLimit: 1,
    videoQuality: "480p",
    watchTime: 60,
    ads: true,
    premiumVideos: false,
    offlineDownloads: true,
    priorityContent: false,
    exclusiveCourses: false,
    features: [
      "Limited video access",
      "480p video quality",
      "60 minutes watch time",
      "1 download per day",
      "Ads supported",
    ],
  },

  Bronze: {
    name: "Bronze",
    price: 199,
    currency: "INR",
    validityDays: 30,
    downloadLimit: 5,
    videoQuality: "720p",
    watchTime: 180,
    ads: true,
    premiumVideos: true,
    offlineDownloads: true,
    priorityContent: false,
    exclusiveCourses: false,
    features: [
      "More video access",
      "720p video quality",
      "180 minutes watch time",
      "5 downloads per day",
      "Premium videos",
    ],
  },

  Silver: {
    name: "Silver",
    price: 399,
    currency: "INR",
    validityDays: 30,
    downloadLimit: 10,
    videoQuality: "1080p",
    watchTime: 300,
    ads: false,
    premiumVideos: true,
    offlineDownloads: true,
    priorityContent: true,
    exclusiveCourses: true,
    features: [
      "Unlimited video access",
      "1080p video quality",
      "300 minutes watch time",
      "10 downloads per day",
      "Ad-free viewing",
      "Premium courses",
      "Priority content",
    ],
  },

  Gold: {
    name: "Gold",
    price: 699,
    currency: "INR",
    validityDays: 30,
    downloadLimit: 20,
    videoQuality: "1080p",
    watchTime: 600,
    ads: false,
    premiumVideos: true,
    offlineDownloads: true,
    priorityContent: true,
    exclusiveCourses: true,
    features: [
      "Unlimited video access",
      "1080p video quality",
      "600 minutes watch time",
      "20 downloads per day",
      "Ad-free viewing",
      "Premium courses",
      "Priority content",
      "Fast streaming",
    ],
  },
};

// ======================================================
// IN-MEMORY DATA
// ======================================================

// Users
const users = new Map();

// Payments
const payments = new Map();

// Razorpay orders
const orders = new Map();

// ======================================================
// HELPER FUNCTIONS
// ======================================================

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getUser(userId) {
  if (!users.has(userId)) {
    users.set(userId, {
      userId,

      // Subscription
      plan: "Free",
      subscriptionStatus: "active",
      subscriptionStartDate: null,
      subscriptionExpiryDate: null,
      nextRenewalDate: null,
      autoRenew: false,

     // Downloads
downloads: 0,
downloadDate: getToday(),
videos: [],

// Watch time
watchMinutes: 0,

      // Billing
      billingHistory: [],
    });
  }

  const user = users.get(userId);

  resetDailyDownloads(user);
  checkSubscriptionExpiry(user);

  return user;
}

// ------------------------------------------------------
// DAILY DOWNLOAD RESET
// ------------------------------------------------------

function resetDailyDownloads(user) {
  const today = getToday();

  if (user.downloadDate !== today) {
    user.downloads = 0;
    user.downloadDate = today;
    user.videos = [];
  }
}

// ------------------------------------------------------
// SUBSCRIPTION EXPIRY
// ------------------------------------------------------

function checkSubscriptionExpiry(user) {
  if (
    user.plan !== "Free" &&
    user.subscriptionExpiryDate &&
    new Date(user.subscriptionExpiryDate) < new Date()
  ) {
    user.plan = "Free";
    user.subscriptionStatus = "expired";
    user.subscriptionStartDate = null;
    user.subscriptionExpiryDate = null;
    user.nextRenewalDate = null;
    user.autoRenew = false;
  }
}

// ------------------------------------------------------
// REMAINING DOWNLOADS
// ------------------------------------------------------

function getRemainingDownloads(user) {
  const limit = PLANS[user.plan].downloadLimit;

  return Math.max(0, limit - user.downloads);
}

// ------------------------------------------------------
// CREATE SUBSCRIPTION DATES
// ------------------------------------------------------

function createSubscriptionDates(planName) {
  const plan = PLANS[planName];

  if (!plan.validityDays) {
    return {
      startDate: null,
      expiryDate: null,
      nextRenewalDate: null,
    };
  }

  const start = new Date();

  const expiry = new Date(start);
  expiry.setDate(expiry.getDate() + plan.validityDays);

  return {
    startDate: start.toISOString(),
    expiryDate: expiry.toISOString(),
    nextRenewalDate: expiry.toISOString(),
  };
}

// ------------------------------------------------------
// PAYMENT ID GENERATOR FOR RECORDS
// ------------------------------------------------------

function generateInvoiceNumber() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Video Learning Platform Backend is running!",
    task: "Task 2 + Task 3",
  });
});

// ======================================================
// TASK 3
// GET ALL SUBSCRIPTION PLANS
// ======================================================

app.get("/api/plans", (req, res) => {
  res.json({
    success: true,
    plans: Object.values(PLANS),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    port: PORT,
    razorpayConfigured: Boolean(razorpay),
    time: new Date().toISOString(),
  });
});

// ======================================================
// GET SINGLE PLAN
// ======================================================

app.get("/api/plans/:planName", (req, res) => {
  const planName = req.params.planName;

  const plan = PLANS[planName];

  if (!plan) {
    return res.status(404).json({
      success: false,
      message: "Subscription plan not found.",
    });
  }

  res.json({
    success: true,
    plan,
  });
});

// ======================================================
// GET USER SUBSCRIPTION
// ======================================================

app.get("/api/subscription/:userId", (req, res) => {
  const user = getUser(req.params.userId);

  const plan = PLANS[user.plan];

  res.json({
    success: true,

    userId: user.userId,

    subscription: {
      plan: user.plan,
      status: user.subscriptionStatus,
      startDate: user.subscriptionStartDate,
      expiryDate: user.subscriptionExpiryDate,
      nextRenewalDate: user.nextRenewalDate,
      autoRenew: user.autoRenew,
    },

    features: plan.features,

    billingHistory: user.billingHistory,
  });
});

// ======================================================
// SELECT FREE PLAN
// ======================================================

app.post("/api/subscription/select-free", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required.",
    });
  }

  const user = getUser(userId);

  user.plan = "Free";
  user.subscriptionStatus = "active";
  user.subscriptionStartDate = null;
  user.subscriptionExpiryDate = null;
  user.nextRenewalDate = null;
  user.autoRenew = false;

  res.json({
    success: true,
    message: "Free plan activated successfully.",
    userId: user.userId,
    plan: user.plan,
    subscription: user.subscriptionStatus,
  });
});

// ======================================================
// CREATE RAZORPAY ORDER
// ======================================================

app.post("/api/subscription/create-order", async (req, res) => {
  try {
    const { userId, plan } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({
        success: false,
        message: "userId and plan are required.",
      });
    }

    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan.",
      });
    }

    if (plan === "Free") {
      return res.status(400).json({
        success: false,
        message: "Free plan does not require payment.",
      });
    }

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message:
          "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.",
      });
    }

    const user = getUser(userId);

    const selectedPlan = PLANS[plan];

    const amountInPaise = selectedPlan.price * 100;

    const receipt = `receipt_${Date.now()}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        userId,
        plan,
      },
    });

    orders.set(razorpayOrder.id, {
      razorpayOrderId: razorpayOrder.id,
      userId,
      plan,
      amount: selectedPlan.price,
      currency: "INR",
      status: "created",
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,

      keyId: RAZORPAY_KEY_ID,

      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },

      userId: user.userId,
      plan: selectedPlan.name,
      price: selectedPlan.price,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create Razorpay order.",
      error: error.error?.description || error.message,
    });
  }
});

// ======================================================
// VERIFY RAZORPAY PAYMENT
// ======================================================

app.post("/api/subscription/verify-payment", (req, res) => {
  try {
    const {
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !userId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification information is incomplete.",
      });
    }

    const orderRecord = orders.get(razorpay_order_id);

    if (!orderRecord) {
      return res.status(404).json({
        success: false,
        message: "Razorpay order not found.",
      });
    }

    if (orderRecord.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Order does not belong to this user.",
      });
    }

    // -----------------------------------------------
    // CREATE SERVER-SIDE SIGNATURE
    // -----------------------------------------------

    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    // Timing-safe comparison
    const expectedBuffer = Buffer.from(generatedSignature, "utf8");
    const receivedBuffer = Buffer.from(razorpay_signature, "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed.",
      });
    }

    // -----------------------------------------------
    // PREVENT DUPLICATE PAYMENT PROCESSING
    // -----------------------------------------------

    if (payments.has(razorpay_payment_id)) {
      return res.status(409).json({
        success: false,
        message: "This payment has already been processed.",
      });
    }

    // -----------------------------------------------
    // ACTIVATE SUBSCRIPTION
    // -----------------------------------------------

    const user = getUser(userId);

    const planName = orderRecord.plan;

    const dates = createSubscriptionDates(planName);

    const invoiceNumber = generateInvoiceNumber();

    const paymentRecord = {
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      invoiceNumber,

      userId,

      plan: planName,

      amount: orderRecord.amount,

      currency: "INR",

      paymentStatus: "success",

      subscriptionStartDate: dates.startDate,

      subscriptionExpiryDate: dates.expiryDate,

      nextRenewalDate: dates.nextRenewalDate,

      paymentDate: new Date().toISOString(),
    };

    payments.set(razorpay_payment_id, paymentRecord);

    // Update user
    user.plan = planName;
    user.subscriptionStatus = "active";
    user.subscriptionStartDate = dates.startDate;
    user.subscriptionExpiryDate = dates.expiryDate;
    user.nextRenewalDate = dates.nextRenewalDate;
    user.autoRenew = false;

    // Reset download counter for new plan
    user.downloads = 0;
    user.downloadDate = getToday();

    // Save billing history
    user.billingHistory.push(paymentRecord);

    orderRecord.status = "paid";

    res.json({
      success: true,

      message: `${planName} subscription activated successfully.`,

      userId,

      subscription: {
        plan: user.plan,
        status: user.subscriptionStatus,
        startDate: user.subscriptionStartDate,
        expiryDate: user.subscriptionExpiryDate,
        nextRenewalDate: user.nextRenewalDate,
      },

      payment: paymentRecord,

      features: PLANS[planName].features,
    });
  } catch (error) {
    console.error("Payment verification error:", error);

    res.status(500).json({
      success: false,
      message: "Payment verification failed.",
      error: error.message,
    });
  }
});

// ======================================================
// CANCEL SUBSCRIPTION
// ======================================================

app.post("/api/subscription/cancel", (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "userId is required.",
    });
  }

  const user = getUser(userId);

  if (user.plan === "Free") {
    return res.status(400).json({
      success: false,
      message: "Free plan cannot be cancelled.",
    });
  }

  user.autoRenew = false;

  res.json({
    success: true,

    message:
      "Subscription cancelled successfully. Your current access remains available until expiry.",

    userId,

    plan: user.plan,

    expiryDate: user.subscriptionExpiryDate,

    autoRenew: user.autoRenew,
  });
});

// ======================================================
// RENEW SUBSCRIPTION
// ======================================================

app.post("/api/subscription/renew", async (req, res) => {
  try {
    const { userId, plan } = req.body;

    if (!userId || !plan) {
      return res.status(400).json({
        success: false,
        message: "userId and plan are required.",
      });
    }

    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan.",
      });
    }

    if (plan === "Free") {
      return res.status(400).json({
        success: false,
        message: "Free plan does not require renewal payment.",
      });
    }

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Razorpay is not configured.",
      });
    }

    const amount = PLANS[plan].price * 100;

    const razorpayOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `renew_${Date.now()}`,
      notes: {
        userId,
        plan,
        type: "renewal",
      },
    });

    orders.set(razorpayOrder.id, {
      razorpayOrderId: razorpayOrder.id,
      userId,
      plan,
      amount: PLANS[plan].price,
      currency: "INR",
      status: "created",
      type: "renewal",
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      keyId: RAZORPAY_KEY_ID,
      order: razorpayOrder,
      plan,
    });
  } catch (error) {
    console.error("Renewal order error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create renewal order.",
      error: error.message,
    });
  }
});

// ======================================================
// BILLING HISTORY
// ======================================================

app.get("/api/subscription/:userId/billing", (req, res) => {
  const user = getUser(req.params.userId);

  res.json({
    success: true,
    userId: user.userId,
    billingHistory: user.billingHistory,
  });
});

// ======================================================
// TASK 2
// DOWNLOAD STATUS
// ======================================================

app.get("/api/downloads/:userId", (req, res) => {
  const user = getUser(req.params.userId);

  const plan = PLANS[user.plan];

  res.json({
    success: true,

    userId: user.userId,

    plan: user.plan,

    downloads: user.downloads,

    limit: plan.downloadLimit,

    remaining: getRemainingDownloads(user),

    videos: user.videos,
  });
});

// ======================================================
// TASK 2
// SELECT PLAN - DEVELOPMENT/TESTING
// ======================================================

app.post("/api/download", async (req, res) => {
  try {
    const {
      userId,
      plan,
      videoId,
      videoTitle,
      fileSize,
      thumbnail
    } = req.body;

    // -----------------------------
    // VALIDATE REQUEST
    // -----------------------------
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required."
      });
    }

    if (!videoId) {
      return res.status(400).json({
        success: false,
        message: "Video ID is required."
      });
    }

    // -----------------------------
    // GET USER
    // -----------------------------
    const user = getUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // -----------------------------
    // DETERMINE ACTIVE PLAN
    // -----------------------------
   const activePlan = plan || user?.plan || "Free";
   
    const planData = PLANS[activePlan];

    if (!planData) {
      return res.status(400).json({
        success: false,
        message: `Invalid subscription plan: ${activePlan}.`
      });
    }

    // -----------------------------
    // RESET DAILY DOWNLOAD COUNT
    // -----------------------------
    const today = getToday();

    if (user.downloadDate !== today) {
      user.downloads = 0;
      user.downloadDate = today;
      user.videos = [];
    }

    // -----------------------------
    // DUPLICATE DOWNLOAD CHECK
    // -----------------------------
    const alreadyDownloaded =
      Array.isArray(user.videos) &&
      user.videos.some((item) => {
        if (typeof item === "string") {
          return item === videoId;
        }

        return item.videoId === videoId;
      });

    if (alreadyDownloaded) {
      return res.status(409).json({
        success: false,
        message: "You have already downloaded this video today.",
        downloads: user.downloads,
        remaining: Math.max(
          planData.downloadLimit - user.downloads,
          0
        ),
        limit: planData.downloadLimit,
        plan: activePlan
      });
    }

    // -----------------------------
    // CHECK DOWNLOAD LIMIT
    // -----------------------------
    if (user.downloads >= planData.downloadLimit) {
      return res.status(403).json({
        success: false,
        message: `${activePlan} plan download limit reached.`,
        plan: activePlan,
        downloads: user.downloads,
        remaining: 0,
        limit: planData.downloadLimit
      });
    }

    // -----------------------------
    // RECORD DOWNLOAD
    // -----------------------------
    user.downloads += 1;

    if (!Array.isArray(user.videos)) {
      user.videos = [];
    }

    user.videos.push({
      videoId,
      videoTitle: videoTitle || "Video",
      fileSize: fileSize || 0,
      thumbnail: thumbnail || "",
      downloadedAt: new Date().toISOString()
    });

    // -----------------------------
    // RESPONSE
    // -----------------------------
    const remaining = Math.max(
      planData.downloadLimit - user.downloads,
      0
    );

    return res.status(200).json({
      success: true,
      message: `${videoTitle || "Video"} downloaded successfully.`,
      userId: user.userId,
      plan: activePlan,
      videoId,
      downloads: user.downloads,
      remaining,
      limit: planData.downloadLimit,
      download: {
        videoId,
        videoTitle: videoTitle || "Video",
        fileSize: fileSize || 0,
        thumbnail: thumbnail || "",
        downloadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("DOWNLOAD ROUTE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Download failed due to a server error.",
      error: error.message
    });
  }
});
// ======================================================
// VIDEO WATCHING / WATCH-TIME MANAGEMENT
// ======================================================

app.post("/api/watch", (req, res) => {
  try {
    const { userId, plan, videoId, minutes } = req.body;

    if (!userId || !videoId || minutes === undefined) {
      return res.status(400).json({
        success: false,
        message: "userId, videoId and minutes are required.",
      });
    }

    const user = getUser(userId);

    const activePlan = plan || user.plan || "Free";
    const planData = PLANS[activePlan];

    if (!planData) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription plan.",
      });
    }

    const watchMinutes = Number(minutes);

    if (
      Number.isNaN(watchMinutes) ||
      watchMinutes <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Minutes must be a positive number.",
      });
    }

    if (!user.watchMinutes) {
      user.watchMinutes = 0;
    }

    const remaining = Math.max(
      planData.watchTime - user.watchMinutes,
      0
    );

    if (watchMinutes > remaining) {
      return res.status(403).json({
        success: false,
        message: `${activePlan} plan watch-time limit reached.`,
        plan: activePlan,
        videoId,
        watchTimeLimit: planData.watchTime,
        watched: user.watchMinutes,
        remaining: 0,
      });
    }

    user.watchMinutes += watchMinutes;

    const watchRemaining = Math.max(
      planData.watchTime - user.watchMinutes,
      0
    );

    return res.status(200).json({
      success: true,
      message: "Watch time recorded successfully.",
      userId: user.userId,
      plan: activePlan,
      videoId,
      watched: user.watchMinutes,
      limit: planData.watchTime,
      remaining: watchRemaining,
    });
  } catch (error) {
    console.error("WATCH ROUTE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to record watch time.",
      error: error.message,
    });
  }
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    server: "online",
    port: PORT,
    razorpayConfigured: Boolean(razorpay),
    time: new Date().toISOString(),
  });
});

// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
    error: err.message,
  });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {
  console.log("==========================================");
  console.log("Video Learning Platform Backend");
  console.log("==========================================");
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Plans API: http://localhost:${PORT}/api/plans`);
  console.log(`Health API: http://localhost:${PORT}/api/health`);
  console.log(
    `Razorpay: ${razorpay ? "CONFIGURED" : "NOT CONFIGURED"}`
  );
  console.log("==========================================");
});