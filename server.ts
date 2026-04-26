import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

// ESM compatibility for Razorpay
const RazorpayConstructor = (Razorpay as any).default || Razorpay;

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Verbose Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// --- API ROUTES ---

// Simple verification endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    message: "Payment API is alive", 
    time: new Date().toISOString(),
    env_check: {
      hasKeyId: !!process.env.VITE_RAZORPAY_KEY_ID,
      hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET
    }
  });
});

// Razorpay Order Creation
app.post("/api/create-razorpay-order", async (req, res) => {
  console.log(`[${new Date().toISOString()}] PAYMENT: Create order request received`);
  
  const keyId = process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("[PAYMENT ERROR] Missing Razorpay credentials in environment");
    return res.status(500).json({ error: "Razorpay credentials are not configured in Store Secrets." });
  }

  try {
    const { amount } = req.body;
    if (!amount) {
      console.error("[PAYMENT ERROR] Amount missing from request body");
      return res.status(400).json({ error: "Order amount is required" });
    }

    const rzp = new RazorpayConstructor({
      key_id: keyId,
      key_secret: keySecret
    });

    const order = await rzp.orders.create({
      amount: Math.round(Number(amount) * 100), // convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    console.log(`[${new Date().toISOString()}] PAYMENT SUCCESS: Created order ${order.id}`);
    res.json({ ...order, key_id: keyId });
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] PAYMENT ERROR:`, err);
    res.status(500).json({ error: err.message || "Internal Payment Service Error" });
  }
});

// Explicit API 404 to prevent falling through to HTML index
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found", path: req.path });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Express server is LIVE on http://0.0.0.0:${PORT} <<<`);
  });
}

start().catch(err => {
  console.error("FATAL ERROR DURING STARTUP:", err);
});
