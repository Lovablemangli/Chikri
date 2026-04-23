import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Create Razorpay Order
app.post("/api/create-razorpay-order", async (req, res) => {
  const rzp = getRazorpay();
  if (!rzp) {
    return res.status(500).json({ error: "Razorpay keys not configured." });
  }

  const { amount, currency = "INR" } = req.body;

  try {
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    res.status(500).json({ error: "Failed to create Razorpay order" });
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
