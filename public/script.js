const socket = io();

// Elements
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');
const welcomeMessage = document.getElementById('welcome-message');
const messages = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const clearChatButton = document.getElementById('clear-chat-button');

let username = '';

// Register
registerButton.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    alert(data.message || data.error);
});

// Login
loginButton.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
        authContainer.style.display = 'none';
        chatContainer.style.display = 'block';
        welcomeMessage.textContent = username;

        socket.emit('authenticate', { username });
    } else {
        alert(data.error);
    }
});

// Chat
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', message);
        messageInput.value = '';
    }
});

socket.on('chat message', (msg) => {
    const messageElement = document.createElement('div');
    messageElement.textContent = `${msg.username}: ${msg.message}`;
    messages.appendChild(messageElement);
});

socket.on('previous messages', (msgs) => {
    msgs.forEach((msg) => {
        const messageElement = document.createElement('div');
        messageElement.textContent = `${msg.username}: ${msg.message}`;
        messages.appendChild(messageElement);
    });
});

// Clear Chat Button
clearChatButton.addEventListener('click', () => {
    // Remove all child elements in the messages container
    while (messages.firstChild) {
        messages.removeChild(messages.firstChild);
    }
});