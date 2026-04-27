import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ESM compatibility for Razorpay
const RazorpayConstructor = (Razorpay as any).default || Razorpay;

async function start() {
  const app = express();
  const PORT = 3000;

  // 1. GLOBAL MIDDLEWARE
  app.use(express.json());

  // 2. DEBUG LOGGING
  app.use((req, res, next) => {
    console.log(`[ROUTE LOG] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    // Add header to identify this server
    res.setHeader('X-Powered-By-Express', 'Custom-FullStack-Server');
    next();
  });

  // 3. API ROUTES (Before anything else)
  
  // Simple check
  app.get("/api/health", (req, res) => {
    console.log("MATCH: /api/health");
    res.json({
      status: "ok",
      version: "3.1",
      mode: process.env.NODE_ENV || "development",
      secrets: {
        hasId: !!process.env.VITE_RAZORPAY_KEY_ID,
        hasSecret: !!process.env.RAZORPAY_KEY_SECRET
      }
    });
  });

  // Razorpay Order
  app.post("/api/create-order", async (req, res) => {
    console.log("MATCH: /api/create-order");
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: "Razorpay credentials not configured on server" });
    }

    try {
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ error: "Amount is required" });

      const rzp = new RazorpayConstructor({
        key_id: keyId,
        key_secret: keySecret
      });

      const order = await rzp.orders.create({
        amount: Math.round(Number(amount) * 100), // convert to paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      });

      res.json({ ...order, key_id: keyId });
    } catch (err: any) {
      console.error("Razorpay API Error:", err);
      res.status(500).json({ error: err.message || "Payment gateway connection failed" });
    }
  });

  // 4. FRONTEND SERVING
  
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    
    if (fs.existsSync(distPath)) {
      // Serve static assets
      app.use(express.static(distPath, { index: false }));
      
      // SPA Fallback
      app.get("*", (req, res) => {
        // Prevent API calls from returning index.html
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: "API route not found", path: req.path });
        }
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      app.get("*", (req, res) => {
        res.status(503).send("Application is building. Please refresh in a moment.");
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Critical server failure:", err);
});
