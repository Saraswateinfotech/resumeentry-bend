const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require("./src/routes/authRoutes");
const resumeRoutes = require("./src/routes/resumeRoutes");
const freelancerRoutes = require("./src/routes/freelancerRoutes");

console.log('hi there!');

const app = express();

// Allow requests from multiple frontend URLs
const allowedOrigins = [
  "resumesentry-admin-dashboard-two.vercel.app",
  "resumesentry-frontend.vercel.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
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
