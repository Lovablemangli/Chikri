import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Boot-up check for keys
console.log("-----------------------------------------");
console.log("RAZORPAY CONFIG CHECK:");
console.log("Key ID Present:", !!process.env.VITE_RAZORPAY_KEY_ID);
console.log("Key Secret Present:", !!process.env.RAZORPAY_KEY_SECRET);
if (process.env.VITE_RAZORPAY_KEY_ID) {
  console.log("Key ID starts with:", process.env.VITE_RAZORPAY_KEY_ID.substring(0, 7));
}
console.log("-----------------------------------------");

// Initialize Razorpay
let razorpay: Razorpay | null = null;

function getRazorpay() {
  if (!razorpay) {
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keyId || !keySecret) {
      console.warn("Razorpay API keys are missing in environment variables.");
      return null;
    }
    
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpay;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Debug keys (safe check)
app.get("/api/debug-rzp", (req, res) => {
  res.json({
    hasKeyId: !!process.env.VITE_RAZORPAY_KEY_ID,
    hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
    keyIdPrefix: process.env.VITE_RAZORPAY_KEY_ID ? process.env.VITE_RAZORPAY_KEY_ID.substring(0, 7) : 'none',
    envKeys: Object.keys(process.env).filter(k => k.includes('RAZORPAY'))
  });
});

// Create Razorpay Order
app.post("/api/create-razorpay-order", async (req, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(500).json({ 
        error: "Razorpay keys not configured on server.",
        details: "VITE_RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing in environment."
      });
    }

    const { amount, currency = "INR" } = req.body;
    
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Invalid amount provided." });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);
    console.log("Razorpay Order Created:", order.id);
    res.json({
      ...order,
      key_id: process.env.VITE_RAZORPAY_KEY_ID
    });
  } catch (error: any) {
    console.error("FULL RAZORPAY ERROR:", {
      message: error.message,
      description: error.description,
      metadata: error.metadata,
      code: error.code,
      source: error.source
    });
    res.status(error.statusCode || 500).json({ 
      error: "Failed to create Razorpay order",
      details: error.description || error.message || "Unknown error from Razorpay"
    });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
