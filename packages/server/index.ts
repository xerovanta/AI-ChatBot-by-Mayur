import express from 'express';
import dotenv from 'dotenv';

// Import your new router from routes.ts
import mainRouter from './routes';

dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

app.use('/', mainRouter);

// --- Start Server ---
app.listen(port, () => {
   console.log(`🚀 Server is running on http://localhost:${port}`);
});
