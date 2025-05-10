import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import nodemailer from 'nodemailer';

// === Setup ===
const app = express();
app.use(cors());
app.use(express.json());

// === MongoDB connection ===
mongoose.connect('mongodb+srv://dhivarvinayak:dhivarvinayak@cluster0.s1sdgdp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// === Mongoose User Schema ===
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  resetToken: String,
  resetTokenExpiry: Date,
});
const User = mongoose.model('users', userSchema);

// === Nodemailer setup ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'digitallaw2025@gmail.com',
    pass: 'kjrb jzxs qrbv oppr',
  },
});

// Function to generate simple token
const generateToken = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 10)}`;
};

// Send Reset Email (Improved HTML Template)
const sendResetEmail = (email, token) => {
  const link = `https://passwordreset-lilac.vercel.app/reset-password/${token}`;
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to proceed:</p>
      <a href="${link}" 
         style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">
         Reset Password
      </a>
      <p style="font-size: 12px; color: #777;">
        This link will expire in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.
      </p>
    </div>
  `;

  return transporter.sendMail({
    from: '"Digital Law Support" <digitallaw2025@gmail.com>',
    to: email,
    subject: 'Your Password Reset Link',
    html: htmlTemplate,
  });
};

// === Routes ===

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: 'No account found with this email address.' });

    const token = generateToken();
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 10; // 10 minutes
    await user.save();

    await sendResetEmail(email, token);
    res.json({ message: 'A password reset link has been sent to your email.' });

  } catch (err) {
    console.error('❌ Forgot-password error:', err);
    res.status(500).json({ message: 'Unable to process your request at this time. Please try again later.' });
  }
});

// Reset password
app.post('/api/auth/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: 'This password reset link is invalid or has expired.' });

  user.password = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Your password has been updated successfully.' });
});

// === Start Server ===
app.listen(5000, () => {
  console.log('🚀 Server running at http://localhost:5000');
});
