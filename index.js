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
  "https://resumesentry-frontend.vercel.app",
  "https://resumesentry-admin-dashboard-two.vercel.app"
];

// CORS options with dynamic origin handling
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or file:// protocol)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS from origin: " + origin));
    }
  },
  credentials: true, // Allow cookies and credentials
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

// Apply the CORS middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); 


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
