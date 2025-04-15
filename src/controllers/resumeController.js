const db = require("../config/db");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { uploadToDrive, drive } = require("../config/multer");

// Get All Resumes
exports.getAllResumes = (req, res) => {
  const sql = "SELECT * FROM Resumes";
  db.query(sql, (err, results) => {
    if (err)
      return res.status(500).json({ error: "Database error", details: err });
    res.status(200).json(results);
  });
};

// Get Submitted Resumes for a Freelancer
exports.getSubmittedResumes = (req, res) => {
  const { freelancer_id } = req.params; // Extract freelancer_id from URL params

  const sql = `
      SELECT sr.*, r.resume_name, r.resume_pdf_path 
      FROM SubmittedResumes sr
      INNER JOIN Resumes r ON sr.resume_id = r.resume_id
      WHERE sr.freelancer_id = ? AND (sr.status = 'Submitted' OR sr.status = 'Auto Submitted')
  `;

  db.query(sql, [freelancer_id, freelancer_id], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Database error", details: err });
    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No submitted resumes found for this freelancer" });
    }
    res.status(200).json(results);
  });
};

// Get Saved Resumes for a Freelancer
exports.getSavedResumes = (req, res) => {
  const { freelancer_id } = req.params; // Extract freelancer_id from URL params

  const sql = `
      SELECT sr.*, r.resume_name, r.resume_pdf_path 
      FROM SubmittedResumes sr
      INNER JOIN Resumes r ON sr.resume_id = r.resume_id
      WHERE sr.freelancer_id = ? AND (sr.status = 'Saved' OR sr.status = 'Auto Saved')
  `;

  db.query(sql, [freelancer_id], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Database error", details: err });
    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No saved resumes found for this freelancer" });
    }
    res.status(200).json(results);
  });
};

// Get Rejected Resumes for a Freelancer
exports.getRejectedResumes = (req, res) => {
  const { freelancer_id } = req.params; // Extract freelancer_id from URL params

  const sql = `
      SELECT sr.*, r.resume_name, r.resume_pdf_path 
      FROM SubmittedResumes sr
      INNER JOIN Resumes r ON sr.resume_id = r.resume_id
      WHERE sr.freelancer_id = ? AND sr.status = 'Rejected'
  `;

  db.query(sql, [freelancer_id], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Database error", details: err });
    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No rejected resumes found for this freelancer" });
    }
    res.status(200).json(results);
  });
};

// Bulk upload resumes
// exports.bulkUploadResumes = async (req, res) => {
//   if (!req.files || req.files.length === 0) {
//     return res.status(400).json({ error: "No files uploaded" });
//   }

//   console.log("I'm triggered!")

//   const resumes = [];
//   try {
//     for (const file of req.files) {
//       // Upload to Google Drive
//       const driveFileId = await uploadToDrive(file.path, file.originalname);

//       // Add resume metadata
//       resumes.push({
//         resume_name: file.originalname,
//         resume_pdf_path: driveFileId, // Save Google Drive file ID
//         uploaded_by: "", // Replace with the actual admin ID
//       });

//       // Delete the local file after upload
//       fs.unlinkSync(file.path);
//     }

//     // Insert metadata into the database
//     const sql = `INSERT INTO Resumes (resume_name, resume_pdf_path, uploaded_by) VALUES ?`;
//     const values = resumes.map((resume) => [
//       resume.resume_name,
//       resume.resume_pdf_path,
//       resume.uploaded_by,
//     ]);
//     db.query(sql, [values], (err, result) => {
//       if (err)
//         return res.status(500).json({ error: "Database error", details: err });

//       res.status(200).json({
//         message: "Resumes uploaded successfully",
//         uploaded_count: result.affectedRows,
//       });
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Upload failed", details: error.message });
//   }
// };

//Bulk upload resumes


function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

exports.bulkUploadResumes = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  console.log("Bulk upload triggered!");
  console.log(`Total files received: ${req.files.length}`);

  const CHUNK_SIZE = 5; // Number of files to process in each batch
  const fileChunks = chunkArray(req.files, CHUNK_SIZE);
  const allResumes = [];

  try {
    // Process each chunk of files in sequence
    for (const chunk of fileChunks) {
      console.log(`Processing batch of ${chunk.length} file(s)...`);

      // Upload all files in this chunk in parallel
      const uploadedFiles = await Promise.all(
        chunk.map(async (file) => {
          try {
            // Upload file to Google Drive
            const driveFileId = await uploadToDrive(file.path, file.originalname);

            // Prepare resume metadata
            const resumeData = {
              resume_name: file.originalname,
              resume_pdf_path: driveFileId,
              uploaded_by: "", // Fill with actual admin ID or relevant user
            };

            // Delete file from local storage after successful upload
            fs.unlink(file.path, (err) => {
              if (err) {
                console.error(`Error deleting file '${file.originalname}':`, err);
              }
            });

            return resumeData;
          } catch (err) {
            console.error(`Error uploading file '${file.originalname}':`, err);
            return null;
          }
        })
      );

      // Filter out any failed uploads
      const successful = uploadedFiles.filter((item) => item !== null);
      if (successful.length === 0) {
        console.log("No successful uploads in this batch.");
        continue;
      }

      // Insert successful metadata into database
      const insertQuery = `INSERT INTO Resumes (resume_name, resume_pdf_path, uploaded_by) VALUES ?`;
      const values = successful.map(({ resume_name, resume_pdf_path, uploaded_by }) => [
        resume_name,
        resume_pdf_path,
        uploaded_by,
      ]);

      await new Promise((resolve, reject) => {
        db.query(insertQuery, [values], (err, result) => {
          if (err) {
            console.error("Database error:", err);
            return reject(err);
          }
          console.log(`Inserted ${result.affectedRows} records into the database.`);
          resolve();
        });
      });

      // Accumulate all successful uploads for final response
      allResumes.push(...successful);
    }

    res.status(200).json({
      message: "Resumes uploaded successfully",
      uploaded_count: allResumes.length,
    });
  } catch (error) {
    console.error("Bulk upload failed:", error);
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
};

// exports.uploadAadharCard = async (req, res) => {
//   const { freelancer_id } = req.params; // Extract freelancer_id from the request

//   if (!freelancer_id) {
//     return res.status(400).json({ error: "Freelancer ID is required" });
//   }

//   if (!req.files || req.files.length === 0) {
//     return res.status(400).json({ error: "No files uploaded" });
//   }

//   try {
//     // Upload the file to Google Drive
//     const driveFileId = await uploadToDrive(req.files[0].path, req.files[0].originalname);

//     // Check if FreelancerDetails already exists for this freelancer_id
//     const checkQuery = `SELECT * FROM FreelancerDetails WHERE freelancer_id = ?`;

//     db.query(checkQuery, [freelancer_id], (err, results) => {
//       if (err) {
//         console.error("Database error:", err);
//         fs.unlinkSync(req.files[0].path); // Delete the local file
//         return res.status(500).json({ error: "Database error", details: err });
//       }

//       if (results.length > 0) {
//         // Entry exists, perform an update
//         const updateQuery = `
//             UPDATE FreelancerDetails 
//             SET document_file_path = ?
//             WHERE freelancer_id = ?
//           `;

//         db.query(updateQuery, [driveFileId, freelancer_id], (err, result) => {
//           if (err) {
//             console.error("Error updating FreelancerDetails:", err);
//             fs.unlinkSync(req.files[0].path); // Delete the local file
//             return res.status(500).json({ error: "Error updating freelancer details", details: err });
//           }

//           // Delete the local file after successful upload and DB update
//           fs.unlinkSync(req.files[0].path);

//           res.status(200).json({ message: "Aadhaar card updated successfully" });
//         });
//       } else {
//         // Entry does not exist, perform an insert
//         const insertQuery = `
//             INSERT INTO FreelancerDetails (
//               freelancer_id,
//               document_file_path
//             ) VALUES (?, ?)
//           `;

//         db.query(insertQuery, [freelancer_id, driveFileId], (err, result) => {
//           if (err) {
//             console.error("Error inserting into FreelancerDetails:", err);
//             fs.unlinkSync(req.files[0].path); // Delete the local file
//             return res.status(500).json({ error: "Error saving freelancer details", details: err });
//           }

//           // Delete the local file after successful upload and DB insert
//           fs.unlinkSync(req.files[0].path);

//           res.status(201).json({ message: "Aadhaar card uploaded successfully" });
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Upload failed:", error);
//     fs.unlinkSync(req.files[0].path); // Delete the local file in case of error
//     res.status(500).json({ error: "Upload failed", details: error.message });
//   }
// };


exports.uploadAadharCard = async (req, res) => {
  console.log(req)
  const { freelancer_id } = req.params; // Extract freelancer_id from the request

  const { idProofType } = req.body; // Extract idProofType from the request body

  if (!freelancer_id) {
    return res.status(400).json({ error: "Freelancer ID is required" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  if (!idProofType) {
    return res.status(400).json({ error: "ID Proof Type is required" });
  }

  console.log(req.body.idProofType)

  try {
    // Upload the file to Google Drive
    const driveFileId = await uploadToDrive(req.files[0].path, req.files[0].originalname);

    // Check if FreelancerDetails already exists for this freelancer_id
    const checkQuery = `SELECT * FROM FreelancerDetails WHERE freelancer_id = ?`;

    db.query(checkQuery, [freelancer_id], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        fs.unlinkSync(req.files[0].path); // Delete the local file
        return res.status(500).json({ error: "Database error", details: err });
      }

      if (results.length > 0) {
        // Entry exists, perform an update
        const updateQuery = `
            UPDATE FreelancerDetails 
            SET document_file_path = ?, idType = ?
            WHERE freelancer_id = ?
          `;

        db.query(updateQuery, [driveFileId, idProofType , freelancer_id], (err, result) => {
          if (err) {
            console.error("Error updating FreelancerDetails:", err);
            fs.unlinkSync(req.files[0].path); // Delete the local file
            return res.status(500).json({ error: "Error updating freelancer details", details: err });
          }

          // Delete the local file after successful upload and DB update
          fs.unlinkSync(req.files[0].path);

          res.status(200).json({ message: "Aadhaar card updated successfully" });
        });
      } else {
        // Entry does not exist, perform an insert
        const insertQuery = `
            INSERT INTO FreelancerDetails (
              freelancer_id,
              document_file_path,
              idType
            ) VALUES (?, ?, ?)
          `;

        db.query(insertQuery, [freelancer_id, driveFileId, idProofType], (err, result) => {
          if (err) {
            console.error("Error inserting into FreelancerDetails:", err);
            fs.unlinkSync(req.files[0].path); // Delete the local file
            return res.status(500).json({ error: "Error saving freelancer details", details: err });
          }

          // Delete the local file after successful upload and DB insert
          fs.unlinkSync(req.files[0].path);

          res.status(201).json({ message: "Aadhaar card uploaded successfully" });
        });
      }
    });
  } catch (error) {
    console.error("Upload failed:", error);
    fs.unlinkSync(req.files[0].path); // Delete the local file in case of error
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
};


exports.uploadAddressCard = async (req, res) => {
  console.log(req)
  const { freelancer_id } = req.params; // Extract freelancer_id from the request

  const { addresstype } = req.body; // Extract idProofType from the request body

  if (!freelancer_id) {
    return res.status(400).json({ error: "Freelancer ID is required" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded" });
  }

  if (!addresstype) {
    return res.status(400).json({ error: "ID address Type is required" });
  }

  console.log(req.body.addresstype)

  try {
    // Upload the file to Google Drive
    const driveFileId = await uploadToDrive(req.files[0].path, req.files[0].originalname);

    // Check if FreelancerDetails already exists for this freelancer_id
    const checkQuery = `SELECT * FROM FreelancerDetails WHERE freelancer_id = ?`;

    db.query(checkQuery, [freelancer_id], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        fs.unlinkSync(req.files[0].path); // Delete the local file
        return res.status(500).json({ error: "Database error", details: err });
      }

      if (results.length > 0) {
        // Entry exists, perform an update
        const updateQuery = `
            UPDATE FreelancerDetails 
            SET address_proof_file_path = ?, addresstype = ?
            WHERE freelancer_id = ?
          `;

        db.query(updateQuery, [driveFileId, addresstype , freelancer_id], (err, result) => {
          if (err) {
            console.error("Error updating FreelancerDetails:", err);
            fs.unlinkSync(req.files[0].path); // Delete the local file
            return res.status(500).json({ error: "Error updating freelancer details", details: err });
          }

          // Delete the local file after successful upload and DB update
          fs.unlinkSync(req.files[0].path);

          res.status(200).json({ message: "Address id card updated successfully" });
        });
      } else {
        // Entry does not exist, perform an insert
        const insertQuery = `
            INSERT INTO FreelancerDetails (
              freelancer_id,
              address_proof_file_path,
              addresstype
            ) VALUES (?, ?, ?)
          `;

        db.query(insertQuery, [freelancer_id, driveFileId, addresstype], (err, result) => {
          if (err) {
            console.error("Error inserting into FreelancerDetails:", err);
            fs.unlinkSync(req.files[0].path); // Delete the local file
            return res.status(500).json({ error: "Error saving freelancer details", details: err });
          }

          // Delete the local file after successful upload and DB insert
          fs.unlinkSync(req.files[0].path);

          res.status(201).json({ message: "Address id card uploaded successfully" });
        });
      }
    });
  } catch (error) {
    console.error("Upload failed:", error);
    fs.unlinkSync(req.files[0].path); // Delete the local file in case of error
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
};

// Download resume
exports.downloadResume = async (req, res) => {
  const { resume_id } = req.params;

  // Fetch resume details from the database
  const sql = `SELECT resume_name, resume_pdf_path FROM Resumes WHERE resume_id = ?`;
  db.query(sql, [resume_id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const { resume_name, resume_pdf_path: fileId } = results[0];

    try {
      const driveResponse = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      // Set headers for inline display in the browser
      res.setHeader("Content-Type", "application/pdf"); // Set the content type to PDF
      res.setHeader("Content-Disposition", `inline; filename="${resume_name}"`);

      // Pipe the file stream to the response
      driveResponse.data.pipe(res);
    } catch (error) {
      res.status(500).json({
        error: "Failed to download resume",
        details: error.message,
      });
    }
  });
};

exports.saveResumeData = (req, res) => {
  const {
    resume_id,
    freelancer_id,
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    nationality,
    marital_status,
    passport,
    hobbies,
    languages_known,
    address,
    landmark,
    city,
    state,
    pincode,
    mobile,
    email,
    ssc_result,
    ssc_board,
    ssc_year_of_passing,
    hsc_result,
    hsc_board,
    hsc_year_of_passing,
    graduation_degree,
    graduation_result,
    graduation_university,
    graduation_year_of_passing,
    post_graduation_degree,
    post_graduation_result,
    post_graduation_university,
    post_graduation_year_of_passing,
    higher_education_qualification,
    total_work_experience_months,
    number_of_companies_worked,
    last_employer,
    status,
  } = req.body;

  // Helper function to handle null or undefined values
  const getValueOrNull = (value) => {
    return value === undefined || value === '' ? null : value;
  };

  const values = [
    getValueOrNull(resume_id),
    getValueOrNull(freelancer_id),
    getValueOrNull(first_name),
    getValueOrNull(middle_name),
    getValueOrNull(last_name),
    getValueOrNull(date_of_birth),
    getValueOrNull(gender),
    getValueOrNull(nationality),
    getValueOrNull(marital_status),
    getValueOrNull(passport),
    getValueOrNull(hobbies),
    getValueOrNull(languages_known),
    getValueOrNull(address),
    getValueOrNull(landmark),
    getValueOrNull(city),
    getValueOrNull(state),
    getValueOrNull(pincode),
    getValueOrNull(mobile),
    getValueOrNull(email),
    getValueOrNull(ssc_result),
    getValueOrNull(ssc_board),
    getValueOrNull(ssc_year_of_passing),
    getValueOrNull(hsc_result),
    getValueOrNull(hsc_board),
    getValueOrNull(hsc_year_of_passing),
    getValueOrNull(graduation_degree),
    getValueOrNull(graduation_result),
    getValueOrNull(graduation_university),
    getValueOrNull(graduation_year_of_passing),
    getValueOrNull(post_graduation_degree),
    getValueOrNull(post_graduation_result),
    getValueOrNull(post_graduation_university),
    getValueOrNull(post_graduation_year_of_passing),
    getValueOrNull(higher_education_qualification),
    getValueOrNull(total_work_experience_months),
    getValueOrNull(number_of_companies_worked),
    getValueOrNull(last_employer),
    getValueOrNull(status),
  ];

  // If the record doesn't exist, insert a new one
  const insertSql = `
    INSERT INTO SubmittedResumes (
      resume_id, freelancer_id, first_name, middle_name, last_name, 
      date_of_birth, gender, nationality, marital_status, passport, hobbies, 
      languages_known, address, landmark, city, state, pincode, mobile, email, 
      ssc_result, ssc_board, ssc_year_of_passing, hsc_result, hsc_board, 
      hsc_year_of_passing, graduation_degree, graduation_result, 
      graduation_university, graduation_year_of_passing, post_graduation_degree, 
      post_graduation_result, post_graduation_university, 
      post_graduation_year_of_passing, higher_education_qualification, 
      total_work_experience_months, number_of_companies_worked, last_employer, 
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(insertSql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Error inserting resume data", details: err });
    }
    res.status(201).json({ message: "Resume data saved successfully", result });
  });
};


exports.updateResumeData = (req, res) => {
  const {
    submission_id,
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    nationality,
    marital_status,
    passport,
    hobbies,
    languages_known,
    address,
    landmark,
    city,
    state,
    pincode,
    mobile,
    email,
    ssc_result,
    ssc_board,
    ssc_year_of_passing,
    hsc_result,
    hsc_board,
    hsc_year_of_passing,
    graduation_degree,
    graduation_result,
    graduation_university,
    graduation_year_of_passing,
    post_graduation_degree,
    post_graduation_result,
    post_graduation_university,
    post_graduation_year_of_passing,
    higher_education_qualification,
    total_work_experience_months,
    number_of_companies_worked,
    last_employer,
    status,
  } = req.body;

  // Helper function to handle null or undefined values
  const getValueOrNull = (value) => (value === undefined || value === "" ? null : value);

  const forUpdatevalues = [
    getValueOrNull(first_name),
    getValueOrNull(middle_name),
    getValueOrNull(last_name),
    getValueOrNull(date_of_birth),
    getValueOrNull(gender),
    getValueOrNull(nationality),
    getValueOrNull(marital_status),
    getValueOrNull(passport),
    getValueOrNull(hobbies),
    getValueOrNull(languages_known),
    getValueOrNull(address),
    getValueOrNull(landmark),
    getValueOrNull(city),
    getValueOrNull(state),
    getValueOrNull(pincode),
    getValueOrNull(mobile),
    getValueOrNull(email),
    getValueOrNull(ssc_result),
    getValueOrNull(ssc_board),
    getValueOrNull(ssc_year_of_passing),
    getValueOrNull(hsc_result),
    getValueOrNull(hsc_board),
    getValueOrNull(hsc_year_of_passing),
    getValueOrNull(graduation_degree),
    getValueOrNull(graduation_result),
    getValueOrNull(graduation_university),
    getValueOrNull(graduation_year_of_passing),
    getValueOrNull(post_graduation_degree),
    getValueOrNull(post_graduation_result),
    getValueOrNull(post_graduation_university),
    getValueOrNull(post_graduation_year_of_passing),
    getValueOrNull(higher_education_qualification),
    getValueOrNull(total_work_experience_months),
    getValueOrNull(number_of_companies_worked),
    getValueOrNull(last_employer),
    getValueOrNull(status),
    getValueOrNull(submission_id),
  ];

  // Check the current status of the submission
  const checkStatusSql = `SELECT status FROM SubmittedResumes WHERE submission_id = ?`;

  db.query(checkStatusSql, [submission_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error checking current status", details: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Submission ID not found" });
    }

    let currentStatus = results[0].status;

    // Apply the conditional status logic
    let updatedStatus = status;
    if (currentStatus === "Auto Saved") {
      if (status === "Submitted") {
        updatedStatus = "Auto Submitted";
      } else if (status === "Saved") {
        updatedStatus = "Auto Saved";
      }
    }

    // Update the resume data with the adjusted status
    const updateSql = `
      UPDATE SubmittedResumes 
      SET first_name = ?, middle_name = ?, last_name = ?, 
          date_of_birth = ?, gender = ?, nationality = ?, marital_status = ?, 
          passport = ?, hobbies = ?, languages_known = ?, address = ?, 
          landmark = ?, city = ?, state = ?, pincode = ?, mobile = ?, email = ?, 
          ssc_result = ?, ssc_board = ?, ssc_year_of_passing = ?, hsc_result = ?, 
          hsc_board = ?, hsc_year_of_passing = ?, graduation_degree = ?, 
          graduation_result = ?, graduation_university = ?, graduation_year_of_passing = ?, 
          post_graduation_degree = ?, post_graduation_result = ?, post_graduation_university = ?, 
          post_graduation_year_of_passing = ?, higher_education_qualification = ?, 
          total_work_experience_months = ?, number_of_companies_worked = ?, last_employer = ?, 
          status = ?
      WHERE submission_id = ?
    `;

    // Replace the status value in the update array
    forUpdatevalues[forUpdatevalues.length - 2] = updatedStatus;

    db.query(updateSql, forUpdatevalues, (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Error updating resume data", details: err });
      }
      res.status(200).json({ message: "Resume data updated successfully", result });
    });
  });
};




exports.getSubmittedResume = (req, res) => {
  const { resume_id, freelancer_id } = req.params; // Extract resume_id and freelancer_id from URL params

  // SQL query to fetch the row matching resume_id and freelancer_id
  const sql = `
      SELECT * 
      FROM SubmittedResumes 
      WHERE resume_id = ? AND freelancer_id = ?
  `;

  db.query(sql, [resume_id, freelancer_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "No matching resume found for the provided IDs" });
    }

    res.status(200).json({
      message: "Submitted resume fetched successfully",
      data: results[0], // Assuming only one record will match
    });
  });
};


exports.getResumeStats = (req, res) => {
  const { freelancerId } = req.body;  // Freelancer ID from request body

  // Call the stored procedure
  db.query('CALL GetResumeStatisticsByFreelancer(?)', [freelancerId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error executing stored procedure', details: err });
    }

    // Return the results of the procedure
    const stats = results[0][0]; // Result is in the first array (results[0])
    return res.json(stats);
  });
};


exports.GetResumeReportForAdmin = (req, res) => {
  // Call the stored procedure
  db.query('CALL GetResumeReportForAdmin()', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error executing stored procedure', details: err });
    }

    // Return the results of the procedure
    const stats = results[0][0]; // Result is in the first array (results[0])
    return res.json(stats);
  });
};

exports.GetUserPaymentReport = (req, res) => { 
  db.query('CALL GetTotalPaymentForSubmittedResumes()', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error executing stored procedure', details: err });
    }

    // Return the results of the procedure
    const userPayments = results[0]; // Result is in the first array (results[0])

    const formattedResults = userPayments.map(row => ({
      userid: row.userid,
      totalPayment: row.total_submitted_autosubmitted_accept
    }));
    
    // Return the formatted results
    return res.json(formattedResults);
  });
 };


// API endpoint to fetch submitted resumes
exports.getAllSubmittedResumes = (req, res) => {
  const query = `
    SELECT sr.*, f.name AS freelancer_name
    FROM SubmittedResumes sr
    INNER JOIN Freelancer f ON sr.freelancer_id = f.user_id 
    LIMIT 500
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching submitted resumes', details: err });
    }

    // Send the results back as JSON
    res.status(200).json({ submittedResumes: results });
  });
};



// API endpoint to update the status of a resume based on resume_id and freelancer_id
// exports.updateResumeStatus = (req, res) => {
//   const { submission_id, status } = req.body;

//   // Validate input
//   if (!submission_id || !status) {
//     return res.status(400).json({ error: "Missing required parameters" });
//   }

//   // SQL query to update the status
//   const query = `
//     UPDATE SubmittedResumes
//     SET status = ?
//     WHERE submission_id = ?
//   `;

//   db.query(query, [status, submission_id], (err, result) => {
//     if (err) {
//       return res
//         .status(500)
//         .json({ error: "Database error while updating status", details: err });
//     }

//     if (result.affectedRows > 0) {
//       res.status(200).json({
//         message: "Status updated successfully",
//         submission_id,
//         new_status: status,
//       });
//     } else {
//       res.status(404).json({
//         error: "Resume not found. Please check the submission ID.",
//       });
//     }
//   });
// };

exports.updateResumeStatus = (req, res) => {
  const { submission_id, status } = req.body;

  // Validate input
  if (!submission_id || !status) {
    return res.status(400).json({
      error: "Missing required parameters. 'submission_id' and 'status' are required.",
    });
  }

  // Convert single submission_id to an array (if it's not already an array)
  const idsArray = Array.isArray(submission_id) ? submission_id : [submission_id];

  // SQL query to update the status for single or multiple submission IDs
  const query = `
    UPDATE SubmittedResumes
    SET status = ?
    WHERE submission_id IN (?)
  `;

  db.query(query, [status, idsArray], (err, result) => {
    if (err) {
      return res.status(500).json({
        error: "Database error while updating status",
        details: err,
      });
    }

    if (result.affectedRows > 0) {
      res.status(200).json({
        message: "Status updated successfully",
        submission_ids: idsArray,
        new_status: status,
        affected_rows: result.affectedRows,
      });
    } else {
      res.status(404).json({
        error: "No resumes found. Please check the submission IDs.",
      });
    }
  });
};

// Reassign Resume API
exports.reassignResume = (req, res) => {
  const { submission_ids, freelancer_ids } = req.body;

  // Validate input
  if (!Array.isArray(submission_ids) || !Array.isArray(freelancer_ids)) {
    return res
      .status(400)
      .json({ error: "submission_ids and freelancer_ids should be arrays" });
  }

  // SQL query to insert new copies with the new freelancer_id
  const sqlInsertNewCopies = `
    INSERT INTO SubmittedResumes (
      resume_id, freelancer_id, first_name, middle_name, last_name, date_of_birth,
      gender, nationality, marital_status, passport, hobbies, languages_known,
      address, landmark, city, state, pincode, mobile, email, ssc_result,
      ssc_board, ssc_year_of_passing, hsc_result, hsc_board, hsc_year_of_passing,
      graduation_degree, graduation_result, graduation_university, graduation_year_of_passing,
      post_graduation_degree, post_graduation_result, post_graduation_university, post_graduation_year_of_passing,
      higher_education_qualification, total_work_experience_months, number_of_companies_worked, last_employer,
      submission_date, admin_feedback, status, rejection_reason, resume_earning, approval_status,
      feedback, efficiency_score
    )
    SELECT
      resume_id, ?, first_name, middle_name, last_name, date_of_birth,
      gender, nationality, marital_status, passport, hobbies, languages_known,
      address, landmark, city, state, pincode, mobile, email, ssc_result,
      ssc_board, ssc_year_of_passing, hsc_result, hsc_board, hsc_year_of_passing,
      graduation_degree, graduation_result, graduation_university, graduation_year_of_passing,
      post_graduation_degree, post_graduation_result, post_graduation_university, post_graduation_year_of_passing,
      higher_education_qualification, total_work_experience_months, number_of_companies_worked, last_employer,
      NOW(), admin_feedback, 'Auto Saved', rejection_reason, resume_earning, approval_status,
      feedback, efficiency_score
    FROM SubmittedResumes
    WHERE submission_id IN (?);
  `;

  // Loop through each freelancer ID
  freelancer_ids.forEach((freelancer_id) => {
    // Execute the SQL query for each freelancer with all submission IDs
    db.query(
      sqlInsertNewCopies,
      [freelancer_id, submission_ids],
      (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ error: "Database error", details: err });
        }

        console.log(
          `${result.affectedRows} resumes reassigned to freelancer ID: ${freelancer_id}`
        );
      }
    );
  });

  // Send response after processing all queries
  res.status(200).json({
    message: "Resumes reassigned to all freelancers successfully.",
  });
};



// POST API to Create/Update Freelancer Bank Details
exports.saveOrUpdateBankDetails = (req, res) => {
  const {
    freelancer_id,
    account_number,
    ifsc_code,
    bank_name,
    account_holder_name,
    account_type,
    payment_mobile_number,
    payment_method
  } = req.body;

  // Check if freelancer details already exist
  const checkQuery = `SELECT * FROM FreelancerDetails WHERE freelancer_id = ?`;

  db.query(checkQuery, [freelancer_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err });
    }

    if (results.length > 0) {
      // Freelancer details exist, perform an update
      const updateQuery = `
        UPDATE FreelancerDetails SET
          account_number = ?, 
          ifsc_code = ?, 
          bank_name = ?, 
          account_holder_name = ?, 
          account_type = ?, 
          payment_mobile_number = ?, 
          payment_method = ?
        WHERE freelancer_id = ?
      `;

      const updateValues = [
        account_number,
        ifsc_code,
        bank_name,
        account_holder_name,
        account_type,
        payment_mobile_number,
        payment_method,
        freelancer_id
      ];

      db.query(updateQuery, updateValues, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error updating bank details', details: err });
        }
        res.status(200).json({ message: 'Bank details updated successfully' });
      });
    } else {
      // Freelancer details do not exist, create new record
      const insertQuery = `
        INSERT INTO FreelancerDetails (
          freelancer_id, account_number, ifsc_code, bank_name, 
          account_holder_name, account_type, payment_mobile_number, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const insertValues = [
        freelancer_id, account_number, ifsc_code, bank_name,
        account_holder_name, account_type, payment_mobile_number, payment_method
      ];

      db.query(insertQuery, insertValues, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Error saving bank details', details: err });
        }
        res.status(201).json({ message: 'Bank details saved successfully' });
      });
    }
  });
};


// GET API to fetch Freelancer Bank Details
exports.getBankDetails = (req, res) => {
  const { freelancer_id } = req.params; // Extract freelancer_id from URL params

  const query = `
    SELECT 
      freelancer_id,
      account_number,
      ifsc_code,
      bank_name,
      account_holder_name,
      account_type,
      payment_mobile_number,
      payment_method,
      id_reject_reason
    FROM FreelancerDetails 
    WHERE freelancer_id = ?
  `;

  db.query(query, [freelancer_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching bank details', details: err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Bank details not found for this freelancer' });
    }

    res.status(200).json(results[0]); // Send back the bank details for the freelancer
  });
};


exports.downloadAadharCard = async (req, res) => {
  const { freelancer_id } = req.params;

  // Fetch Aadhaar details from the database
  const sql = `SELECT document_file_path FROM FreelancerDetails WHERE freelancer_id = ?`;

  db.query(sql, [freelancer_id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "Aadhar card not found for the given freelancer" });
    }

    const { document_file_path: fileId } = results[0];

    try {
      const driveResponse = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      // Set headers for inline display in the browser
      res.setHeader("Content-Type", "application/pdf"); // Set the content type to PDF
      res.setHeader("Content-Disposition", `inline; filename="AadharCard-${freelancer_id}.pdf"`);

      // Pipe the file stream to the response
      driveResponse.data.pipe(res);
    } catch (error) {
      res.status(500).json({
        error: "Failed to download Aadhaar card",
        details: error.message,
      });
    }
  });
};

exports.downloadAddressId = async (req, res) => {
  const { freelancer_id } = req.params;

  // Fetch Aadhaar details from the database
  const sql = `SELECT address_proof_file_path FROM FreelancerDetails WHERE freelancer_id = ?`;

  db.query(sql, [freelancer_id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "address not found for the given freelancer" });
    }

    const { address_proof_file_path: fileId } = results[0];

    try {
      const driveResponse = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );

      // Set headers for inline display in the browser
      res.setHeader("Content-Type", "application/pdf"); // Set the content type to PDF
      res.setHeader("Content-Disposition", `inline; filename="Addressid-${freelancer_id}.pdf"`);

      // Pipe the file stream to the response
      driveResponse.data.pipe(res);
    } catch (error) {
      res.status(500).json({
        error: "Failed to download Addressid",
        details: error.message,
      });
    }
  });
};
  

// exports.updateApprovalStatusAndDeleteDocument = async (req, res) => {

//   console.log('====================================')
//   console.log(req.body.idRejectReason);
//   console.log('====================================')
//   const { freelancer_id, status } = req.body;

//   if (!freelancer_id || !["accepted", "rejected"].includes(status)) {
//     return res.status(400).json({ error: "Invalid freelancer_id or status" });
//   }

//   const isApproved = status === "accepted";

//   try {
//     // Update the is_approved status in the Freelancer table
//     const sqlUpdateApproval = `UPDATE Freelancer SET is_approved = ? WHERE user_id = ?`;

//     db.query(sqlUpdateApproval, [isApproved, freelancer_id], (err, result) => {
//       if (err) {
//         return res.status(500).json({ error: "Database error", details: err });
//       }

//       if (result.affectedRows === 0) {
//         return res.status(404).json({ message: "Freelancer not found" });
//       }

//       if (status === "accepted") {
//         return res.status(200).json({ message: "Freelancer approved successfully" });
//       } else {
//         // If rejected, proceed to delete the Aadhaar card document
//         deleteAadharDocument(freelancer_id, res);
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ error: "An error occurred", details: error.message });
//   }
// };


// exports.updateApprovalStatusAndDeleteDocument = async (req, res) => {
//   const { freelancer_id, status, id_reject_reason } = req.body;

//   // Detailed logging to debug the issue
//   console.log("Received data:", req.body);
//   console.log("freelancer_id:", freelancer_id);
//   console.log("status:", status);
//   console.log("id_reject_reason:", id_reject_reason);

//   // Validation
//   if (!freelancer_id || !["accepted", "rejected"].includes(status)) {
//     return res.status(400).json({ error: "Invalid freelancer_id or status" });
//   }

//   // Additional check for rejection reason
//   if (status === "rejected" && !(id_reject_reason && id_reject_reason.trim())) {
//     console.error("Validation failed: Rejection reason is missing or empty");
//     return res.status(400).json({ error: "Rejection reason is required" });
//   }

//   try {
//     // 1. Update Freelancer approval status
//     const sqlUpdateApproval = `UPDATE Freelancer SET is_approved = ? WHERE user_id = ?`;
    
//     db.query(sqlUpdateApproval, [status === "accepted", freelancer_id], (err, result) => {
//       if (err) {
//         console.error("Error updating approval status:", err);
//         return handleError(res, err);
//       }

//       if (result.affectedRows === 0) {
//         return res.status(404).json({ message: "Freelancer not found" });
//       }

//       if (status === "accepted") {
//         console.log("Freelancer approved successfully");
//         return res.status(200).json({ message: "Freelancer approved successfully" });
//       }

//       // 2. Update Rejection Reason in FreelancerDetails
//       const sqlUpdateRejection = `
//         UPDATE FreelancerDetails 
//         SET id_reject_reason = ? 
//         WHERE freelancer_id = ?
//       `;
      
//       db.query(sqlUpdateRejection, [id_reject_reason, freelancer_id], (err, result) => {
//         if (err) {
//           console.error("Error updating rejection reason:", err);
//           return handleError(res, err);
//         }
//         console.log("Rejection reason updated. Initiating document deletion...");
//         deleteAadharDocument(freelancer_id, res);
//         deleteAddressDocument(freelancer_id, res);
//       });
//     });
//   } catch (error) {
//     console.error("Unexpected error:", error);
//     handleError(res, error);
//   }
// };


exports.updateApprovalStatusAndDeleteDocument = async (req, res) => {
  const { freelancer_id, status, id_reject_reason } = req.body;

  // Validation
  if (!freelancer_id || !["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid freelancer_id or status" });
  }

  if (status === "rejected" && !(id_reject_reason && id_reject_reason.trim())) {
    return res.status(400).json({ error: "Rejection reason is required" });
  }

  try {
    // 1. Update Freelancer approval status
    const sqlUpdateApproval = `UPDATE Freelancer SET is_approved = ? WHERE user_id = ?`;
    db.query(sqlUpdateApproval, [status === "accepted", freelancer_id], async (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Error updating approval status", details: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Freelancer not found" });
      }

      if (status === "accepted") {
        return res.status(200).json({ message: "Freelancer approved successfully" });
      }

      // 2. Update Rejection Reason in FreelancerDetails
      const sqlUpdateRejection = `UPDATE FreelancerDetails SET id_reject_reason = ? WHERE freelancer_id = ?`;
      db.query(sqlUpdateRejection, [id_reject_reason, freelancer_id], async (err) => {
        if (err) {
          return res.status(500).json({ error: "Error updating rejection reason", details: err });
        }

        try {
          // 3. Delete Aadhar and Address documents
          const aadharResult = await deleteAadharDocument(freelancer_id);
          const addressResult = await deleteAddressDocument(freelancer_id);

          // Send a single response after all operations are complete
          res.status(200).json({
            message: "Freelancer rejected and documents deleted successfully",
            aadharResult,
            addressResult,
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Unexpected error", details: error.message });
  }
};



// const deleteAadharDocument = async (freelancer_id, res) => {
//   // Fetch the Aadhaar document file ID from the database
//   const sqlFetch = `SELECT document_file_path FROM FreelancerDetails WHERE freelancer_id = ?`;

//   db.query(sqlFetch, [freelancer_id], async (err, results) => {
//     if (err || results.length === 0) {
//       return res.status(404).json({ error: "Aadhaar card not found for the given freelancer" });
//     }

//     const { document_file_path: fileId } = results[0];

//     console.log(path.join(__dirname, "../config/upload-resume-445409-c356f80a515d.json"));

//     try {
//       // Initialize Google Drive API
//       const auth = new google.auth.GoogleAuth({
//         keyFile: path.join(__dirname, "../config/upload-resume-445409-c356f80a515d.json"),
//         scopes: ["https://www.googleapis.com/auth/drive"],
//       });
//       const drive = google.drive({ version: "v3", auth });

//       // Delete the file from Google Drive
//       await drive.files.delete({ fileId });

//       // Remove the file path from the database
//       const sqlDeletePath = `UPDATE FreelancerDetails SET document_file_path = NULL WHERE freelancer_id = ?`;
//       db.query(sqlDeletePath, [freelancer_id], (err) => {
//         if (err) {
//           return res.status(500).json({ error: "Error updating database", details: err });
//         }

//         res.status(200).json({ message: "Freelancer rejected and Aadhaar card deleted successfully" });
//       });
//     } catch (error) {
//       res.status(500).json({
//         error: "Failed to delete Aadhaar card",
//         details: error.message,
//       });
//     }
//   });
// };

// const deleteAddressDocument = async (freelancer_id, res) => {
//   // Fetch the Aadhaar document file ID from the database
//   const sqlFetch = `SELECT address_proof_file_path FROM FreelancerDetails WHERE freelancer_id = ?`;

//   db.query(sqlFetch, [freelancer_id], async (err, results) => {
//     if (err || results.length === 0) {
//       return res.status(404).json({ error: "Address id card not found for the given freelancer" });
//     }

//     const { address_proof_file_path: fileId } = results[0];

//     console.log(path.join(__dirname, "../config/upload-resume-445409-c356f80a515d.json"));

//     try {
//       // Initialize Google Drive API
//       const auth = new google.auth.GoogleAuth({
//         keyFile: path.join(__dirname, "../config/upload-resume-445409-c356f80a515d.json"),
//         scopes: ["https://www.googleapis.com/auth/drive"],
//       });
//       const drive = google.drive({ version: "v3", auth });

//       // Delete the file from Google Drive
//       await drive.files.delete({ fileId });

//       // Remove the file path from the database
//       const sqlDeletePath = `UPDATE FreelancerDetails SET address_proof_file_path = NULL WHERE freelancer_id = ?`;
//       db.query(sqlDeletePath, [freelancer_id], (err) => {
//         if (err) {
//           return res.status(500).json({ error: "Error updating database", details: err });
//         }

//         res.status(200).json({ message: "Freelancer rejected and Address id card deleted successfully" });
//       });
//     } catch (error) {
//       res.status(500).json({
//         error: "Failed to delete Address id card",
//         details: error.message,
//       });
//     }
//   });
// };


const deleteAadharDocument = async (freelancer_id) => {
  return new Promise((resolve, reject) => {
    // Fetch the Aadhaar document file ID from the database
    const sqlFetch = `SELECT document_file_path FROM FreelancerDetails WHERE freelancer_id = ?`;

    db.query(sqlFetch, [freelancer_id], async (err, results) => {
      if (err || results.length === 0) {
        return reject(new Error("Aadhaar card not found for the given freelancer"));
      }

      const { document_file_path: fileId } = results[0];

      console.log(path.join(__dirname, "../config/upload-resume-445409-c356f80a515d.json"));

      try {
        // Initialize Google Drive API
        const auth = new google.auth.GoogleAuth({
          keyFile: path.join(__dirname, "../config/upload-resume-445409-c356f80a515d.json"),
          scopes: ["https://www.googleapis.com/auth/drive"],
        });
        const drive = google.drive({ version: "v3", auth });

        // Delete the file from Google Drive
        await drive.files.delete({ fileId });

        // Remove the file path from the database
        const sqlDeletePath = `UPDATE FreelancerDetails SET document_file_path = NULL WHERE freelancer_id = ?`;
        db.query(sqlDeletePath, [freelancer_id], (err) => {
          if (err) {
            return reject(new Error("Error updating database"));
          }
          resolve("Aadhaar card deleted successfully");
        });
      } catch (error) {
        reject(new Error(`Failed to delete Aadhaar card: ${error.message}`));
      }
    });
  });
};

const deleteAddressDocument = async (freelancer_id) => {
  return new Promise((resolve, reject) => {
    // Fetch the Address document file ID from the database
    const sqlFetch = `SELECT address_proof_file_path FROM FreelancerDetails WHERE freelancer_id = ?`;

    db.query(sqlFetch, [freelancer_id], async (err, results) => {
      if (err || results.length === 0) {
        return reject(new Error("Address ID card not found for the given freelancer"));
      }

      const { address_proof_file_path: fileId } = results[0];

      console.log(path.join(__dirname, "../config/upload-resume-445409-c356f80a515d.json"));

      try {
        // Initialize Google Drive API
        const auth = new google.auth.GoogleAuth({
          keyFile: path.join(__dirname, "../config/upload-resume-445409-c356f80a515d.json"),
          scopes: ["https://www.googleapis.com/auth/drive"],
        });
        const drive = google.drive({ version: "v3", auth });

        // Delete the file from Google Drive
        await drive.files.delete({ fileId });

        // Remove the file path from the database
        const sqlDeletePath = `UPDATE FreelancerDetails SET address_proof_file_path = NULL WHERE freelancer_id = ?`;
        db.query(sqlDeletePath, [freelancer_id], (err) => {
          if (err) {
            return reject(new Error("Error updating database"));
          }
          resolve("Address ID card deleted successfully");
        });
      } catch (error) {
        reject(new Error(`Failed to delete Address ID card: ${error.message}`));
      }
    });
  });
};