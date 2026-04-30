import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(">>> SERVER.TS ENTRY POINT REACHED <<<");

async function start() {
  console.log(">>> STARTING EXPRESS INITIALIZATION <<<");
  const app = express();
  const PORT = process.env.PORT || 3000;

  // 0. HEALTH CHECK (Absolute Priority)
  app.get("/health-check", (req, res) => {
    console.log(">>> RECEIVED /health-check REQUEST <<<");
    res.json({ 
      ok: true, 
      msg: "Server is alive and responding", 
      timestamp: new Date().toISOString(),
      node: process.version,
      pid: process.pid
    });
  });

  // 1. DIAGNOSTICS & GLOBAL MIDDLEWARE
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use((req, res, next) => {
    // Log every request that hits the server
    console.log(`[SERVER] ${req.method} ${req.path} - ${new Date().toISOString()}`);
    // Set diagnostic headers on ALL responses
    res.setHeader('X-Express-Server', 'v7-diagnostic');
    res.setHeader('X-Debug-Node-Env', process.env.NODE_ENV || 'unset');
    next();
  });

  // 1. API ROUTES
  const apiRouter = express.Router();

  apiRouter.get("/health", (req, res) => {
    console.log("-> API: health check");
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      hasRazorpay: !!(process.env.VITE_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    });
  });

  apiRouter.post("/create-order", async (req, res) => {
    console.log("-> API: create-order request received");
    console.log("-> Body:", JSON.stringify(req.body));
    
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("CRITICAL: Razorpay credentials missing");
      return res.status(500).json({ 
        error: "Razorpay credentials not configured", 
        details: "Check your Environment Secrets/Variables" 
      });
    }

    try {
      const { amount } = req.body;
      if (!amount) {
        console.warn("-> Missing amount in request");
        return res.status(400).json({ error: "Amount required" });
      }

      console.log("-> Initializing Razorpay with amount:", amount);
      // Dynamic import for Razorpay
      const { default: Razorpay } = await import("razorpay");
      
      // Handle the constructor correctly for commonjs/esm interop
      const RZP = (Razorpay as any).default || Razorpay;
      const rzp = new RZP({
        key_id: keyId,
        key_secret: keySecret
      });

      console.log("-> Creating Razorpay order...");
      const order = await rzp.orders.create({
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      });
      
      console.log("-> Order successfully created:", order.id);
      res.status(200).json({ ...order, key_id: keyId });
    } catch (err: any) {
      console.error("RAZORPAY ERROR DETAILS:", err);
      res.status(500).json({ 
        error: err.message || "Gateway Error",
        details: err.description || "Check gateway integration"
      });
    }
  });

  // Add a catch-all for /api routes to prevent HTML fallback for missed API endpoints
  apiRouter.all("*", (req, res) => {
    console.warn(`[WARN] Missed API Endpoint: ${req.method} ${req.path}`);
    res.status(404).json({ 
      error: "API Endpoint not found", 
      method: req.method, 
      path: req.path 
    });
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
      // Safety check for missed API routes in GET fallback (though apiRouter should catch them)
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
