// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const path = require('path');
const ejs = require('ejs'); // Import EJS
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'doodles', // Folder name in Cloudinary
        format: async (req, file) => 'png', // Format of the uploaded file
        public_id: (req, file) => `doodle-${Date.now()}` // Public ID for the file
    },
});

const upload = multer({ storage: storage });




const app = express();
const port = process.env.PORT || 3000;
const secretKey = process.env.SECRET_KEY; // Use environment variable

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());
app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs'); // Set EJS as the templating engine
app.set('views', path.join(__dirname, 'views')); // Set the views directory

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB:', err));

// User schema and model
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    bio: { type: String, default: '' },
    characterUrl: { type: String } // Add this field to store the Cloudinary URL
});

const User = mongoose.model('User', userSchema);

// Doodle schema and model
const doodleSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    prompt: String,
    doodleUrl: String,
    date: { type: Date, default: Date.now },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const Doodle = mongoose.model('Doodle', doodleSchema);

// Comment schema and model
const commentSchema = new mongoose.Schema({
    doodleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doodle', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const Comment = mongoose.model('Comment', commentSchema);



// Authentication routes
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).send('Password must be at least 6 characters long, with at least one number, one uppercase letter, and one lowercase letter.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });

        await user.save();
        res.status(201).send('User registered');
    } catch (err) {
        res.status(400).send('Error registering user');
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(400).send('Invalid username or password');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).send('Invalid username or password');
    }
    const token = jwt.sign({ userId: user._id }, secretKey, { expiresIn: '1h' });
    req.session.token = token;
    res.json({ message: 'Login successful', token });
});

// Middleware to check authentication
function authenticate(req, res, next) {
    const token = req.session.token;
    if (!token) {
        return res.status(401).send('Access denied');
    }
    try {
        const decoded = jwt.verify(token, secretKey);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(400).send('Invalid token');
    }
}

// Verify token endpoint
app.get('/verify-token', authenticate, (req, res) => {
    res.status(200).send('Token is valid');
});

// List of daily prompts
const prompts = [
    "A self-portrait", "Your favorite animal", "A landscape", 
    "A portrait of a friend", "An abstract design", "Your favorite food", 
    "A city skyline", "A mythical creature", "Your dream home", 
    // Additional prompts...
];

function getTodayPrompt() {
    const currentDate = new Date();
    const dayOfYear = Math.floor((currentDate - new Date(currentDate.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
    const promptIndex = dayOfYear % prompts.length; // Rotate through prompts
    return prompts[promptIndex];
}

app.get('/prompt', authenticate, (req, res) => {
    const prompt = getTodayPrompt();
    res.json({ prompt });
});

app.post('/doodle', authenticate, upload.single('doodle'), async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const doodle = new Doodle({
            userId: req.userId,
            username: user.username,
            doodleUrl: req.file.path // Cloudinary URL
        });
        await doodle.save();
        res.status(201).json(doodle);
    } catch (err) {
        console.error('Error saving doodle:', err);
        res.status(500).send('Error saving doodle');
    }
});


app.post('/doodle/:id/like', authenticate, async (req, res) => {
    const doodleId = req.params.id;
    const userId = req.userId;

    const doodle = await Doodle.findById(doodleId);
    if (!doodle) {
        return res.status(404).send('Doodle not found');
    }

    if (doodle.likedBy.includes(userId)) {
        return res.status(400).send('Already liked');
    }

    doodle.likes += 1;
    doodle.likedBy.push(userId);
    await doodle.save();

    res.json({ likes: doodle.likes });
});

app.get('/doodles', authenticate, async (req, res) => {
    const doodles = await Doodle.find().populate('userId', 'username');
    res.json(doodles);
});

// User profile routes
app.get('/profile/:username', authenticate, async (req, res) => {
    const username = req.params.username;
    const user = await User.findOne({ username });
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Calculate total likes for the user
    const totalLikes = await Doodle.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, totalLikes: { $sum: "$likes" } } }
    ]);

    const likes = totalLikes.length > 0 ? totalLikes[0].totalLikes : 0;

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        // If the request is an AJAX request, send JSON response
        return res.json({
            username: user.username,
            bio: user.bio,
            likes: likes,
            characterUrl: user.characterUrl // Include the character URL in the JSON response
        });
    } else {
        // Otherwise, render the EJS template
        return res.render('profile', {
            username: user.username,
            bio: user.bio,
            likes: likes,
            characterUrl: user.characterUrl // Include the character URL for rendering
        });
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Post a comment
app.post('/doodle/:id/comment', authenticate, async (req, res) => {
    const doodleId = req.params.id;
    const userId = req.userId;
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).send('Comment cannot be empty');
    }

    try {
        const user = await User.findById(userId);
        const comment = new Comment({
            doodleId,
            userId,
            username: user.username,
            text
        });

        await comment.save();
        res.status(201).json(comment);
    } catch (err) {
        res.status(500).send('Error posting comment');
    }
});

// Get comments for a specific doodle
app.get('/doodle/:id/comments', authenticate, async (req, res) => {
    const doodleId = req.params.id;
    try {
        const comments = await Comment.find({ doodleId }).sort({ date: -1 }); // Sort by most recent
        res.json(comments);
    } catch (err) {
        res.status(500).send('Error fetching comments');
    }
});

app.get('/leaderboard', async (req, res) => {
    try {
        // Aggregate likes per user
        const leaderboard = await Doodle.aggregate([
            { $group: { _id: "$userId", totalLikes: { $sum: "$likes" } } },
            { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
            { $unwind: "$user" },
            { $sort: { totalLikes: -1 } }
        ]);

        res.json(leaderboard);
    } catch (err) {
        res.status(500).send('Error fetching leaderboard');
    }
});

app.post('/save-character', authenticate, async (req, res) => {
    const { bodyColor, eyes, mouth } = req.body;

    try {
        const user = await User.findById(req.userId);
        user.character = { bodyColor, eyes, mouth };
        await user.save();

        res.json({ success: true });
    } catch (err) {
        console.error('Error saving character:', err);
        res.status(500).json({ success: false, error: 'Error saving character' });
    }
});

app.post('/upload-character', authenticate, upload.single('file'), async (req, res) => {
    try {
        console.log('File upload details:', req.file); // Log the entire file object to see what Cloudinary returns

        if (!req.file || !req.file.path) {
            return res.status(400).json({ success: false, error: 'No file uploaded or Cloudinary did not return a valid URL.' });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.characterUrl = req.file.path || req.file.url; // Save the correct URL field from Cloudinary
        await user.save();
        console.log("Character URL saved to user:", user.characterUrl); // Verify that the URL was saved

        res.json({ success: true, url: user.characterUrl });
    } catch (err) {
        console.error('Error saving character:', err);
        res.status(500).json({ success: false, error: 'Error saving character' });
    }
});



app.get('/check-character-url', authenticate, async (req, res) => {
    const user = await User.findById(req.userId);
    res.json({ characterUrl: user.characterUrl });
});