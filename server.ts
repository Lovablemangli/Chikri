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

// --- BACKEND API ROUTES ---

// Simple verification endpoint
app.get("/backend-check", (req, res) => {
  res.json({ 
    message: "Server is responsive", 
    time: new Date().toISOString(),
    env_keys: {
      VITE_RAZORPAY_KEY_ID: !!process.env.VITE_RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET
    }
  });
});

// Razorpay Order Creation
app.post("/backend/create-razorpay-order", async (req, res) => {
  console.log("[PAYMENT] Create order request received");
  
  const keyId = process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("[PAYMENT ERROR] Missing Razorpay credentials");
    return res.status(500).json({ error: "Razorpay credentials are not configured in Store Secrets." });
  }

  try {
    const { amount } = req.body;
    if (!amount) {
      console.error("[PAYMENT ERROR] Amount missing from body");
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

    console.log("[PAYMENT SUCCESS] Created order:", order.id);
    res.json({ ...order, key_id: keyId });
  } catch (err: any) {
    console.error("[PAYMENT ERROR] API failure:", err);
    res.status(500).json({ error: err.message || "Internal Payment Service Error" });
  }
});

// Explicit API 404 to prevent falling through to HTML index
app.all("/backend/*", (req, res) => {
  res.status(404).json({ error: "Backend route not found", path: req.path });
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
