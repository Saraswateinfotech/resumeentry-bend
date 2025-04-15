const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Google Drive configuration
const KEYFILE_PATH = path.join(__dirname, "./upload-resume-445409-c356f80a515d.json"); // Path to your service account key file
const SCOPES = ["https://www.googleapis.com/auth/drive"];
const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILE_PATH,
  scopes: SCOPES,
});
const drive = google.drive({ version: "v3", auth });

// Multer storage for temporary uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join("/tmp", "temp"); // Use /tmp for temporary uploads
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2 GB
    files: 2000,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});

// Function to upload a file to Google Drive
const uploadToDrive = async (filePath, fileName) => {
  const fileMetadata = {
    name: fileName,
    parents: ["1CzplTwzqGgS8_AtXVDXdpwk1vTM-9DYJ"], // Replace with your Google Drive folder ID
  };

  const media = {
    mimeType: "application/pdf",
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id",
  });

  return response.data.id; // Return the file ID from Google Drive
};

// Export the `upload` and `uploadToDrive` functions
module.exports = { upload, drive, uploadToDrive };
