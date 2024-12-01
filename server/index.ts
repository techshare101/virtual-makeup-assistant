import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { initializeDatabase } from "./database";
import path from "path";

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

// Initialize database before starting the server
initializeDatabase().then(() => {
  // Register routes
  registerRoutes(app);

  // Start server with retry logic
  const startServer = (retryPort = port) => {
    const server = app.listen(retryPort)
      .on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${retryPort} is busy, trying ${retryPort + 1}...`);
          startServer(retryPort + 1);
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      })
      .on('listening', () => {
        console.log(`Server is running on port ${retryPort}`);
      });
  };

  startServer();
}).catch((error) => {
  console.error("Failed to initialize database:", error);
  process.exit(1);
});
