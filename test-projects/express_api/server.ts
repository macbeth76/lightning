import express, { Router } from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const pool = new Pool();
const router = Router();

app.use(cors());
app.use(express.json());

router.post('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2)',
      [req.body.name, req.body.email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [
      req.params.id,
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.use('/api', router);
export default app;
