import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

// ESM compatibility for Razorpay
const RazorpayConstructor = (Razorpay as any).default || Razorpay;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON bodies
  app.use(express.json());

  // Global Logger for debugging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // --- API ROUTES ---
  
  // Health check
  app.get("/api/health/ping", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      config: {
        hasKeyId: !!process.env.VITE_RAZORPAY_KEY_ID,
        hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET
      }
    });
  });

  // Razorpay Order Creation
  app.post("/api/create-order", async (req, res) => {
    console.log("[API] Create order request received");
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("[API ERROR] Missing Razorpay credentials");
      return res.status(500).json({ error: "Razorpay credentials are not configured in Store Secrets." });
    }

    try {
      const { amount } = req.body;
      if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
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

      console.log("[API SUCCESS] Created order:", order.id);
      res.json({ ...order, key_id: keyId });
    } catch (err: any) {
      console.error("[API ERROR] Razorpay order creation failed:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  // Catch-all for API to prevent falling through to SPA proxy
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API Route Not Found" });
  });

  // --- FRONTEND SERVING ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Server failed to start:", err);
});
