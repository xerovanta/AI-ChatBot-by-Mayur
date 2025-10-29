import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mainRouter from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ 1. Enable CORS for both local and deployed frontend
app.use(
   cors({
      origin: [
         'http://localhost:5173', // local Vite frontend
         // Add your deployed frontend origin(s) here. Example(s):
         'https://ai-chatbot-by-mayur.vercel.app', // possible Vercel frontend (older name)
         'https://ai-chat-bot-by-mayur-client.vercel.app', // common Vercel preview/alias
      ],
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
   })
);
// Preflight handled by global CORS middleware above; explicit app.options removed

// ✅ 2. Enable JSON parsing
app.use(express.json());

// Lightweight request logger to help debugging deployed requests (prints method, url, ip)
app.use((req, res, next) => {
   try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      console.log(
         `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ip=${ip}`
      );
   } catch (e) {}
   next();
});

// Health endpoint for deployment checks
app.get('/health', (_req, res) => {
   res.json({ status: 'ok', uptime: process.uptime() });
});

// ✅ 3. Use your main routes
app.use('/', mainRouter);

// ✅ 4. Start the server
app.listen(port, () => {
   console.log(`🚀 Server is running on http://localhost:${port}`);
});
