import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health.routes';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/', healthRouter);

app.listen(port, () => {
  console.log(`[server]: CareFlow Backend running at http://localhost:${port}`);
});

export default app;
