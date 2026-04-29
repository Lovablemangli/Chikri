import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  console.log("SERVER INITIALIZING...");
  const app = express();
  const PORT = 3000;

  // 0. DIAGNOSTICS & GLOBAL MIDDLEWARE
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Health check at the very top, before any other middleware or routing logic
  app.get("/health-check", (req, res) => {
    res.json({ ok: true, msg: "Server is alive", timestamp: new Date().toISOString() });
  });

  app.use((req, res, next) => {
    // Set diagnostic headers on ALL responses
    res.setHeader('X-Express-Server', 'v5-stable');
    res.setHeader('X-Debug-Node-Env', process.env.NODE_ENV || 'development');
    next();
  });

  // 1. API ROUTES
  const apiRouter = express.Router();

  apiRouter.get("/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      hasRazorpay: !!(process.env.VITE_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    });
  });

  apiRouter.post("/create-order", async (req, res) => {
    console.log("-> API: create-order request received");
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("CRITICAL: Razorpay credentials missing");
      return res.status(400).json({ 
        error: "Razorpay credentials not configured", 
        details: "Check your Environment Secrets/Variables" 
      });
    }

    try {
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ error: "Amount required" });

      // Dynamic import to avoid CJS/ESM issues at top level
      const { default: Razorpay } = await import("razorpay");
      const RazorpayConstructor = (Razorpay as any).default || Razorpay;
      
      const rzp = new RazorpayConstructor({
        key_id: keyId,
        key_secret: keySecret
      });

      const order = await rzp.orders.create({
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      });
      
      console.log("-> Order created:", order.id);
      res.status(200).json({ ...order, key_id: keyId });
    } catch (err: any) {
      console.error("RAZORPAY ERR:", err);
      res.status(500).json({ error: err.message || "Gateway Error" });
    }
  });

  // Mount API
  app.use("/api", apiRouter);

  // 2. FRONTEND SERVING
  if (process.env.NODE_ENV !== "production") {
    console.log("STARTING VITE MIDDLEWARE (Dev Mode)");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error("Failed to initialize Vite middleware:", viteErr);
    }
  } else {
    console.log("STARTING STATIC SERVING (Prod Mode)");
    const distPath = path.resolve(process.cwd(), "dist");
    
    app.use(express.static(distPath, { index: false }));
    
    app.get("*", (req, res) => {
      // Don't fallback for missed API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found" });
      }
      
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Build production files first.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`>>> Express server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error("FAILED TO START SERVER:", err);
  process.exit(1);
});
