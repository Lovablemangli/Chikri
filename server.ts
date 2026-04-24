import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";

const app = express();
const PORT = 3000;

app.use(express.json());

// Global Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Boot-up Debugging
console.log("-----------------------------------------");
console.log("SERVER STARTING...");
console.log("RAZORPAY_KEY_ID exists:", !!process.env.VITE_RAZORPAY_KEY_ID);
console.log("RAZORPAY_KEY_SECRET exists:", !!process.env.RAZORPAY_KEY_SECRET);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("-----------------------------------------");

// 1. Health Route (non-api prefix to test)
app.get("/healthz", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    keys: {
      id: !!process.env.VITE_RAZORPAY_KEY_ID,
      secret: !!process.env.RAZORPAY_KEY_SECRET
    }
  });
});

// 2. Main Payment API
app.post("/backend/create-order", async (req, res) => {
  console.log("[PAYMENT] Create order request received");
  
  const keyId = process.env.VITE_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error("[ERROR] Missing Razorpay keys");
    return res.status(500).json({ 
      error: "Razorpay credentials not found in environment.",
      hint: "Make sure VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in Store Secrets."
    });
  }

  try {
    const { amount } = req.body;
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const RazorpayClass = (Razorpay as any).default || Razorpay;
    const rzp = new RazorpayClass({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount: Math.round(Number(amount) * 100), // convert to paise
      currency: "INR",
      receipt: `order_rcpt_${Date.now()}`
    });

    console.log("[SUCCESS] Razorpay order created:", order.id);
    res.json({ ...order, key_id: keyId });
  } catch (err: any) {
    console.error("[RZP ERROR]", err);
    res.status(500).json({ 
      error: "Razorpay order creation failed", 
      details: err.message || "Unknown error" 
    });
  }
});

// 3. Fallback for /backend to ensure JSON response
app.all("/backend/*", (req, res) => {
  res.status(404).json({ error: "Backend route not found", path: req.path });
});

// 4. Vite / SPA Logic
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built files
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server is listening on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FAILED TO BOOT SERVER:", err);
});
