import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';

import {
   handleChatRequest,
   handleResetRequest,
} from './controllers/chat.controllers'; // <-- Fixed the filename here (plural 's')

dotenv.config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
   res.send('Hello World !');
});

app.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello World !' });
});

// --- API Routes ---
app.post('/api/chat', handleChatRequest);
app.post('/api/reset', handleResetRequest);

// --- Start Server ---
app.listen(port, () => {
   console.log(`🚀 Server is running on http://localhost:${port}`);
});
