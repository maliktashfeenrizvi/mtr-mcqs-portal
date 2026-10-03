/**
 * CS MCQ Portal - Production-ready single-file MERN application
 * ============================================================
 * Setup:
 *   1. npm install
 *   2. Set environment variable (optional):
 *        export MONGODB_URI="mongodb://localhost:27017/cs_mcq_portal"
 *      or create a .env file with MONGODB_URI=...
 *   3. Make sure MongoDB is running
 *   4. npm start
 *   5. Open http://localhost:3000
 *
 * Default Admin:
 *   Username: abuobaida313
 *   Password: abuobaida313
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cs_mcq_portal';

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// Database Models
// ─────────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  ipAddress: { type: String, required: true },
  hasAttempted: { type: Boolean, default: false },
  lastAttemptVersion: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
userSchema.index({ name: 1, country: 1, ipAddress: 1 });
const User = mongoose.model('User', userSchema);

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: {
    type: [String],
    validate: {
      validator: (v) => Array.isArray(v) && v.length === 4,
      message: 'Exactly 4 options required'
    },
    required: true
  },
  correctOptionIndex: { type: Number, required: true, min: 0, max: 3 },
  category: { type: String, default: 'Computer Science' },
  createdAt: { type: Date, default: Date.now }
});
const Question = mongoose.model('Question', questionSchema);

const resultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  country: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  quizVersion: { type: Number, required: true },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedIndex: Number,
    correctIndex: Number,
    isCorrect: Boolean
  }],
  submittedAt: { type: Date, default: Date.now }
});
const Result = mongoose.model('Result', resultSchema);

const metaSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  quizVersion: { type: Number, default: 1 },
  lastUpdated: { type: Date, default: Date.now }
});
const Meta = mongoose.model('Meta', metaSchema);

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

async function getQuizVersion() {
  let meta = await Meta.findOne({ key: 'quiz' });
  if (!meta) {
    meta = await Meta.create({ key: 'quiz', quizVersion: 1 });
  }
  return meta.quizVersion;
}

async function bumpQuizVersion() {
  const meta = await Meta.findOneAndUpdate(
    { key: 'quiz' },
    { $inc: { quizVersion: 1 }, lastUpdated: new Date() },
    { upsert: true, new: true }
  );
  // Reset all user attempt flags so they can take the new version
  await User.updateMany({}, { hasAttempted: false });
  return meta.quizVersion;
}

// ─────────────────────────────────────────────────────────────
// Seed Data – 30 Computer Science MCQs
// ─────────────────────────────────────────────────────────────

const SEED_QUESTIONS = [
  // Hardware (6)
  {
    questionText: "Which component is considered the 'brain' of the computer?",
    options: ["RAM", "CPU", "Hard Disk", "GPU"],
    correctOptionIndex: 1,
    category: "Hardware"
  },
  {
    questionText: "What does SSD stand for?",
    options: ["Solid State Drive", "System Storage Device", "Serial Storage Disk", "Static State Drive"],
    correctOptionIndex: 0,
    category: "Hardware"
  },
  {
    questionText: "Which of the following is a non-volatile memory?",
    options: ["RAM", "Cache", "ROM", "Register"],
    correctOptionIndex: 2,
    category: "Hardware"
  },
  {
    questionText: "The main function of a GPU is to:",
    options: ["Store data permanently", "Process graphics and parallel computations", "Manage network connections", "Control input devices"],
    correctOptionIndex: 1,
    category: "Hardware"
  },
  {
    questionText: "Which bus is used to transfer data between the CPU and RAM?",
    options: ["Address Bus", "Control Bus", "Data Bus", "System Bus"],
    correctOptionIndex: 2,
    category: "Hardware"
  },
  {
    questionText: "What is the typical voltage range for modern computer power supplies (ATX)?",
    options: ["3.3V, 5V, 12V", "1.5V, 3V, 9V", "5V, 9V, 15V", "12V only"],
    correctOptionIndex: 0,
    category: "Hardware"
  },
  // Networking (6)
  {
    questionText: "What does IP stand for in networking?",
    options: ["Internet Protocol", "Internal Process", "Information Packet", "Interface Port"],
    correctOptionIndex: 0,
    category: "Networking"
  },
  {
    questionText: "Which protocol is used to send email?",
    options: ["FTP", "HTTP", "SMTP", "SNMP"],
    correctOptionIndex: 2,
    category: "Networking"
  },
  {
    questionText: "The default port number for HTTPS is:",
    options: ["80", "21", "443", "25"],
    correctOptionIndex: 2,
    category: "Networking"
  },
  {
    questionText: "Which device operates at the Network Layer of the OSI model?",
    options: ["Hub", "Switch", "Router", "Repeater"],
    correctOptionIndex: 2,
    category: "Networking"
  },
  {
    questionText: "What is the purpose of DNS?",
    options: ["Encrypt data", "Translate domain names to IP addresses", "Route packets", "Manage bandwidth"],
    correctOptionIndex: 1,
    category: "Networking"
  },
  {
    questionText: "IPv6 addresses are how many bits long?",
    options: ["32", "64", "128", "256"],
    correctOptionIndex: 2,
    category: "Networking"
  },
  // Operating Systems (6)
  {
    questionText: "Which of the following is NOT an operating system?",
    options: ["Linux", "Windows", "Oracle", "macOS"],
    correctOptionIndex: 2,
    category: "Operating Systems"
  },
  {
    questionText: "What is a process in an operating system?",
    options: ["A program in execution", "A file on disk", "A hardware component", "A network packet"],
    correctOptionIndex: 0,
    category: "Operating Systems"
  },
  {
    questionText: "Which scheduling algorithm gives the CPU to the process with the shortest burst time next?",
    options: ["FCFS", "Round Robin", "SJF", "Priority"],
    correctOptionIndex: 2,
    category: "Operating Systems"
  },
  {
    questionText: "Virtual memory is typically implemented using:",
    options: ["Registers", "Cache", "Paging / Demand Paging", "Only RAM"],
    correctOptionIndex: 2,
    category: "Operating Systems"
  },
  {
    questionText: "A deadlock can occur when which condition is present?",
    options: ["Mutual exclusion, Hold and wait, No preemption, Circular wait", "Only mutual exclusion", "Only preemption", "Only CPU scheduling"],
    correctOptionIndex: 0,
    category: "Operating Systems"
  },
  {
    questionText: "The command to list running processes in Linux is:",
    options: ["ls", "ps", "cd", "mkdir"],
    correctOptionIndex: 1,
    category: "Operating Systems"
  },
  // Programming (6)
  {
    questionText: "Which of the following is a strongly typed language?",
    options: ["JavaScript", "Python", "Java", "PHP (loosely)"],
    correctOptionIndex: 2,
    category: "Programming"
  },
  {
    questionText: "What does OOP stand for?",
    options: ["Object Oriented Programming", "Open Object Protocol", "Ordered Output Process", "Optional Object Pattern"],
    correctOptionIndex: 0,
    category: "Programming"
  },
  {
    questionText: "In JavaScript, which keyword is used to declare a block-scoped variable?",
    options: ["var", "let", "const (also block-scoped)", "Both let and const"],
    correctOptionIndex: 3,
    category: "Programming"
  },
  {
    questionText: "Which data structure uses LIFO (Last In First Out)?",
    options: ["Queue", "Stack", "Array", "Linked List"],
    correctOptionIndex: 1,
    category: "Programming"
  },
  {
    questionText: "Time complexity of binary search on a sorted array is:",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correctOptionIndex: 1,
    category: "Programming"
  },
  {
    questionText: "Which of the following is NOT a primitive data type in Java?",
    options: ["int", "boolean", "String", "char"],
    correctOptionIndex: 2,
    category: "Programming"
  },
  // Data Structures (6)
  {
    questionText: "Which data structure is best for implementing a priority queue?",
    options: ["Array", "Linked List", "Heap", "Stack"],
    correctOptionIndex: 2,
    category: "Data Structures"
  },
  {
    questionText: "In a binary search tree, the left child is always:",
    options: ["Greater than parent", "Less than parent", "Equal to parent", "Unrelated"],
    correctOptionIndex: 1,
    category: "Data Structures"
  },
  {
    questionText: "What is the worst-case time complexity of inserting into a hash table (with chaining)?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
    correctOptionIndex: 2,
    category: "Data Structures"
  },
  {
    questionText: "A graph with no cycles is called a:",
    options: ["Cyclic graph", "Tree (if connected)", "Complete graph", "Weighted graph"],
    correctOptionIndex: 1,
    category: "Data Structures"
  },
  {
    questionText: "Which traversal visits the root first, then left subtree, then right subtree?",
    options: ["Inorder", "Preorder", "Postorder", "Level order"],
    correctOptionIndex: 1,
    category: "Data Structures"
  },
  {
    questionText: "The space complexity of a recursive factorial function (naive) is:",
    options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
    correctOptionIndex: 1,
    category: "Data Structures"
  }
];

async function seedDatabase() {
  const qCount = await Question.countDocuments();
  if (qCount === 0) {
    await Question.insertMany(SEED_QUESTIONS);
    console.log(`✅ Seeded ${SEED_QUESTIONS.length} Computer Science MCQs`);
  }
  let meta = await Meta.findOne({ key: 'quiz' });
  if (!meta) {
    await Meta.create({ key: 'quiz', quizVersion: 1 });
    console.log('✅ Initialized quiz meta (version 1)');
  }
}

// ─────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────

// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get current quiz version & question count
app.get('/api/quiz/info', async (req, res) => {
  try {
    const version = await getQuizVersion();
    const total = await Question.countDocuments();
    res.json({ quizVersion: version, totalQuestions: total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start / Check eligibility
app.post('/api/start', async (req, res) => {
  try {
    const { name, country } = req.body;
    if (!name || !country) {
      return res.status(400).json({ error: 'Name and Country are required' });
    }
    const ip = getClientIp(req);
    const version = await getQuizVersion();

    // Find existing user by name+country+ip (primary) or name+country
    let user = await User.findOne({ name: name.trim(), country: country.trim(), ipAddress: ip });
    if (!user) {
      // Also check if same name+country already attempted from different IP (optional strictness)
      user = await User.findOne({ name: name.trim(), country: country.trim() });
    }

    if (user && user.hasAttempted && user.lastAttemptVersion === version) {
      return res.json({
        eligible: false,
        message: 'You have already completed this version of the quiz. Please check back when new questions are published!',
        userId: user._id
      });
    }

    // Create or update user
    if (!user) {
      user = await User.create({
        name: name.trim(),
        country: country.trim(),
        ipAddress: ip,
        hasAttempted: false,
        lastAttemptVersion: 0
      });
    } else {
      // Update IP if changed and reset attempt if version changed
      user.ipAddress = ip;
      if (user.lastAttemptVersion !== version) {
        user.hasAttempted = false;
      }
      await user.save();
    }

    // Fetch questions (without correct answers)
    const questions = await Question.find({}).select('-correctOptionIndex').lean();
    // Shuffle for fairness (simple Fisher-Yates)
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    res.json({
      eligible: true,
      userId: user._id,
      quizVersion: version,
      questions: questions.map(q => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        category: q.category
      })),
      totalQuestions: questions.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Submit answers
app.post('/api/submit', async (req, res) => {
  try {
    const { userId, name, country, answers } = req.body; // answers: [{ questionId, selectedIndex }]
    if (!userId || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Invalid submission' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const version = await getQuizVersion();
    if (user.hasAttempted && user.lastAttemptVersion === version) {
      return res.status(403).json({ error: 'You have already submitted this version of the quiz.' });
    }

    const questionIds = answers.map(a => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const qMap = {};
    questions.forEach(q => { qMap[q._id.toString()] = q; });

    let score = 0;
    const detailed = [];
    for (const ans of answers) {
      const q = qMap[ans.questionId];
      if (!q) continue;
      const isCorrect = Number(ans.selectedIndex) === q.correctOptionIndex;
      if (isCorrect) score++;
      detailed.push({
        questionId: q._id,
        questionText: q.questionText,
        options: q.options,
        selectedIndex: ans.selectedIndex,
        correctIndex: q.correctOptionIndex,
        isCorrect
      });
    }

    const totalQuestions = questions.length || answers.length;

    // Save result
    const result = await Result.create({
      userId: user._id,
      name: name || user.name,
      country: country || user.country,
      score,
      totalQuestions,
      quizVersion: version,
      answers: detailed.map(d => ({
        questionId: d.questionId,
        selectedIndex: d.selectedIndex,
        correctIndex: d.correctIndex,
        isCorrect: d.isCorrect
      }))
    });

    // Mark attempted
    user.hasAttempted = true;
    user.lastAttemptVersion = version;
    await user.save();

    res.json({
      success: true,
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
      detailed,
      resultId: result._id,
      quizVersion: version
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Weekly progress
app.post('/api/progress', async (req, res) => {
  try {
    const { name, country } = req.body;
    if (!name || !country) {
      return res.status(400).json({ error: 'Name and Country required' });
    }
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const results = await Result.find({
      name: name.trim(),
      country: country.trim(),
      submittedAt: { $gte: sevenDaysAgo }
    }).sort({ submittedAt: -1 }).lean();

    res.json({
      name: name.trim(),
      country: country.trim(),
      results: results.map(r => ({
        score: r.score,
        totalQuestions: r.totalQuestions,
        percentage: Math.round((r.score / r.totalQuestions) * 100),
        quizVersion: r.quizVersion,
        submittedAt: r.submittedAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin Routes ────────────────────────────────────────────

const ADMIN_USER = 'abuobaida313';
const ADMIN_PASS = 'abuobaida313';

// Simple token (not JWT for single-file simplicity; in production use proper auth)
const adminSessions = new Map(); // token -> expiry

function generateToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isAdmin(req) {
  const token = req.headers['x-admin-token'];
  if (!token) return false;
  const exp = adminSessions.get(token);
  if (!exp || Date.now() > exp) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = generateToken();
    adminSessions.set(token, Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    return res.json({ success: true, token });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) adminSessions.delete(token);
  res.json({ success: true });
});

// Questions CRUD
app.get('/api/admin/questions', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const questions = await Question.find({}).sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/questions', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { questionText, options, correctOptionIndex, category } = req.body;
    if (!questionText || !Array.isArray(options) || options.length !== 4 || correctOptionIndex === undefined) {
      return res.status(400).json({ error: 'Invalid question data' });
    }
    const q = await Question.create({
      questionText,
      options,
      correctOptionIndex: Number(correctOptionIndex),
      category: category || 'Computer Science'
    });
    const newVersion = await bumpQuizVersion();
    res.json({ question: q, quizVersion: newVersion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/questions/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { questionText, options, correctOptionIndex, category } = req.body;
    const q = await Question.findByIdAndUpdate(
      req.params.id,
      { questionText, options, correctOptionIndex, category },
      { new: true, runValidators: true }
    );
    if (!q) return res.status(404).json({ error: 'Question not found' });
    const newVersion = await bumpQuizVersion();
    res.json({ question: q, quizVersion: newVersion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/questions/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const q = await Question.findByIdAndDelete(req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found' });
    const newVersion = await bumpQuizVersion();
    res.json({ success: true, quizVersion: newVersion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Users management
app.get('/api/admin/users', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/reset', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { hasAttempted: false, lastAttemptVersion: 0 },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await User.findByIdAndDelete(req.params.id);
    // Optionally also delete their results
    await Result.deleteMany({ userId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Force global reset of attempts
app.post('/api/admin/reset-attempts', async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
  try {
    await User.updateMany({}, { hasAttempted: false });
    const version = await bumpQuizVersion();
    res.json({ success: true, quizVersion: version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// Serve React SPA (single HTML with embedded React)
// ─────────────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CS MCQ Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    :root {
      --navy-900: #0A192F;
      --navy-800: #112240;
      --navy-700: #1E3A5F;
      --navy-600: #2A4A6F;
      --navy-500: #3B6A9A;
      --accent: #64B5F6;
      --accent-dark: #42A5F5;
      --success: #4CAF50;
      --error: #EF5350;
      --warning: #FFA726;
      --white: #FFFFFF;
      --gray-100: #F8FAFC;
      --gray-200: #E2E8F0;
      --gray-400: #94A3B8;
      --gray-600: #64748B;
      --shadow: 0 10px 40px rgba(10, 25, 47, 0.15);
      --radius: 16px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: linear-gradient(160deg, #0A192F 0%, #112240 40%, #1E3A5F 100%);
      min-height: 100vh;
      color: var(--navy-900);
    }
    #root { min-height: 100vh; display: flex; flex-direction: column; }
    .navbar {
      background: rgba(10, 25, 47, 0.95);
      backdrop-filter: blur(12px);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(100, 181, 246, 0.15);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      font-weight: 700;
      font-size: 1.25rem;
      color: var(--white);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo span {
      background: linear-gradient(135deg, var(--accent), #90CAF9);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-actions { display: flex; gap: 12px; align-items: center; }
    .btn {
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-dark));
      color: var(--navy-900);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(100,181,246,0.35); }
    .btn-outline {
      background: transparent;
      color: var(--white);
      border: 1px solid rgba(255,255,255,0.3);
    }
    .btn-outline:hover { background: rgba(255,255,255,0.1); }
    .btn-ghost {
      background: rgba(255,255,255,0.08);
      color: var(--white);
    }
    .btn-danger { background: var(--error); color: white; }
    .btn-success { background: var(--success); color: white; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }

    .main {
      flex: 1;
      display: flex;
      justify-content: center;
      padding: 32px 16px 48px;
    }
    .card {
      background: var(--white);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      width: 100%;
      max-width: 640px;
      overflow: hidden;
    }
    .card-header {
      background: linear-gradient(135deg, var(--navy-800), var(--navy-700));
      color: white;
      padding: 28px 28px 24px;
      text-align: center;
      position: relative;
    }
    .card-body { padding: 28px; }
    .card-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 6px; }
    .card-sub { opacity: 0.85; font-size: 0.95rem; }

    .form-group { margin-bottom: 18px; }
    .form-group label {
      display: block;
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--gray-600);
      margin-bottom: 6px;
    }
    .form-control {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid var(--gray-200);
      border-radius: 10px;
      font-size: 1rem;
      font-family: inherit;
      transition: border-color 0.2s;
      background: var(--gray-100);
    }
    .form-control:focus {
      outline: none;
      border-color: var(--accent);
      background: white;
      box-shadow: 0 0 0 3px rgba(100,181,246,0.2);
    }

    /* Progress bar */
    .progress-wrap {
      background: rgba(255,255,255,0.15);
      border-radius: 99px;
      height: 8px;
      overflow: hidden;
      margin: 16px 0 8px;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #90CAF9);
      border-radius: 99px;
      transition: width 0.35s ease;
    }
    .q-counter {
      font-size: 0.85rem;
      opacity: 0.9;
      display: flex;
      justify-content: space-between;
    }

    /* Options */
    .option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border: 2px solid var(--gray-200);
      border-radius: 12px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--gray-100);
    }
    .option:hover { border-color: var(--accent); background: #E3F2FD; }
    .option.selected {
      border-color: var(--accent);
      background: #E3F2FD;
      box-shadow: 0 0 0 3px rgba(100,181,246,0.2);
    }
    .option.correct { border-color: var(--success); background: #E8F5E9; }
    .option.wrong { border-color: var(--error); background: #FFEBEE; }
    .option input { display: none; }
    .option-letter {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: var(--navy-700);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem;
      flex-shrink: 0;
    }
    .option.selected .option-letter { background: var(--accent); color: var(--navy-900); }
    .option.correct .option-letter { background: var(--success); }
    .option.wrong .option-letter { background: var(--error); }

    /* Score circle */
    .score-circle {
      width: 140px; height: 140px;
      border-radius: 50%;
      background: conic-gradient(var(--accent) calc(var(--pct) * 1%), rgba(255,255,255,0.2) 0);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px;
      position: relative;
    }
    .score-circle::before {
      content: '';
      position: absolute;
      inset: 12px;
      background: var(--navy-800);
      border-radius: 50%;
    }
    .score-inner {
      position: relative;
      z-index: 1;
      text-align: center;
      color: white;
    }
    .score-value { font-size: 2rem; font-weight: 700; line-height: 1.1; }
    .score-label { font-size: 0.8rem; opacity: 0.8; }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 20px 0;
    }
    .stat-box {
      background: var(--gray-100);
      border-radius: 12px;
      padding: 14px;
      text-align: center;
    }
    .stat-box .num { font-size: 1.4rem; font-weight: 700; color: var(--navy-800); }
    .stat-box .lbl { font-size: 0.75rem; color: var(--gray-600); margin-top: 2px; }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 8px;
    }
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 8px;
      border-radius: 12px;
      background: var(--gray-100);
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--navy-800);
      transition: all 0.2s;
    }
    .action-btn:hover { background: #E3F2FD; color: var(--navy-700); }
    .action-btn svg { width: 22px; height: 22px; }

    /* Result breakdown */
    .breakdown-item {
      border: 1px solid var(--gray-200);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .breakdown-item.correct { border-left: 4px solid var(--success); }
    .breakdown-item.wrong { border-left: 4px solid var(--error); }
    .b-q { font-weight: 600; margin-bottom: 8px; font-size: 0.95rem; }
    .b-ans { font-size: 0.85rem; color: var(--gray-600); }

    /* Tables */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid var(--gray-200); }
    th { font-weight: 600; color: var(--gray-600); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
    tr:hover td { background: var(--gray-100); }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(10,25,47,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 200;
      padding: 16px;
    }
    .modal {
      background: white;
      border-radius: var(--radius);
      width: 100%;
      max-width: 420px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0,0,0,0.3);
    }
    .modal-header {
      background: linear-gradient(135deg, var(--navy-800), var(--navy-700));
      color: white;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-body { padding: 24px; }
    .close-btn {
      background: transparent;
      border: none;
      color: white;
      font-size: 1.4rem;
      cursor: pointer;
      line-height: 1;
      opacity: 0.8;
    }
    .close-btn:hover { opacity: 1; }

    /* Admin */
    .admin-tabs {
      display: flex;
      gap: 4px;
      background: var(--gray-100);
      padding: 4px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .admin-tab {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      background: transparent;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      color: var(--gray-600);
    }
    .admin-tab.active {
      background: white;
      color: var(--navy-800);
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .admin-layout { max-width: 960px; }
    .q-list-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 14px;
      border: 1px solid var(--gray-200);
      border-radius: 12px;
      margin-bottom: 10px;
    }
    .q-list-item .q-text { flex: 1; font-size: 0.9rem; }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 600;
      background: #E3F2FD;
      color: var(--navy-700);
    }

    .alert {
      padding: 14px 16px;
      border-radius: 10px;
      margin-bottom: 16px;
      font-size: 0.9rem;
    }
    .alert-info { background: #E3F2FD; color: #1565C0; }
    .alert-warning { background: #FFF3E0; color: #E65100; }
    .alert-success { background: #E8F5E9; color: #2E7D32; }
    .alert-error { background: #FFEBEE; color: #C62828; }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--gray-600);
    }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid var(--gray-200);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .footer-note {
      text-align: center;
      color: rgba(255,255,255,0.5);
      font-size: 0.8rem;
      padding: 16px;
    }

    @media (max-width: 560px) {
      .stats-row, .action-grid { grid-template-columns: 1fr; }
      .card-body { padding: 20px; }
      .navbar { padding: 12px 16px; }
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useCallback, useRef } = React;

    // ── API helpers ──────────────────────────────────────────
    async function api(path, options = {}) {
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      const token = localStorage.getItem('adminToken');
      if (token) headers['x-admin-token'] = token;
      const res = await fetch('/api' + path, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      return data;
    }

    // ── Icons (simple SVG) ───────────────────────────────────
    const Icon = ({ d, size = 22 }) => (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </svg>
    );

    // ── Main App ─────────────────────────────────────────────
    function App() {
      const [view, setView] = useState('entry'); // entry | quiz | result | progress | admin
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState('');
      const [user, setUser] = useState({ name: '', country: '', userId: null });
      const [questions, setQuestions] = useState([]);
      const [answers, setAnswers] = useState({}); // qId -> selectedIndex
      const [currentQ, setCurrentQ] = useState(0);
      const [result, setResult] = useState(null);
      const [progressData, setProgressData] = useState(null);
      const [showAdminLogin, setShowAdminLogin] = useState(false);
      const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('adminToken'));
      const [quizInfo, setQuizInfo] = useState({ totalQuestions: 30, quizVersion: 1 });

      useEffect(() => {
        api('/quiz/info').then(setQuizInfo).catch(() => {});
      }, []);

      const startQuiz = async (name, country) => {
        setLoading(true);
        setError('');
        try {
          const data = await api('/start', {
            method: 'POST',
            body: JSON.stringify({ name, country })
          });
          if (!data.eligible) {
            setError(data.message);
            setUser({ name, country, userId: data.userId });
            setLoading(false);
            return;
          }
          setUser({ name, country, userId: data.userId });
          setQuestions(data.questions);
          setAnswers({});
          setCurrentQ(0);
          setView('quiz');
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };

      const submitQuiz = async () => {
        setLoading(true);
        setError('');
        try {
          const payload = {
            userId: user.userId,
            name: user.name,
            country: user.country,
            answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({
              questionId,
              selectedIndex: Number(selectedIndex)
            }))
          };
          const data = await api('/submit', { method: 'POST', body: JSON.stringify(payload) });
          setResult(data);
          setView('result');
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };

      const loadProgress = async (name, country) => {
        setLoading(true);
        setError('');
        try {
          const data = await api('/progress', {
            method: 'POST',
            body: JSON.stringify({ name, country })
          });
          setProgressData(data);
          setView('progress');
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };

      const handleAdminLogin = async (username, password) => {
        setLoading(true);
        setError('');
        try {
          const data = await api('/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
          });
          localStorage.setItem('adminToken', data.token);
          setIsAdmin(true);
          setShowAdminLogin(false);
          setView('admin');
        } catch (e) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };

      const logoutAdmin = () => {
        localStorage.removeItem('adminToken');
        setIsAdmin(false);
        setView('entry');
      };

      return (
        <>
          <nav className="navbar">
            <div className="logo" onClick={() => setView('entry')} style={{cursor:'pointer'}}>
              <span>📘 CS MCQ Portal</span>
            </div>
            <div className="nav-actions">
              <button className="btn btn-ghost" onClick={() => setView('progress')}>
                Check Progress
              </button>
              {isAdmin ? (
                <>
                  <button className="btn btn-outline" onClick={() => setView('admin')}>Admin</button>
                  <button className="btn btn-outline" onClick={logoutAdmin}>Logout</button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowAdminLogin(true)}>
                  Admin Login
                </button>
              )}
            </div>
          </nav>

          <main className="main">
            {view === 'entry' && (
              <EntryScreen
                onStart={startQuiz}
                loading={loading}
                error={error}
                setError={setError}
                quizInfo={quizInfo}
                onProgress={() => setView('progress')}
              />
            )}
            {view === 'quiz' && (
              <QuizScreen
                questions={questions}
                answers={answers}
                setAnswers={setAnswers}
                currentQ={currentQ}
                setCurrentQ={setCurrentQ}
                onSubmit={submitQuiz}
                loading={loading}
                error={error}
              />
            )}
            {view === 'result' && result && (
              <ResultScreen
                result={result}
                onHome={() => { setView('entry'); setResult(null); setQuestions([]); }}
                onProgress={() => setView('progress')}
              />
            )}
            {view === 'progress' && (
              <ProgressScreen
                data={progressData}
                onLoad={loadProgress}
                loading={loading}
                error={error}
                setError={setError}
                onBack={() => setView('entry')}
              />
            )}
            {view === 'admin' && isAdmin && (
              <AdminDashboard onLogout={logoutAdmin} />
            )}
          </main>

          {showAdminLogin && (
            <AdminLoginModal
              onLogin={handleAdminLogin}
              onClose={() => { setShowAdminLogin(false); setError(''); }}
              loading={loading}
              error={error}
            />
          )}

          <div className="footer-note">CS MCQ Portal • One attempt per quiz version • Powered by MERN</div>
        </>
      );
    }

    // ── Entry Screen ─────────────────────────────────────────
    function EntryScreen({ onStart, loading, error, setError, quizInfo, onProgress }) {
      const [name, setName] = useState('');
      const [country, setCountry] = useState('');

      const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !country.trim()) {
          setError('Please enter both Name and Country');
          return;
        }
        onStart(name.trim(), country.trim());
      };

      return (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Welcome to CS MCQ Portal</div>
            <div className="card-sub">
              {quizInfo.totalQuestions} Computer Science questions • Version {quizInfo.quizVersion}
            </div>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-warning">{error}</div>}
            <p style={{marginBottom:20, color:'var(--gray-600)', fontSize:'0.95rem'}}>
              Enter your details to begin. You may take each version of the quiz only once.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Chen" required />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input className="form-control" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. South Korea" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%', padding:'14px'}} disabled={loading}>
                {loading ? 'Checking eligibility…' : 'Start Quiz'}
              </button>
            </form>
            <button className="btn btn-ghost" style={{width:'100%', marginTop:12, color:'var(--navy-700)'}} onClick={onProgress}>
              Already taken it? View My Progress
            </button>
          </div>
        </div>
      );
    }

    // ── Quiz Screen ──────────────────────────────────────────
    function QuizScreen({ questions, answers, setAnswers, currentQ, setCurrentQ, onSubmit, loading, error }) {
      const q = questions[currentQ];
      if (!q) return <div className="card"><div className="card-body"><div className="spinner" /></div></div>;

      const total = questions.length;
      const answeredCount = Object.keys(answers).length;
      const pct = Math.round(((currentQ + 1) / total) * 100);
      const selected = answers[q._id];

      const select = (idx) => {
        setAnswers(prev => ({ ...prev, [q._id]: idx }));
      };

      const next = () => { if (currentQ < total - 1) setCurrentQ(c => c + 1); };
      const prev = () => { if (currentQ > 0) setCurrentQ(c => c - 1); };

      const letters = ['A', 'B', 'C', 'D'];

      return (
        <div className="card">
          <div className="card-header">
            <div className="q-counter">
              <span>Question {currentQ + 1} of {total}</span>
              <span>{answeredCount} answered</span>
            </div>
            <div className="progress-wrap">
              <div className="progress-bar" style={{width: pct + '%'}} />
            </div>
            <div style={{marginTop:16, fontSize:'0.85rem', opacity:0.8}}>{q.category || 'Computer Science'}</div>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-error">{error}</div>}
            <h2 style={{fontSize:'1.15rem', marginBottom:20, lineHeight:1.45}}>{q.questionText}</h2>
            {q.options.map((opt, idx) => (
              <label key={idx} className={'option' + (selected === idx ? ' selected' : '')} onClick={() => select(idx)}>
                <div className="option-letter">{letters[idx]}</div>
                <span>{opt}</span>
              </label>
            ))}
            <div style={{display:'flex', gap:10, marginTop:24}}>
              <button className="btn btn-outline" style={{color:'var(--navy-700)', borderColor:'var(--gray-200)'}} onClick={prev} disabled={currentQ === 0}>
                ← Previous
              </button>
              {currentQ < total - 1 ? (
                <button className="btn btn-primary" style={{flex:1}} onClick={next}>
                  Next →
                </button>
              ) : (
                <button className="btn btn-success" style={{flex:1}} onClick={onSubmit} disabled={loading || answeredCount < total}>
                  {loading ? 'Submitting…' : 'Submit Test (' + answeredCount + '/' + total + ')'}
                </button>
              )}
            </div>
            {answeredCount < total && currentQ === total - 1 && (
              <p style={{marginTop:12, fontSize:'0.85rem', color:'var(--warning)', textAlign:'center'}}>
                Please answer all questions before submitting.
              </p>
            )}
          </div>
        </div>
      );
    }

    // ── Result Screen ────────────────────────────────────────
    function ResultScreen({ result, onHome, onProgress }) {
      const pct = result.percentage;
      return (
        <div className="card">
          <div className="card-header">
            <div className="score-circle" style={{'--pct': pct}}>
              <div className="score-inner">
                <div className="score-value">{result.score}/{result.totalQuestions}</div>
                <div className="score-label">Your Score</div>
              </div>
            </div>
            <div className="card-title" style={{marginTop:8}}>{pct}% Correct</div>
            <div className="card-sub">Quiz Version {result.quizVersion}</div>
          </div>
          <div className="card-body">
            <div className="stats-row">
              <div className="stat-box">
                <div className="num" style={{color:'var(--success)'}}>{result.score}</div>
                <div className="lbl">Correct</div>
              </div>
              <div className="stat-box">
                <div className="num" style={{color:'var(--error)'}}>{result.totalQuestions - result.score}</div>
                <div className="lbl">Wrong</div>
              </div>
              <div className="stat-box">
                <div className="num">{result.totalQuestions}</div>
                <div className="lbl">Total</div>
              </div>
            </div>

            <div className="action-grid">
              <button className="action-btn" onClick={onHome}>
                <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                Home
              </button>
              <button className="action-btn" onClick={() => {
                const el = document.getElementById('breakdown');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}>
                <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                Review
              </button>
              <button className="action-btn" onClick={onProgress}>
                <Icon d="M18 20V10 M12 20V4 M6 20v-6" />
                Progress
              </button>
            </div>

            <h3 id="breakdown" style={{margin:'28px 0 14px', fontSize:'1.1rem'}}>Detailed Breakdown</h3>
            {result.detailed && result.detailed.map((item, i) => (
              <div key={i} className={'breakdown-item ' + (item.isCorrect ? 'correct' : 'wrong')}>
                <div className="b-q">{i + 1}. {item.questionText}</div>
                <div className="b-ans">
                  Your answer: <strong>{item.options[item.selectedIndex] ?? '—'}</strong>
                  {!item.isCorrect && (
                    <span> • Correct: <strong style={{color:'var(--success)'}}>{item.options[item.correctIndex]}</strong></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Progress Screen ──────────────────────────────────────
    function ProgressScreen({ data, onLoad, loading, error, setError, onBack }) {
      const [name, setName] = useState(data?.name || '');
      const [country, setCountry] = useState(data?.country || '');

      const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !country.trim()) {
          setError('Name and Country required');
          return;
        }
        onLoad(name.trim(), country.trim());
      };

      return (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Weekly Progress</div>
            <div className="card-sub">Scores from the last 7 days</div>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit} style={{marginBottom:24}}>
              <div className="form-group">
                <label>Name</label>
                <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input className="form-control" value={country} onChange={e => setCountry(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{width:'100%'}} disabled={loading}>
                {loading ? 'Loading…' : 'View Progress'}
              </button>
            </form>

            {data && (
              <>
                <h3 style={{marginBottom:12}}>{data.name} • {data.country}</h3>
                {data.results.length === 0 ? (
                  <div className="empty-state">No attempts found in the last 7 days.</div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Score</th>
                          <th>%</th>
                          <th>Version</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.results.map((r, i) => (
                          <tr key={i}>
                            <td>{new Date(r.submittedAt).toLocaleString()}</td>
                            <td>{r.score}/{r.totalQuestions}</td>
                            <td>{r.percentage}%</td>
                            <td>v{r.quizVersion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
            <button className="btn btn-outline" style={{width:'100%', marginTop:20, color:'var(--navy-700)', borderColor:'var(--gray-200)'}} onClick={onBack}>
              ← Back to Home
            </button>
          </div>
        </div>
      );
    }

    // ── Admin Login Modal ────────────────────────────────────
    function AdminLoginModal({ onLogin, onClose, loading, error }) {
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Admin Login</strong>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-group">
                <label>Username</label>
                <input className="form-control" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{width:'100%'}} disabled={loading}
                onClick={() => onLogin(username, password)}>
                {loading ? 'Logging in…' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Admin Dashboard ──────────────────────────────────────
    function AdminDashboard({ onLogout }) {
      const [tab, setTab] = useState('questions');
      const [questions, setQuestions] = useState([]);
      const [users, setUsers] = useState([]);
      const [loading, setLoading] = useState(false);
      const [msg, setMsg] = useState('');
      const [editQ, setEditQ] = useState(null);
      const [form, setForm] = useState({
        questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, category: 'Computer Science'
      });

      const loadQuestions = useCallback(async () => {
        setLoading(true);
        try {
          const data = await api('/admin/questions');
          setQuestions(data);
        } catch (e) { setMsg(e.message); }
        finally { setLoading(false); }
      }, []);

      const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
          const data = await api('/admin/users');
          setUsers(data);
        } catch (e) { setMsg(e.message); }
        finally { setLoading(false); }
      }, []);

      useEffect(() => {
        if (tab === 'questions') loadQuestions();
        else loadUsers();
      }, [tab, loadQuestions, loadUsers]);

      const saveQuestion = async () => {
        setLoading(true);
        setMsg('');
        try {
          if (editQ) {
            await api('/admin/questions/' + editQ._id, {
              method: 'PUT',
              body: JSON.stringify(form)
            });
            setMsg('Question updated. Quiz version bumped & attempts reset.');
          } else {
            await api('/admin/questions', {
              method: 'POST',
              body: JSON.stringify(form)
            });
            setMsg('Question added. Quiz version bumped & attempts reset.');
          }
          setForm({ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, category: 'Computer Science' });
          setEditQ(null);
          loadQuestions();
        } catch (e) { setMsg(e.message); }
        finally { setLoading(false); }
      };

      const deleteQuestion = async (id) => {
        if (!confirm('Delete this question? This will bump the quiz version.')) return;
        setLoading(true);
        try {
          await api('/admin/questions/' + id, { method: 'DELETE' });
          setMsg('Deleted. Quiz version bumped.');
          loadQuestions();
        } catch (e) { setMsg(e.message); }
        finally { setLoading(false); }
      };

      const resetUser = async (id) => {
        try {
          await api('/admin/users/' + id + '/reset', { method: 'POST' });
          setMsg('User attempt reset.');
          loadUsers();
        } catch (e) { setMsg(e.message); }
      };

      const deleteUser = async (id) => {
        if (!confirm('Permanently delete this user and their results?')) return;
        try {
          await api('/admin/users/' + id, { method: 'DELETE' });
          setMsg('User deleted.');
          loadUsers();
        } catch (e) { setMsg(e.message); }
      };

      const globalReset = async () => {
        if (!confirm('Reset ALL user attempts and bump quiz version?')) return;
        try {
          const data = await api('/admin/reset-attempts', { method: 'POST' });
          setMsg('All attempts reset. New version: ' + data.quizVersion);
        } catch (e) { setMsg(e.message); }
      };

      return (
        <div className="card admin-layout">
          <div className="card-header">
            <div className="card-title">Admin Dashboard</div>
            <div className="card-sub">Manage questions & users</div>
          </div>
          <div className="card-body">
            {msg && <div className="alert alert-info">{msg}</div>}
            <div className="admin-tabs">
              <button className={'admin-tab' + (tab === 'questions' ? ' active' : '')} onClick={() => setTab('questions')}>
                Questions ({questions.length})
              </button>
              <button className={'admin-tab' + (tab === 'users' ? ' active' : '')} onClick={() => setTab('users')}>
                Users ({users.length})
              </button>
            </div>

            {tab === 'questions' && (
              <>
                <h3 style={{marginBottom:12}}>{editQ ? 'Edit Question' : 'Add New Question'}</h3>
                <div className="form-group">
                  <label>Question Text</label>
                  <textarea className="form-control" rows={2} value={form.questionText}
                    onChange={e => setForm(f => ({...f, questionText: e.target.value}))} />
                </div>
                {form.options.map((opt, i) => (
                  <div className="form-group" key={i}>
                    <label>Option {String.fromCharCode(65 + i)}</label>
                    <input className="form-control" value={opt}
                      onChange={e => {
                        const opts = [...form.options];
                        opts[i] = e.target.value;
                        setForm(f => ({...f, options: opts}));
                      }} />
                  </div>
                ))}
                <div className="form-group">
                  <label>Correct Option</label>
                  <select className="form-control" value={form.correctOptionIndex}
                    onChange={e => setForm(f => ({...f, correctOptionIndex: Number(e.target.value)}))}>
                    <option value={0}>A</option>
                    <option value={1}>B</option>
                    <option value={2}>C</option>
                    <option value={3}>D</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input className="form-control" value={form.category}
                    onChange={e => setForm(f => ({...f, category: e.target.value}))} />
                </div>
                <div style={{display:'flex', gap:10, marginBottom:24}}>
                  <button className="btn btn-primary" onClick={saveQuestion} disabled={loading}>
                    {editQ ? 'Update Question' : 'Add Question'}
                  </button>
                  {editQ && (
                    <button className="btn btn-outline" style={{color:'var(--navy-700)'}} onClick={() => {
                      setEditQ(null);
                      setForm({ questionText: '', options: ['', '', '', ''], correctOptionIndex: 0, category: 'Computer Science' });
                    }}>Cancel</button>
                  )}
                </div>

                <h3 style={{marginBottom:12}}>Existing Questions</h3>
                {loading && <div className="spinner" />}
                {questions.map(q => (
                  <div className="q-list-item" key={q._id}>
                    <div className="q-text">
                      <span className="badge">{q.category}</span>
                      <div style={{marginTop:6}}>{q.questionText}</div>
                      <div style={{fontSize:'0.8rem', color:'var(--gray-600)', marginTop:4}}>
                        Correct: {String.fromCharCode(65 + q.correctOptionIndex)}. {q.options[q.correctOptionIndex]}
                      </div>
                    </div>
                    <div style={{display:'flex', gap:6, flexShrink:0}}>
                      <button className="btn btn-outline" style={{padding:'6px 10px', fontSize:'0.8rem', color:'var(--navy-700)'}}
                        onClick={() => {
                          setEditQ(q);
                          setForm({
                            questionText: q.questionText,
                            options: [...q.options],
                            correctOptionIndex: q.correctOptionIndex,
                            category: q.category
                          });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}>Edit</button>
                      <button className="btn btn-danger" style={{padding:'6px 10px', fontSize:'0.8rem'}}
                        onClick={() => deleteQuestion(q._id)}>Del</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === 'users' && (
              <>
                <div style={{marginBottom:16}}>
                  <button className="btn btn-outline" style={{color:'var(--navy-700)'}} onClick={globalReset}>
                    Reset All Attempts + Bump Version
                  </button>
                </div>
                {loading && <div className="spinner" />}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Country</th>
                        <th>IP</th>
                        <th>Attempted</th>
                        <th>Version</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id}>
                          <td>{u.name}</td>
                          <td>{u.country}</td>
                          <td style={{fontSize:'0.8rem'}}>{u.ipAddress}</td>
                          <td>{u.hasAttempted ? '✅' : '—'}</td>
                          <td>{u.lastAttemptVersion}</td>
                          <td>
                            <button className="btn btn-outline" style={{padding:'4px 8px', fontSize:'0.75rem', marginRight:4, color:'var(--navy-700)'}}
                              onClick={() => resetUser(u._id)}>Reset</button>
                            <button className="btn btn-danger" style={{padding:'4px 8px', fontSize:'0.75rem'}}
                              onClick={() => deleteUser(u._id)}>Del</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && !loading && <div className="empty-state">No users yet</div>}
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    // ── Render ───────────────────────────────────────────────
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;

app.get('*', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(HTML);
});

// ─────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 CS MCQ Portal running at http://localhost:${PORT}`);
      console.log(`   Admin: abuobaida313 / abuobaida313`);
      console.log(`   MongoDB: ${MONGODB_URI}\n`);
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();
