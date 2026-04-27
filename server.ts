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

  // 1. GLOBAL MIDDLEWARE
  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
  });

  // 2. API ROUTES
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      node: process.version,
      config: {
        hasRazorpayId: !!process.env.VITE_RAZORPAY_KEY_ID,
        hasRazorpaySecret: !!process.env.RAZORPAY_KEY_SECRET
      }
    });
  });

  app.get("/api/ping", (req, res) => res.send("pong"));

  // Razorpay Order
  app.post("/api/create-order", async (req, res) => {
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: "Razorpay credentials not configured" });
    }

    try {
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ error: "Amount required" });

      const rzp = new RazorpayConstructor({
        key_id: keyId,
        key_secret: keySecret
      });

      const order = await rzp.orders.create({
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      });

      res.json({ ...order, key_id: keyId });
    } catch (err: any) {
      console.error("Razorpay API Error:", err);
      res.status(500).json({ error: err.message || "Payment gateway error" });
    }
  });

  // 3. FRONTEND SERVING
  if (process.env.NODE_ENV !== "production") {
    console.log("DEVELOPMENT MODE (Vite)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("PRODUCTION MODE (Static)");
    const distPath = path.join(process.cwd(), "dist");
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { index: false }));
      
      app.get("*", (req, res) => {
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({ error: "API route not found" });
        }
        
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Frontend assets not found");
        }
      });
    } else {
      app.get("*", (req, res) => {
        res.status(503).send("Wait for build...");
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("CRITICAL SERVER ERROR:", err);
});
