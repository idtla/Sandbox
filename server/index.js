import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import publicRoutes from './routes_public.js';
import adminRoutes from './routes_admin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet());
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Static files
app.use('/', express.static(path.join(__dirname, '..', 'client')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
