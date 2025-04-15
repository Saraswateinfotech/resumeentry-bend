const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require("./src/routes/authRoutes");
const resumeRoutes = require("./src/routes/resumeRoutes");
const freelancerRoutes = require("./src/routes/freelancerRoutes");

console.log('hi there!');

const app = express();

// Allow requests from specific frontend URLs
const allowedOrigins = [
  "https://resumesentry-frontend.vercel.app",
  "https://resumesentry-admin-dashboard-two.vercel.app"
];

// CORS options with dynamic origin handling
const corsOptionsDelegate = function (req, callback) {
  const origin = req.header('Origin');
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
  } else {
    callback(new Error("Not allowed by CORS from origin: " + origin), null);
  }
};

// Apply the CORS middleware before anything else
app.use(cors(corsOptionsDelegate));
app.options("*", cors(corsOptionsDelegate)); // handle preflight

app.use(bodyParser.json());
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));

app.use("/auth", authRoutes);
app.use("/resumes", resumeRoutes);
app.use("/freelancer", freelancerRoutes);

app.get('/', (req, res) => {
  res.send('Hello from Node API Server Updated');
});

const PORT = process.env.PORT || 3500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
