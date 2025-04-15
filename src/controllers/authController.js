const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Utility  function to generate a random 6-digit number
const generateRandomDigits = (length = 6) => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Ensures a 6-digit number
};

// Utility function to generate userId
const generateUserId = (name) => {
  // Extract first three letters, handle names shorter than 3 characters
  const namePart = name.substring(0, 3).toUpperCase().padEnd(3, "X"); // Pads with 'X' if name < 3 chars
  const randomDigits = generateRandomDigits();
  return `${namePart}${randomDigits}`;
};

// Optional: Function to check if userId already exists
const isUserIdUnique = (userId) => {
  return new Promise((resolve, reject) => {
    const checkSql =
      "SELECT COUNT(*) as count FROM Freelancer WHERE user_id = ?";
    db.query(checkSql, [userId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0].count === 0);
    });
  });
};

// exports.signUp = async (req, res) => {
//   const { name, phone_number, email, password } = req.body;

//   console.log(name, phone_number, email, password)

//   // Basic validation
//   if (!name || !phone_number || !email || !password) {
//     return res.status(400).json({ error: "All fields are required" });
//   }

//   try {
//     // 1. Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // 2. Generate userId
//     let userId = generateUserId(name);

//     // 3. Ensure userId is  unique
//     let isUnique = await isUserIdUnique(userId);
//     while (!isUnique) {
//       userId = generateUserId(name);
//       isUnique = await isUserIdUnique(userId);
//     }

//     // 4. Insert user into the database
//     const sql = `
//       INSERT INTO Freelancer (user_id, name, phone_number, email, password, start_date)
//       VALUES (?, ?, ?, ?, ?, CURDATE())
//     `;

//     db.query(sql, [userId, name, phone_number, email, hashedPassword], (err, result) => {
//       if (err) {
//         console.error("Database insertion error:", err);
//         return res.status(500).json({ error: "Database error" });
//       }

//       // 5. After successful insertion, send the email
//       const transporter = nodemailer.createTransport({
//         service: "gmail",
//         auth: {
//           user: process.env.EMAIL,            // Your Gmail email address
//           pass: process.env.EMAIL_PASSWORD,   // Your Gmail app password (or use OAuth2)
//         },
//       });

//       // Email content
//       const mailOptions = {
//         from: `"Resumes Entry" <${process.env.EMAIL}>`,
//         to: email,
//         subject: "Password Reset Request",
//      html:`
//           <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
//   <!-- Logo Section  -->
//   <div style="text-align: center; margin-bottom: 20px;">
//     <img src="https://www.resumesentry.com/_next/image?url=%2Fimages%2Fuser%2Fresumesentrylogo.jpg&w=384&q=75" alt="Resumes Entry Logo" style="max-width: 150px;">
//   </div>
  
//   <h2 style="color:rgb(65, 62, 142);">Hey ${name},</h2>
//   <p>Your registration is successfully done!</p>
//   <p>Your Resumes Entry account is activated, please use credentials given below.</p>
//   <ul>
//     <li><strong>User ID:</strong> ${userId}</li>
//     <li><strong>Password:</strong> ${password}</li>
//   </ul>
  
//   <a href="https://www.resumesentry.com/auth/signin" style="display: inline-block; padding: 10px 20px; color: white; background-color:rgb(86, 76, 175); text-decoration: none; border-radius: 5px;">
//     Login to Resumes Entry
//   </a>
  
//   <p>If you have any issue or need our help keeping the account, please contact us at, <a href="tel:+917597501014">+91 7665025123</a></p>
//   <p>If our customer executive is busy on another call, so you can WhatsApp your query on this number.</p>
  
//   <p>Regards,<br/>The Resumes Entry Team</p>
  
//   <p style="font-size: 12px; color: #777;">© 2025 Resumes Entry. All rights reserved.</p>
// </div>

//       `
// ,
//       };
//       console.log(mailOptions);

//       // 6. Send the email
//       transporter.sendMail(mailOptions, (error, info) => {
//         if (error) {
//           console.error("Email sending error:", error);
//           return res
//             .status(500)
//             .json({ error: "Failed to send email. Please try again later." });
//         }

//         // 7. Respond to the client with success and the generated userId
//         return res.status(201).json({
//           message: "Freelancer registered successfully",
//           userId: userId,
//         });
//       });
//     });
//   } catch (error) {
//     console.error("Server error:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

exports.signUp = async (req, res) => {
  const { name, phone_number, email, password } = req.body;

  console.log(name, phone_number, email, password);

  // Basic validation
  if (!name || !phone_number || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const textpassword = password;

  try {
    // 1. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 2. Generate userId
    let userId = generateUserId(name);

    // 3. Ensure userId is unique
    let isUnique = await isUserIdUnique(userId);
    while (!isUnique) {
      userId = generateUserId(name);
      isUnique = await isUserIdUnique(userId);
    }

    // 4. Insert user into the database
    const sql = `
      INSERT INTO Freelancer (user_id, name, phone_number, email, password, textpassword, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 5 DAY))
    `;

    db.query(sql, [userId, name, phone_number, email, hashedPassword, textpassword], (err, result) => {
      if (err) {
        console.error("Database insertion error:", err);
        return res.status(500).json({ error: "Database error" });
      }

      // 5. After successful insertion, send the email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL, // Your Gmail email address
          pass: process.env.EMAIL_PASSWORD, // Your Gmail app password
        },
      });

      // Email content
      const mailOptions = {
        from: `"Resumes Entry" <${process.env.EMAIL}>`,
        to: email,
        subject: "Welcome to Resumes Entry",
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://www.resumesentry.com/_next/image?url=%2Fimages%2Fuser%2Fresumesentrylogo.jpg&w=384&q=75" alt="Resumes Entry Logo" style="max-width: 150px;">
            </div>
            <h2 style="color:rgb(65, 62, 142);">Hey ${name},</h2>
            <p>Your registration is successfully done!</p>
            <p>Your Resumes Entry account is activated, please use credentials given below.</p>
            <ul>
              <li><strong>User ID:</strong> ${userId}</li>
              <li><strong>Password:</strong> ${password}</li>
            </ul>
            <a href="https://www.resumesentry.com/auth/signin" style="display: inline-block; padding: 10px 20px; color: white; background-color:rgb(86, 76, 175); text-decoration: none; border-radius: 5px;">
              Login to Resumes Entry
            </a>
            <p>If you have any issue or need our help keeping the account, please contact us at, <a href="tel:+917597501014">+91 7665025123</a></p>
            <p>If our customer executive is busy on another call, so you can WhatsApp your query on this number.</p>
            <p>Regards,<br/>The Resumes Entry Team</p>
            <p style="font-size: 12px; color: #777;">© 2025 Resumes Entry. All rights reserved.</p>
          </div>
        `,
      };

      console.log(mailOptions);

      // 6. Send the email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Email sending error:", error);
          return res.status(500).json({ error: "Failed to send email. Please try again later." });
        }

        // 7. Respond to the client with success and the generated userId
        console.log("Email sent successfully:", info.response);
        return res.status(201).json({
          message: "Freelancer registered successfully and email sent",
          userId: userId,
        });
      });
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
// exports.login = async (req, res) => {
//   const { userId, password } = req.body;

//   // Basic input validation
//   if (!userId || !password) {
//     return res.status(400).json({ error: "userId and password are required" });
//   }

//   try {
//     // Attempt to find the user in the Admin table
//     const adminSql = "SELECT * FROM Admin WHERE email = ?";
//     const [adminResults] = await db.promise().query(adminSql, [userId]);

//     if (adminResults.length > 0) {
//       const admin = adminResults[0];

//       // Hash the input password using SHA-256
//       const hashedPassword = crypto
//         .createHash("sha256")
//         .update(password)
//         .digest("hex");

//       // Compare the hashed input password with the stored hashed password
//       if (hashedPassword !== admin.password) {
//         return res.status(401).json({ error: "Invalid credentials" });
//       }

//       // Generate JWT for admin
//       const token = jwt.sign(
//         { id: admin.admin_id, role: "admin" },
//         process.env.JWT_SECRET,
//         { expiresIn: "24h" }
//       );

//       return res.json({ token, role: "admin" });
//     }

//     // If not found in Admin, attempt to find in Freelancer table
//     const freelancerSql = "SELECT * FROM Freelancer WHERE user_id = ? AND is_active = TRUE";
//     const [freelancerResults] = await db.promise().query(freelancerSql, [userId]);

//     if (freelancerResults.length > 0) {
//       const freelancer = freelancerResults[0];

//       // Compare plain-text passwords for freelancer
//       if (password !== freelancer.password) {
//         return res.status(401).json({ error: "Invalid credentials" });
//       }

//       // Generate JWT for freelancer
//       const token = jwt.sign(
//         { id: freelancer.freelancer_id, role: "freelancer" },
//         process.env.JWT_SECRET,
//         { expiresIn: "24h" }
//       );

//       return res.json({ token, role: "freelancer" });
//     }

//     // If userId not found in either table
//     return res.status(401).json({ error: "Invalid credentials" });

//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({ error: "Server error" });
//   }
// };

exports.login = async (req, res) => {
  const { userId, password } = req.body;

  // Basic input validation
  if (!userId || !password) {
    return res.status(400).json({ error: "userId and password are required" });
  }

  try {
    // Attempt to find the user in the Admin table
    const adminSql = "SELECT * FROM Admin WHERE email = ?";
    const [adminResults] = await db.promise().query(adminSql, [userId]);

    if (adminResults.length > 0) {
      const admin = adminResults[0];
      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      if (hashedPassword !== admin.password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate JWT for admin
      const token = jwt.sign(
        { id: admin.admin_id, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.json({ token, role: "admin" });
    }

    // If not found in Admin, attempt to find in Freelancer table
    const freelancerSql = "SELECT * FROM Freelancer WHERE user_id = ? AND is_active = TRUE";
    const [freelancerResults] = await db.promise().query(freelancerSql, [userId]);

    if (freelancerResults.length > 0) {
      const freelancer = freelancerResults[0];
      const isValidPassword = await bcrypt.compare(password, freelancer.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate JWT for freelancer
      const token = jwt.sign(
        { id: freelancer.freelancer_id, role: "freelancer" },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.json({ token, role: "freelancer" });
    }

    // If userId not found in either table
    return res.status(401).json({ error: "Invalid credentials" });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // ✅ Validate email existence in the Freelancer table
    const sql = `SELECT freelancer_id AS id FROM Freelancer WHERE email = ?`;
    db.query(sql, [email], async (err, results) => {
      console.log("first")
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal server error. Please try again later." });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Email not found. Please contact admin." });
      }

      // ✅ Destructure the query results
      const { id, role } = results[0];

      // ✅ Generate a secure reset token (expires in 1 hour)
      const resetToken = jwt.sign({ id, role, email }, process.env.JWT_SECRET, {
        expiresIn: "1h", // 1-hour expiry
      });

      // ✅ Create a password reset link
      const resetLink = `https://www.resumesentry.com/auth/reset-password?token=${resetToken}`;


      console.log(process.env.EMAIL, process.env.EMAIL_PASSWORD);
      // ✅ Configure the email transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      // ✅ Email content
      const mailOptions = {
        from: `"Resumes Entry" <${process.env.EMAIL}>`,
        to: email,
        subject: "Password Reset Request",
        html: `
          <p>You requested a password reset.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      };

      // ✅ Send the reset email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Email sending error:", error);
          return res.status(500).json({ error: "Failed to send email. Please try again later." });
        }
        res.json({ message: "Password reset email sent. Check your inbox." });
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Something went wrong. Please try again later." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  console.log(token)

  try {
    // ✅ Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = decoded;

    console.log(id)

    // ✅ Check if the user exists in the database
    const checkUserSql = "SELECT freelancer_id FROM Freelancer WHERE freelancer_id = ?";
    db.query(checkUserSql, [id], async (err, results) => {
      if (err) return res.status(500).json({ error: "Internal server error." });

      if (results.length === 0) {
        return res.status(404).json({ error: "Invalid or expired token." });
      }

      // ✅ Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // ✅ Update the password in the database
      const updatePasswordSql = "UPDATE Freelancer SET password = ? WHERE freelancer_id = ?";
      db.query(updatePasswordSql, [hashedPassword, id], (err, result) => {
        if (err) {
          return res.status(500).json({ error: "Failed to update password." });
        }

        res.json({
          message: "Password reset successfully. You can now log in.",
        });
      });
    });
  } catch (err) {
    // ✅ Handle token verification errors
    return res.status(400).json({ error: "Invalid or expired token." });
  }
};
