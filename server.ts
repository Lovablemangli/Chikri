import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// 1. Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Boot-up check
console.log("-----------------------------------------");
console.log("RAZORPAY CONFIG CHECK (SERVER BOOT):");
console.log("Key ID Present:", !!process.env.VITE_RAZORPAY_KEY_ID);
console.log("Key Secret Present:", !!process.env.RAZORPAY_KEY_SECRET);
console.log("-----------------------------------------");

// Initialize Razorpay logic
let razorpay: Razorpay | null = null;
function getRazorpay() {
  if (!razorpay) {
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpay;
}

// 2. API ROUTES (Explicitly defined before Vite/Static)
const api = express.Router();

api.get("/health", (req, res) => res.json({ status: "ok" }));

api.get("/debug-rzp", (req, res) => {
  res.json({
    hasKeyId: !!process.env.VITE_RAZORPAY_KEY_ID,
    hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
    keyIdPrefix: process.env.VITE_RAZORPAY_KEY_ID ? process.env.VITE_RAZORPAY_KEY_ID.substring(0, 7) : 'none',
    timestamp: new Date().toISOString()
  });
});

api.post("/create-razorpay-order", async (req, res) => {
  try {
    const rzp = getRazorpay();
    if (!rzp) {
      return res.status(500).json({ error: "Razorpay keys not configured." });
    }

    const { amount, currency = "INR" } = req.body;
    const options = {
      amount: Math.round(amount * 100),
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await rzp.orders.create(options);
    res.json({ ...order, key_id: process.env.VITE_RAZORPAY_KEY_ID });
  } catch (error: any) {
    console.error("Razorpay Error:", error);
    res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

// Mount API
app.use("/api", api);

// 3. API 404 Guard (Stop HTML fallback for /api requests)
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

// 4. Vite/Static Fallback
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
