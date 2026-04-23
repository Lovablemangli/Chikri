import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

// Razorpay Instance Helper
let razorpay: Razorpay | null = null;
function getRazorpay() {
  if (!razorpay) {
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
  }
  return razorpay;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Simple Health Check
  app.get("/api/ping", (req, res) => res.json({ status: "alive" }));

  // 2. Razorpay Order Creation
  app.post("/api/create-razorpay-order", async (req, res) => {
    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(500).json({ error: "Razorpay keys not found in Store Secrets." });
    }

    try {
      const { amount } = req.body;
      const order = await rzp.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      });
      
      // Send both order and key_id back
      res.json({
        ...order,
        key_id: process.env.VITE_RAZORPAY_KEY_ID
      });
    } catch (error: any) {
      console.error("Razorpay Error:", error);
      res.status(500).json({ error: error.message || "Failed to create Razorpay order" });
    }
  });

  // 3. Vite / Static Files
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
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
