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

  // 0. IMMEDIATE API ROUTES (Before ANY middleware)
  app.get("/ping", (req, res) => {
    console.log("PING RECEIVED AT ROOT");
    res.send("PONG - ROOT LEVEL");
  });

  app.get("/api/health", (req, res) => {
    console.log("API HEALTH RECEIVED AT ROOT");
    res.json({ status: "ok", stage: "early" });
  });

  // 1. GLOBAL MIDDLEWARE
  app.use(express.json());

  // 2. VERBOSE LOGGING (Move to top)
  app.use((req, res, next) => {
    console.log(`[SERVER LOG] ${req.method} ${req.url} - IP: ${req.ip}`);
    res.setHeader('X-Express-Server', 'Active');
    next();
  });

  // 3. API ROUTES
  
  // Health check
  app.get("/api/health", (req, res) => {
    console.log("MATCH: /api/health");
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    });
  });

  app.get("/api/ping", (req, res) => {
    console.log("MATCH: /api/ping");
    res.send("pong");
  });

  // Razorpay Order
  app.post("/api/create-order", async (req, res) => {
    console.log("MATCH: /api/create-order - POST");
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Missing credentials in env");
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

  // 4. FRONTEND SERVING
  
  if (process.env.NODE_ENV !== "production") {
    console.log("Vite Mode: Active");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`Production Mode: Serving from ${distPath}`);
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { index: false }));
      
      app.get("*", (req, res) => {
        console.log(`FALLBACK: ${req.url} -> serving index.html`);
        // Final guard: if it looks like an API call but wasn't caught yet, it's a 404
        if (req.path.startsWith("/api/")) {
          return res.status(404).json({ error: "API Route Not Found", url: req.url });
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
        res.status(503).send("Build in progress, please refresh...");
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
