import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { initializeDatabase } from "./database";
import path from "path";

const app = express();
const port = 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

// Initialize database before starting the server
initializeDatabase().then(() => {
  // Register routes
  registerRoutes(app);

  // Start server
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  }).on('error', (err: any) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}).catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exit(1);
});
