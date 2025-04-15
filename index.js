const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require("./src/routes/authRoutes");
const resumeRoutes = require("./src/routes/resumeRoutes");
const freelancerRoutes = require("./src/routes/freelancerRoutes");

console.log('hi there!');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ limit: '2gb', extended: true }));

app.use("/auth", authRoutes);
app.use("/resumes", resumeRoutes);
app.use("/freelancer", freelancerRoutes)

app.get('/', (req, res) => {
    res.send('Hello from Node API Server Updated');
});

const PORT = process.env.PORT || 3500;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
