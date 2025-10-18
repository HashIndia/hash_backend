// Simple backend test
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins in development
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() });
});

app.get('/api/products', (req, res) => {
  res.json({ products: [], message: 'Products endpoint working' });
});

app.listen(PORT, () => {
  console.log(`✅ Test server running on port ${PORT}`);
  console.log(`🌐 Test endpoint: http://localhost:${PORT}/api/test`);
});
