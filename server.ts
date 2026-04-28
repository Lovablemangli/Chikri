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
    const timestamp = new Date().toISOString();
    console.log(`[REQUEST] ${timestamp} ${req.method} ${req.url}`);
    res.setHeader('X-Express-Server', 'v2');
    res.setHeader('X-Environment', process.env.NODE_ENV || 'unknown');
    next();
  });

  // 1. API ROUTES (DIRECTLY ON APP)
  
  app.get("/api/health", (req, res) => {
    console.log("-> /api/health hit");
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
      config: {
        hasRazorpayId: !!process.env.VITE_RAZORPAY_KEY_ID,
        hasRazorpaySecret: !!process.env.RAZORPAY_KEY_SECRET
      }
    });
  });

  app.get("/api/ping", (req, res) => res.send("pong"));

  // Razorpay Order Creation
  app.post("/api/create-order", async (req, res) => {
    console.log("-> /api/create-order hit", req.body);
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("ERROR: Razorpay Credentials Missing!");
      return res.status(400).json({ 
        error: "Razorpay credentials not configured", 
        details: "Please add VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Settings -> Secrets" 
      });
    }

    try {
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ error: "Amount is required" });

      const rzp = new RazorpayConstructor({
        key_id: keyId,
        key_secret: keySecret
      });

      console.log(`Creating order for amount: ${amount}`);
      const order = await rzp.orders.create({
        amount: Math.round(Number(amount) * 100), // convert to paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      });
      
      console.log("Order created:", order.id);
      res.status(201).json({ ...order, key_id: keyId });
    } catch (err: any) {
      console.error("RAZORPAY ERROR:", err);
      res.status(500).json({ error: err.message || "Failed to create order" });
    }
  });

  // API 404 Guard: Catch any unmatched /api calls BEFORE the frontend serving
  app.all("/api/*", (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.url}`);
    res.status(404).json({ 
      error: "Unknown API Endpoint", 
      method: req.method,
      path: req.path
    });
  });

  // 2. FRONTEND SERVING (Vite or Static)
  if (process.env.NODE_ENV !== "production") {
    console.log("MODE: DEVELOPMENT (Vite)");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("MODE: PRODUCTION (Static)");
    const distPath = path.resolve(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath, { index: false }));
    
    // SPA Fallback: Serve index.html for any GET request that isn't a file or API
    app.get("*", (req, res) => {
      // Final safety check: if it somehow reached here and starts with /api/, it's a 404
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API path reached fallback" });
      }
      
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application assets not found. Please wait for build to complete.");
      }
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      path: req.path
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("CRITICAL SERVER ERROR:", err);
});
