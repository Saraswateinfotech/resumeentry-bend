const express = require("express");
const { getFreelancerDetails, editFreelancerDetails, toggleFreelancerStatus, getAllFreelancers, updateCurrentResumeIdFreelancer, getCurrentResumeIdFreelancer } = require("../controllers/freelancerController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// Route to fetch all freelancer details
router.get("/:freelancer_id/details", authMiddleware, getFreelancerDetails);
// Route to edit freelancer details
router.put("/:freelancer_id/edit", authMiddleware, editFreelancerDetails);
// Route to activate or deactivate freelancer
router.put("/:freelancer_id/status", toggleFreelancerStatus);

router.get("/", authMiddleware, getAllFreelancers);
// Route to update current resume ID of a freelancer
router.put("/updateFreelancerResume/:freelancer_id", authMiddleware, updateCurrentResumeIdFreelancer);
// Route to get current resume ID of a freelancer
router.get("/getFreelancerResume/:freelancer_id", authMiddleware, getCurrentResumeIdFreelancer);

module.exports = router;
