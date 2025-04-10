import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import nodemailer from 'nodemailer';


// === Setup ===
const app = express();
app.use(cors());
app.use(express.json());

// === MongoDB connection ===
mongoose.connect('mongodb+srv://prakashprm710:prakashmane@cluster0.zjkru.mongodb.net/acts?retryWrites=true&w=majority&appName=Cluster0')
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
    user: 'timbertimber710@gmail.com',      // 🔁 Replace with your Gmail
    pass: 'xqlf xhgo nyci ugul',       // 🔁 Replace with your App Password (not your regular password!)
  },
});

// Function to generate simple token
const generateToken = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 10)}`;
};

// Send Reset Email
const sendResetEmail = (email, token) => {
  const link = `http://localhost:5173/reset-password/${token}`;
  return transporter.sendMail({
    from: 'timbertimber710@gmail.com',
    to: email,
    subject: 'Password Reset Link',
    html: `<p>Click to reset your password: <a href="${link}">${link}</a></p>`,
  });
};

// === Routes ===

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: 'Email not found' });

    const token = generateToken();
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 10;
    await user.save();

    await sendResetEmail(email, token);
    res.json({ message: 'Reset link sent to email' });

  } catch (err) {
    console.error('❌ Forgot-password error:', err);
    res.status(500).json({ message: 'Something went wrong', error: err.message });
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

  if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

  user.password = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  res.json({ message: 'Password updated successfully' });
});

// === Start Server ===
app.listen(5000, () => {
  console.log('🚀 Server running at http://localhost:5000');
});
