import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import nodemailer from 'nodemailer';

// === App Initialization ===
const app = express();
app.use(cors());
app.use(express.json());

// === MongoDB Connection ===
mongoose.connect('mongodb+srv://dhivarvinayak:dhivarvinayak@cluster0.s1sdgdp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ Successfully connected to MongoDB.'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// === Mongoose User Schema & Model ===
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: String,
  resetTokenExpiry: Date,
});

const User = mongoose.model('users', userSchema);

// === Nodemailer Transporter Configuration ===
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'digitallaw2025@gmail.com',
    pass: 'kjrb jzxs qrbv oppr', // Consider using environment variables
  },
});

// === Utility Function: Generate Token ===
const generateToken = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 10)}`;
};

// === Utility Function: Send Reset Email ===
const sendResetEmail = (email, token) => {
  const resetLink = `https://passwordreset-lilac.vercel.app/reset-password/${token}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to proceed:</p>
      <a href="${resetLink}" 
         style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
         Reset Password
      </a>
      <p style="font-size: 12px; color: #777;">
        This link will expire in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.
      </p>
      <hr style="margin-top: 30px;" />
      <p style="font-size: 14px; color: #555;">
        Thank you,<br/>
        <strong>DgAct - Digital</strong>
      </p>
    </div>
  `;

  return transporter.sendMail({
    from: '"Digital Law Support" <digitallaw2025@gmail.com>',
    to: email,
    subject: 'Password Reset Request',
    html: htmlContent,
  });
};

// === Route: Request Password Reset ===
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: 'No account found with this email address.' });

    const token = generateToken();
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendResetEmail(email, token);

    res.status(200).json({ message: 'A password reset link has been sent to your email address.' });
  } catch (error) {
    console.error('❌ Error in /forgot-password:', error);
    res.status(500).json({ message: 'Internal server error. Please try again later.' });
  }
});

// === Route: Reset Password ===
app.post('/api/auth/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });

    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.status(200).json({ message: 'Your password has been successfully updated.' });
  } catch (error) {
    console.error('❌ Error in /reset-password:', error);
    res.status(500).json({ message: 'Failed to reset password. Please try again later.' });
  }
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
