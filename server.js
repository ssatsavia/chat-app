const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files from the public directory

// MongoDB connection
mongoose
    .connect('mongodb://localhost/chat', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Message schema
const messageSchema = new mongoose.Schema({
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html'); // Single combined page for login/register
});

// Clear Chat Endpoint
app.delete('/clear-chat', async (req, res) => {
    try {
        await Message.deleteMany({}); // Delete all messages from the database
        console.log('All chat messages cleared.');
        res.status(200).json({ message: 'Chat cleared successfully.' });
    } catch (error) {
        console.error('Error clearing chat:', error);
        res.status(500).json({ error: 'Failed to clear chat.' });
    }
});

// Register endpoint
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();

        res.status(201).json({ message: 'User registered successfully. You can now log in!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        res.status(200).json({ message: 'Login successful', username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('authenticate', async ({ username }) => {
        const user = await User.findOne({ username });
        if (user) {
            socket.username = username;
            socket.emit('authenticated', username);

            const messages = await Message.find().sort({ timestamp: 1 });
            socket.emit('previous messages', messages);
        } else {
            socket.emit('auth error', 'Authentication failed. Please log in again.');
            socket.disconnect();
        }
    });

    socket.on('chat message', async (msg) => {
        if (!socket.username) return;

        const message = new Message({ username: socket.username, message: msg });
        await message.save();

        io.emit('chat message', { username: socket.username, message: msg });
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.username || socket.id} disconnected.`);
    });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});