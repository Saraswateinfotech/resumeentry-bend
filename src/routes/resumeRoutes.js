const express = require("express");
const {
  getAllResumes,
  saveResumeData,
  getSubmittedResumes,
  getSubmittedResume,
  getSavedResumes,
  getRejectedResumes,
  bulkUploadResumes,
  downloadResume,
  getResumeStats,
  getAllSubmittedResumes,
  updateResumeStatus,
  reassignResume,
  saveOrUpdateBankDetails,
  getBankDetails,
  uploadAadharCard,
  uploadAddressCard,
  downloadAadharCard,
  updateApprovalStatusAndDeleteDocument,
  updateResumeData,
  GetResumeReportForAdmin,
  GetUserPaymentReport,
  downloadAddressCard,
  downloadAddressId,
} = require("../controllers/resumeController");
const authMiddleware = require("../middleware/authMiddleware");
const { upload } = require("../config/multer");
const router = express.Router();

router.post("/save", authMiddleware, saveResumeData);

router.post("/updateResumeData", authMiddleware, updateResumeData);
// Get all resumes
router.get("/all", getAllResumes);

// Get submitted resumes for a specific freelancer
router.get("/submitted/:freelancer_id", authMiddleware, getSubmittedResumes);

// Get saved resumes for a specific freelancer
router.get("/saved/:freelancer_id", authMiddleware, getSavedResumes);

// Get rejected resumes for a specific freelancer
router.get("/rejected/:freelancer_id", authMiddleware, getRejectedResumes);
// Bulk upload endpoint
router.post("/bulk-upload", upload.array("resumes", 100), bulkUploadResumes);
// Download resume endpoint
router.get("/download/:resume_id", downloadResume);
// Route to get a specific submitted resume by resume_id and freelancer_id
router.get("/submitted/:resume_id/:freelancer_id", getSubmittedResume);
// API to call the stored procedure and get resume statistics
router.post("/getResumeStats", authMiddleware, getResumeStats);

router.get("/getAllCompletedResumes", authMiddleware, getAllSubmittedResumes);

router.post("/updateResumeStatus", authMiddleware, updateResumeStatus);

router.post("/reassignResume", authMiddleware, reassignResume);

router.post("/saveOrUpdateBankDetails", authMiddleware, saveOrUpdateBankDetails);

router.get("/getBankDetails/:freelancer_id", authMiddleware, getBankDetails);

router.post("/uploadAadharCard/:freelancer_id", upload.array("document", 10), uploadAadharCard);

router.post("/uploadAddressCard/:freelancer_id", upload.array("document", 10), uploadAddressCard);

router.get("/downloadAadharCard/:freelancer_id", downloadAadharCard);

router.get("/downloadAddressCard/:freelancer_id", downloadAddressId);

router.post("/updateApprovalStatus", authMiddleware, updateApprovalStatusAndDeleteDocument);
// API to call the stored procedure and get resume statistics
router.get("/GetResumeReportForAdmin", authMiddleware, GetResumeReportForAdmin);

router.get("/GetUserPaymentReport", authMiddleware , GetUserPaymentReport);

module.exports = router;
