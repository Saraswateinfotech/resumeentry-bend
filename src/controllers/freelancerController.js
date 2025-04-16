const db = require("../config/db");

exports.getFreelancerDetails = async (req, res) => {
  const { freelancer_id } = req.params;

  try {
    // Query to fetch freelancer profile
    const profileQuery = `SELECT * FROM Freelancer WHERE user_id = ?`;

    // Query to fetch wallet details
    const walletQuery = `SELECT * FROM Wallet WHERE freelancer_id = ?`;

    // Execute all queries
    db.query(profileQuery, [freelancer_id], (err, profileResults) => {
      if (err)
        return res.status(500).json({ error: "Error fetching profile data" });

      db.query(walletQuery, [freelancer_id], (err, walletResults) => {
        if (err)
          return res.status(500).json({ error: "Error fetching wallet data" });

        // Combine all results into a single response object
        const freelancerDetails = {
          profile: profileResults, // Freelancer profile
          wallet: walletResults, // Wallet details
        };

        res.json(freelancerDetails);
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getAllFreelancers = (req, res) => {
  // Get the search term from query parameters or use a default value
  const searchTerm = req.query.search || ""; // If no search term is provided, search for an empty string

  // Get the current page and limit (number of records per page) from query params, default to 1 and 10 if not provided
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 500;

  // Calculate the offset for pagination
  const offset = (page - 1) * limit;

  // Sanitize input by escaping potentially harmful characters
  const sanitizedSearchTerm = db.escape("%" + searchTerm + "%");

  // Query to fetch freelancers with search functionality
  const query = `
    SELECT * 
    FROM Freelancer
    WHERE CONCAT_WS(' ', 
      user_id, 
      name, 
      start_date, 
      end_date, 
      phone_number, 
      alternate_phone, 
      email, 
      password, 
      date_of_birth, 
      gender, 
      address, 
      city, 
      state, 
      country, 
      pincode, 
      education, 
      occupation, 
      monthly_income, 
      is_approved, 
      is_active, 
      joining_bonus, 
      total_earnings, 
      total_resumes_completed, 
      current_resume_id, 
      resumes_rejected, 
      textpassword
    ) LIKE ${sanitizedSearchTerm}
    LIMIT ${limit} OFFSET ${offset};
  `;

  // Execute query to get the freelancers based on the search term
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Error fetching freelancers",
        details: err,
      });
    }

    // Query to get the total count of freelancers matching the search criteria
    const countQuery = `
      SELECT COUNT(*) AS totalCount
      FROM Freelancer
      WHERE CONCAT_WS(' ', 
        user_id, 
        name, 
        start_date, 
        end_date, 
        phone_number, 
        alternate_phone, 
        email, 
        password, 
        date_of_birth, 
        gender, 
        address, 
        city, 
        state, 
        country, 
        pincode, 
        education, 
        occupation, 
        monthly_income, 
        is_approved, 
        is_active, 
        joining_bonus, 
        total_earnings, 
        total_resumes_completed, 
        current_resume_id, 
        resumes_rejected, 
        textpassword
      ) LIKE ${sanitizedSearchTerm};
    `;

    // Execute count query to get the total number of matching freelancers
    db.query(countQuery, (countErr, countResult) => {
      if (countErr) {
        return res.status(500).json({
          error: "Error fetching total count",
          details: countErr,
        });
      }

      // Total records count
      const totalCount = countResult[0].totalCount;

      // Calculate total pages
      const totalPages = Math.ceil(totalCount / limit);

      // Send the results back as JSON with pagination info
      res.status(200).json({
        freelancers: results,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      });
    });
  });
};

exports.editFreelancerDetails = (req, res) => {
  const { freelancer_id } = req.params; // Freelancer ID from the URL
  const updateFields = req.body; // Fields to update from the request body

  // Initialize an array to hold the SQL set clauses and values
  let setClauses = [];
  let values = [];

  // Iterate over the fields in the request body
  for (const [key, value] of Object.entries(updateFields)) {
    // Skip the freelancer_id if it's accidentally included in the body
    if (key === 'freelancer_id') continue;

    // Add the field to the set clauses and values array
    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  // If no fields are provided to update, return an error
  if (setClauses.length === 0) {
    return res.status(400).json({ error: "No fields provided to update" });
  }

  // Add the freelancer_id to the values array for the WHERE clause
  values.push(freelancer_id);

  // Construct the SQL query dynamically
  const sql = `
    UPDATE Freelancer 
    SET ${setClauses.join(', ')} 
    WHERE user_id = ?`;

  // Execute the query
  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Freelancer not found" });
    }

    res.status(200).json({ message: "Freelancer details updated successfully" });
  });
};


// Activate or Deactivate Freelancer
exports.toggleFreelancerStatus = (req, res) => {
  const { freelancer_id } = req.params; // Get freelancer_id from route params
  const { is_active } = req.body; // Pass TRUE or FALSE to toggle status

  const sql = `UPDATE Freelancer SET is_active = ? WHERE user_id = ?`;

  db.query(sql, [is_active, freelancer_id], (err, result) => {
    if (err)
      return res.status(500).json({ error: "Database error", details: err });
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Freelancer not found" });
    }
    res.status(200).json({
      message: `Freelancer status updated successfully`,
      is_active: is_active,
    });
  });
};

exports.getCurrentResumeIdFreelancer = (req, res) => {
  const freelancer_id = req.params.freelancer_id;

  // Query to get the current resume ID from Freelancer table
  const query = 'SELECT current_resume_id FROM Freelancer WHERE user_id = ?';

  db.query(query, [freelancer_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching freelancer data', details: err });
    }

    if (results.length > 0) {
      const currentResumeId = results[0].current_resume_id;

      // If current resume ID is 0 or doesn't exist, get the first resume ID from Resumes table
      if (currentResumeId === 0 || !currentResumeId) {
        // Query to get the first resume ID from the Resumes table
        const firstResumeQuery = 'SELECT resume_id FROM Resumes LIMIT 1';
        db.query(firstResumeQuery, (err, resumeResults) => {
          if (err) {
            return res.status(500).json({ error: 'Error fetching resume data', details: err });
          }

          if (resumeResults.length > 0) {
            // If there is a resume in the Resumes table, return the first resume ID
            return res.json({ current_resume_id: resumeResults[0].resume_id });
          } else {
            // If no resumes are found in the Resumes table
            return res.status(404).json({ error: 'No resume found' });
          }
        });
      } else {
        // If current resume ID exists and is not 0, return it
        return res.json({ current_resume_id: currentResumeId });
      }
    } else {
      return res.status(404).json({ error: 'Freelancer not found' });
    }
  });
};


exports.updateCurrentResumeIdFreelancer = (req, res) => {
  const freelancer_id = req.params.freelancer_id;
  const { current_resume_id } = req.body; // Get the new resume ID from the request body

  const query = 'UPDATE Freelancer SET current_resume_id = ? WHERE user_id = ?';
  db.query(query, [current_resume_id, freelancer_id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating freelancer data', details: err });
    }

    if (results.affectedRows > 0) {
      return res.json({ message: 'Current resume ID updated successfully' });
    } else {
      return res.status(404).json({ error: 'Freelancer not found' });
    }
  });
};
