import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Razorpay from "razorpay";
import dotenv from "dotenv";
import fs from "fs";

console.log("SERVER.TS LOADING...");

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ESM compatibility for Razorpay
const RazorpayConstructor = (Razorpay as any).default || Razorpay;

async function start() {
  console.log("STARTING EXPRESS SERVER...");
  const app = express();
  const PORT = 3000;

  // 0. DIAGNOSTICS & GLOBAL MIDDLEWARE
  app.use(express.json());
  
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    // Add custom header to identify responses from our Express server
    res.setHeader('X-Powered-By-Express', 'Custom-FullStack');
    next();
  });

  // 1. API ROUTES (Explicitly defined before any static/fallback)
  
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
      razorpay: {
        id: !!process.env.VITE_RAZORPAY_KEY_ID,
        secret: !!process.env.RAZORPAY_KEY_SECRET
      }
    });
  });

  app.get("/api/ping", (req, res) => res.send("pong"));

  // Razorpay Order Creation
  app.post("/api/create-order", async (req, res) => {
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay Keys Missing!");
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
      console.error("Razorpay Error:", err);
      res.status(500).json({ error: err.message || "Failed to create order" });
    }
  });

  // API 404 Guard: Strict JSON response for any unmatched /api route
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found", path: req.path });
  });

  // 2. FRONTEND SERVING (Vite or Static)
  if (process.env.NODE_ENV !== "production") {
    console.log("RUNNING IN DEVELOPMENT MODE");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("RUNNING IN PRODUCTION MODE");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath, { index: false }));
    
    // SPA Fallback
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application not ready. Please try again in 1 minute.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("CRITICAL SERVER ERROR:", err);
});
