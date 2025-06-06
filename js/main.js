// Configuration
const CONTRACT_ADDRESS = "KT1Ek4Nxu4XpQykpGLwaNtUJSWKuVpXFUJoy";
const NETWORK = "mainnet";
const RPC_URL = "https://rpc.tzbeta.net";
const TZKT_API_URL = "https://api.tzkt.io/v1/bigmaps/743755/keys";

// State variables
let wallet = null;
let userAddress = null;
let messages = [];
let replyTo = null;
let isConnected = false;
let initialLoadComplete = false;

// DOM Elements
const connectWalletBtn = document.getElementById("connect-wallet");
const walletAddressEl = document.getElementById("wallet-address");
const messagesContainer = document.getElementById("messages-container");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const loadingMessages = document.getElementById("loading-messages");
const replyPreview = document.getElementById("reply-preview");
const replyText = document.getElementById("reply-text");
const cancelReply = document.getElementById("cancel-reply");
const notification = document.getElementById("notification");
const emojiBtn = document.getElementById("emoji-btn");
const gifBtn = document.getElementById("gif-btn");
const emojiPicker = document.getElementById("emoji-picker");
const gifPicker = document.getElementById("gif-picker");
const emojiGrid = document.getElementById("emoji-grid");
const gifGrid = document.getElementById("gif-grid");
const gifSearch = document.getElementById("gif-search");
const loadingGifs = document.getElementById("loading-gifs");
const notificationMessage = document.getElementById(
        "notification-message");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
let isDarkMode = false;

// Add these DOM elements to your existing DOM Elements section
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

// Add this function to initialize theme
function initializeTheme() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem("teztrollbox-theme");

    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        isDarkMode = true;
        enableDarkMode();
    } else {
        isDarkMode = false;
        enableLightMode();
    }
}

// Function to enable dark mode
function enableDarkMode() {
    document.documentElement.setAttribute("data-theme", "dark");
    themeToggle.classList.add("active");
    themeIcon.className = "fas fa-sun";
    isDarkMode = true;
    localStorage.setItem("teztrollbox-theme", "dark");
}

// Function to enable light mode
function enableLightMode() {
    document.documentElement.removeAttribute("data-theme"); // Remove completely, don't set to "light"
    themeToggle.classList.remove("active");
    themeIcon.className = "fas fa-moon";
    isDarkMode = false;
    localStorage.setItem("teztrollbox-theme", "light");
}

// Function to toggle theme
function toggleTheme() {
    if (isDarkMode) {
        enableLightMode();
    } else {
        enableDarkMode();
    }
}

function setupMessagePolling() {
    // Initial load
    loadMessages();

    // Set up interval for polling (every 3 seconds)
    setInterval(() => {
        loadMessages();
    }, 3000);
}
// Initialize
async function init() {
    initializeTheme();
    setupMessagePolling();
    // Initialize Beacon SDK
    const {
        DAppClient
    } = beacon;

    wallet = new DAppClient({
        name: "TezTrollBox",
        preferredNetwork: NETWORK,
    });

    // Check if user is already connected
    const activeAccount = await wallet.getActiveAccount();
    if (activeAccount) {
        userAddress = activeAccount.address;
        walletAddressEl.textContent = shortenAddress(userAddress);
        connectWalletBtn.textContent = "Disconnect";
        isConnected = true;
    }

    // Event listeners
    connectWalletBtn.addEventListener("click", toggleWalletConnection);
    messageInput.addEventListener("input", handleInput);
    sendBtn.addEventListener("click", sendMessage);
    cancelReply.addEventListener("click", cancelReplyToMessage);
    emojiBtn.addEventListener("click", toggleEmojiPicker);
    gifBtn.addEventListener("click", toggleGifPicker);
    gifSearch.addEventListener("input", debounce(searchGifs, 500));
    document.addEventListener("click", handleOutsideClick);
    themeToggle.addEventListener("click", toggleTheme);
    // Ensure reply preview is initially hidden
    replyPreview.classList.remove("show");
    document.querySelectorAll(".emoji-category").forEach((category) => {
        category.addEventListener("click", function () {
            loadEmojis(this.dataset.category);
        });
    });
    // Auto-resize textarea
    messageInput.addEventListener("input", function () {
        this.style.height = "auto";
        this.style.height = this.scrollHeight + "px";
    });
}
function initEmojiPicker() {
    // Initialize with the default category (recent/common)
    loadEmojis("recent");
}

// Load emojis by category
function loadEmojis(category) {
    const emojiSets = {
        recent: [
            "😀",
            "😃",
            "😄",
            "😁",
            "😆",
            "😅",
            "😂",
            "🤣",
            "😊",
            "😇",
            "🙂",
            "🙃",
            "😉",
            "😌",
            "😍",
            "🥰",
            "😘",
            "😗",
            "😙",
            "😚",
            "😋",
            "😛",
            "😝",
            "😜",
            "🤪",
            "🤨",
            "🧐",
            "🤓",
            "😎",
            "🤩",
            "👍",
            "👎",
            "👏",
            "🙌",
        ],
        smileys: [
            "😀",
            "😃",
            "😄",
            "😁",
            "😆",
            "😅",
            "😂",
            "🤣",
            "☺️",
            "😊",
            "😇",
            "🙂",
            "🙃",
            "😉",
            "😌",
            "😍",
            "🥰",
            "😘",
            "😗",
            "😙",
            "😚",
            "😋",
            "😛",
            "😝",
            "😜",
            "🤪",
            "🤨",
            "🧐",
            "🤓",
            "😎",
            "🤩",
            "🥳",
            "😏",
            "😒",
            "😞",
            "😔",
            "😟",
            "😕",
            "🙁",
            "☹️",
            "😣",
            "😖",
            "😫",
            "😩",
            "🥺",
            "😢",
            "😭",
            "😤",
            "😠",
            "😡",
            "🤬",
            "🤯",
            "😳",
            "🥵",
            "🥶",
            "😱",
            "😨",
            "😰",
            "😥",
            "😓",
        ],
        people: [
            "👋",
            "🤚",
            "🖐",
            "✋",
            "🖖",
            "👌",
            "🤌",
            "🤏",
            "✌️",
            "🤞",
            "🤟",
            "🤘",
            "🤙",
            "👈",
            "👉",
            "👆",
            "🖕",
            "👇",
            "☝️",
            "👍",
            "👎",
            "✊",
            "👊",
            "🤛",
            "🤜",
            "👏",
            "🙌",
            "👐",
            "🤲",
            "🤝",
            "🙏",
            "✍️",
            "💅",
            "🤳",
            "💪",
            "🦾",
            "🦵",
            "🦿",
            "🦶",
            "👂",
            "🦻",
            "👃",
            "🫀",
            "🫁",
            "🧠",
            "🦷",
            "🦴",
            "👀",
            "👁",
            "👅",
        ],
        animals: [
            "🐶",
            "🐱",
            "🐭",
            "🐹",
            "🐰",
            "🦊",
            "🐻",
            "🐼",
            "🐻‍❄️",
            "🐨",
            "🐯",
            "🦁",
            "🐮",
            "🐷",
            "🐽",
            "🐸",
            "🐵",
            "🙈",
            "🙉",
            "🙊",
            "🐒",
            "🐔",
            "🐧",
            "🐦",
            "🐤",
            "🐣",
            "🐥",
            "🦆",
            "🦅",
            "🦉",
            "🦇",
            "🐺",
            "🐗",
            "🐴",
            "🦄",
            "🐝",
            "🪱",
            "🐛",
            "🦋",
            "🐌",
        ],
        food: [
            "🍎",
            "🍐",
            "🍊",
            "🍋",
            "🍌",
            "🍉",
            "🍇",
            "🍓",
            "🫐",
            "🍈",
            "🍒",
            "🍑",
            "🥭",
            "🍍",
            "🥥",
            "🥝",
            "🍅",
            "🍆",
            "🥑",
            "🥦",
            "🥬",
            "🥒",
            "🌶",
            "🫑",
            "🌽",
            "🥕",
            "🫒",
            "🧄",
            "🧅",
            "🥔",
            "🍠",
            "🥐",
            "🥯",
            "🍞",
            "🥖",
            "🥨",
            "🧀",
            "🥚",
            "🍳",
            "🧈",
        ],
        travel: [
            "✈️",
            "🛫",
            "🛬",
            "💺",
            "🚀",
            "🛸",
            "🚁",
            "🛶",
            "⛵️",
            "🚤",
            "🛥",
            "🛳",
            "⛴",
            "🚢",
            "🚗",
            "🚕",
            "🚙",
            "🚌",
            "🚎",
            "🚓",
            "🚑",
            "🚒",
            "🚐",
            "🛻",
            "🚚",
            "🚛",
            "🚜",
        ],
        activities: [
            "⚽️",
            "🏀",
            "🏈",
            "⚾️",
            "🥎",
            "🎾",
            "🏐",
            "🏉",
            "🥏",
            "🎱",
            "🪀",
            "🏓",
            "🏸",
            "🏒",
            "🏑",
            "🥍",
            "🏏",
            "🪃",
            "🥅",
            "⛳️",
            "🪁",
            "🏹",
            "🎣",
            "🤿",
            "🥊",
            "🥋",
            "🎽",
            "🛹",
            "🛼",
            "🛷",
        ],
        objects: [
            "💡",
            "🔦",
            "🪔",
            "🧯",
            "🛢",
            "💸",
            "💵",
            "💴",
            "💶",
            "💷",
            "💰",
            "💳",
            "💎",
            "⚖️",
            "🪜",
            "🧰",
            "🪛",
            "🔧",
            "🔨",
            "🪚",
            "🔩",
            "⚙️",
            "🪤",
            "🧱",
            "🧲",
        ],
        symbols: [
            "❤️",
            "🧡",
            "💛",
            "💚",
            "💙",
            "💜",
            "🖤",
            "🤍",
            "🤎",
            "💔",
            "❣️",
            "💕",
            "💞",
            "💓",
            "💗",
            "💖",
            "💘",
            "💝",
            "💟",
            "☮️",
            "✝️",
            "☪️",
            "☸️",
            "✡️",
            "🔯",
            "🕎",
            "☯️",
            "☦️",
            "🛐",
        ],
    };

    // Clear the existing emojis
    emojiGrid.innerHTML = "";

    // Update active category
    document.querySelectorAll(".emoji-category").forEach((cat) => {
        if (cat.dataset.category === category) {
            cat.classList.add("active");
        } else {
            cat.classList.remove("active");
        }
    });

    // Add emojis from the selected category
    const emojis = emojiSets[category] || emojiSets.recent;
    emojis.forEach((emoji) => {
        const emojiEl = document.createElement("div");
        emojiEl.className = "emoji";
        emojiEl.textContent = emoji;
        emojiEl.addEventListener("click", () => insertEmoji(emoji));
        emojiGrid.appendChild(emojiEl);
    });
}

// Toggle emoji picker visibility
function toggleEmojiPicker() {
    if (gifPicker.classList.contains("show")) {
        gifPicker.classList.remove("show");
        gifBtn.classList.remove("active");
    }

    emojiPicker.classList.toggle("show");
    emojiBtn.classList.toggle("active");

    if (
        emojiPicker.classList.contains("show") &&
        emojiGrid.children.length === 0) {
        initEmojiPicker();
    }
}
function handleOutsideClick(event) {
    // For Emoji Picker
    if (emojiPicker.classList.contains("show")) {
        // Check if click is outside the emoji picker and not on the emoji button
        if (
            !emojiPicker.contains(event.target) &&
            event.target !== emojiBtn &&
            !emojiBtn.contains(event.target)) {
            emojiPicker.classList.remove("show");
            emojiBtn.classList.remove("active");
        }
    }

    // For GIF Picker
    if (gifPicker.classList.contains("show")) {
        // Check if click is outside the gif picker and not on the gif button
        if (
            !gifPicker.contains(event.target) &&
            event.target !== gifBtn &&
            !gifBtn.contains(event.target)) {
            gifPicker.classList.remove("show");
            gifBtn.classList.remove("active");
        }
    }
}
// Toggle GIF picker visibility
function toggleGifPicker() {
    if (emojiPicker.classList.contains("show")) {
        emojiPicker.classList.remove("show");
        emojiBtn.classList.remove("active");
    }

    gifPicker.classList.toggle("show");
    gifBtn.classList.toggle("active");
    searchGifs();
}

// Insert emoji into message input
function insertEmoji(emoji) {
    const cursorPos = messageInput.selectionStart;
    const textBefore = messageInput.value.substring(0, cursorPos);
    const textAfter = messageInput.value.substring(cursorPos);

    messageInput.value = textBefore + emoji + textAfter;
    messageInput.selectionStart = messageInput.selectionEnd =
        cursorPos + emoji.length;
    messageInput.focus();
    handleInput();

    // Trigger the auto-resize
    messageInput.dispatchEvent(new Event("input"));

    // Close emoji picker
    emojiPicker.classList.remove("show");
    emojiBtn.classList.remove("active");
}

// Insert GIF into message input
function insertGif(gifUrl) {
    messageInput.value = `${gifUrl}`;
    messageInput.focus();
    handleInput();

    // Close GIF picker
    gifPicker.classList.remove("show");
    gifBtn.classList.remove("active");
}

function searchGifs() {
    const query = gifSearch.value.trim() || "trending";
    loadingGifs.style.display = "flex";
    gifGrid.innerHTML = "";

    //Cloudflare Worker URL
    const WORKER_URL = "/fetchgif";

    const endpoint = query !== "trending"
         ? `${WORKER_URL}?type=search&q=${encodeURIComponent(query)}&limit=50`
         : `${WORKER_URL}?type=trending&limit=50`;

    // Fetch GIFs through Cloudflare Worker
    fetch(endpoint)
    .then((response) => {
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        return response.json();
    })
    .then((data) => {
        loadingGifs.style.display = "none";
        if (data.results && data.results.length > 0) {
            data.results.forEach((gif) => {
                const gifItem = document.createElement("div");
                gifItem.className = "gif-item";
                // Use downsized format for preview (smaller/faster)
                const img = document.createElement("img");
                img.src = gif.media_formats.tinygif.url;
                img.alt = gif.title || "GIF";
                img.loading = "lazy"; // Lazy loading for better performance
                gifItem.appendChild(img);
                gifItem.addEventListener("click", () => {
                    // When clicked, insert the original GIF URL
                    insertGif(gif.media_formats.gif.url);
                });
                gifGrid.appendChild(gifItem);
            });
        } else {
            // No results
            gifGrid.innerHTML =
                '<div style="text-align: center; width: 100%; padding: 20px;">No GIFs found. Try a different search term.</div>';
        }
    })
    .catch((error) => {
        console.error("Error fetching GIFs:", error);
        loadingGifs.style.display = "none";
        gifGrid.innerHTML =
            '<div style="text-align: center; width: 100%; padding: 20px;">Error loading GIFs. Please try again.</div>';
    });
}

// Utility: Debounce function to limit API calls
function debounce(func, delay) {
    let timeout;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}
// Toggle wallet connection
// Toggle wallet connection
async function toggleWalletConnection() {
    if (isConnected) {
        // Disconnect wallet
        await wallet.clearActiveAccount();
        userAddress = null;
        walletAddressEl.textContent = "";
        connectWalletBtn.textContent = "Connect Wallet";
        isConnected = false;
        handleInput();
        loadingMessages.style.display = "flex";
    } else {
        // Connect wallet
        try {
            const permissions = await wallet.requestPermissions({
                network: {
                    type: NETWORK,
                },
            });
            userAddress = permissions.address;
            walletAddressEl.textContent = shortenAddress(userAddress);
            connectWalletBtn.textContent = "Disconnect";
            isConnected = true;
            handleInput();
            // Re-render messages to apply correct styles
            renderMessages();
        } catch (error) {
            showNotification(
                "Failed to connect wallet: " + error.message,
                "error");
        }
    }
}

// Load messages from contract
async function loadMessages() {
    try {
        // Only show loading indicator on initial load (when no messages are displayed)
        if (
            messagesContainer.children.length === 0 ||
            messagesContainer.innerHTML.includes("loading-messages")) {
            loadingMessages.style.display = "flex";
        }

        // Fetch messages from tzkt API
        const response = await axios.get(TZKT_API_URL);
        const messagesData = response.data;

        if (messagesData && messagesData.length > 0) {
            const newMessages = [];

            // Process messages
            messagesData.forEach((item) => {
                const messageData = item.value;
                newMessages.push({
                    id: parseInt(item.key),
                    text: isHex(messageData.message)
                     ? hexToString(messageData.message)
                     : messageData.message,
                    sender: messageData.author,
                    replyTo:
                    messageData.reply_to !== null
                     ? {
                        some: parseInt(messageData.reply_to)
                    }
                     : {
                        none: ""
                    },
                    timestamp: new Date(messageData.timestamp),
                });
            });

            // Sort messages by ID (which should correspond to chronological order)
            newMessages.sort((a, b) => a.id - b.id);

            // Check if we have new messages by comparing length or the latest message ID
            const hasNewMessages =
                newMessages.length !== messages.length ||
                (newMessages.length > 0 &&
                    messages.length > 0 &&
                    newMessages[newMessages.length - 1].id !==
                    messages[messages.length - 1].id);

            // Update our messages array
            messages = newMessages;

            // Render if this is the first load, we just connected, or we have new messages
            if (
                messagesContainer.children.length === 0 ||
                messagesContainer.innerHTML.includes("loading-messages") ||
                hasNewMessages) {
                renderMessages();
            }
        }

        loadingMessages.style.display = "none";
    } catch (error) {
        console.error("Error loading messages:", error);
        showNotification(
            "Failed to load messages. Please try again.",
            "error");
        loadingMessages.style.display = "none";
    }
}

// Render messages in the UI
function renderMessages() {
    messagesContainer.innerHTML = "";

    // Handle empty state
    if (messages.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "loading";
        emptyState.innerHTML = "No messages yet. Be the first to send a message!";
        messagesContainer.appendChild(emptyState);
        return;
    }

    // Helper functions
    const isGifUrl = (url) => {
        return url.match(/^https:\/\/media\d*\.giphy\.com\/media\//) !== null ||
        url.match(/^https:\/\/media\.tenor\.com\//) !== null;
    };

    const createAvatar = (sender) => {
        const avatarEl = document.createElement("div");
        avatarEl.className = "avatar";

        const avatarLink = document.createElement("a");
        avatarLink.href = "https://tzkt.io/" + sender;
        avatarLink.target = "_blank";

        const avatarImg = document.createElement("img");
        avatarImg.src = "https://services.tzkt.io/v1/avatars/" + escapeHTML(sender);
        avatarImg.alt = "avatar";

        // Prevent triggering message reply when clicking the avatar
        avatarLink.addEventListener("click", (event) => event.stopPropagation());

        avatarLink.appendChild(avatarImg);
        avatarEl.appendChild(avatarLink);

        return avatarEl;
    };

    const renderMessageContent = (message) => {
        if (isGifUrl(message.text)) {
            return `<div class="message-content">
        <img src="${escapeHTML(message.text)}" class="gif-content" alt="GIF">
      </div>`;
        }

        const youtubeVideoId = getYoutubeVideoId(message.text);
        if (youtubeVideoId !== null) {
            return `<div class="message-content">
        <div class="youtube-embed">
          <iframe 
            width="100%" 
            height="200" 
            src="https://www.youtube.com/embed/${escapeHTML(youtubeVideoId)}" 
            frameborder="0" 
            allowfullscreen>
          </iframe>
        </div>
      </div>`;
        }

        return `<div class="message-content">${escapeHTML(message.text)}</div>`;
    };

    const renderReplyContent = (replyMessage) => {
        if (!replyMessage)
            return '';

        let replyContent = `<div class="reply-to">
      <div class="reply-sender">${escapeHTML(shortenAddress(replyMessage.sender))}</div>`;

        if (isGifUrl(replyMessage.text)) {
            replyContent += `<div class="reply-content">
        <img src="${escapeHTML(replyMessage.text)}" class="gif-content" alt="GIF">
      </div></div>`;
        } else {
            const youtubeVideoId = getYoutubeVideoId(replyMessage.text);
            if (youtubeVideoId !== null) {
                replyContent += `<div class="reply-content">
          <div class="youtube-embed-small">
            YouTube: ${escapeHTML(replyMessage.text.substring(0, 30))}...
          </div>
        </div></div>`;
            } else {
                replyContent += `<div class="reply-content">${escapeHTML(replyMessage.text)}</div></div>`;
            }
        }

        return replyContent;
    };

    // Render each message
    messages.forEach((message) => {
        const messageContainer = document.createElement("div");
        messageContainer.className = "message-container";
        const isMyMessage = isConnected && message.sender === userAddress;

        // Create message element
        const messageEl = document.createElement("div");
        messageEl.className = `message ${isMyMessage ? "my-message" : "other-message"}`;
        messageEl.dataset.id = message.id;

        // Find reply message if exists
        let replyMessage = null;
        if (message.replyTo && message.replyTo.some !== undefined) {
            const replyId = parseInt(message.replyTo.some);
            replyMessage = messages.find((m) => m.id === replyId);
        }

        // Build message HTML content
        let html = `<div class="message-info">
      <span class="message-sender">${escapeHTML(shortenAddress(message.sender))}</span>
      <span class="message-time">${formatTime(message.timestamp)}</span>
    </div>`;

        // Add reply content if exists
        html += renderReplyContent(replyMessage);

        // Add message content
        html += renderMessageContent(message);

        messageEl.innerHTML = html;

        // Add click event for reply functionality
        messageEl.addEventListener("click", function () {
            replyToMessage(parseInt(this.dataset.id));
        });

        // Add avatars based on message owner
        if (!isMyMessage) {
            messageContainer.appendChild(createAvatar(message.sender));
        }

        messageContainer.appendChild(messageEl);

        if (isMyMessage) {
            messageContainer.appendChild(createAvatar(message.sender));
        }

        messagesContainer.appendChild(messageContainer);
    });

    // Handle scrolling after initial load
    if (!initialLoadComplete) {
        const gifImages = messagesContainer.querySelectorAll('.gif-content');

        if (gifImages.length > 0) {
            let loadedCount = 0;

            gifImages.forEach(img => {
                if (img.complete) {
                    loadedCount++;
                    if (loadedCount === gifImages.length) {
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        initialLoadComplete = true;
                    }
                } else {
                    img.addEventListener('load', () => {
                        loadedCount++;
                        if (loadedCount === gifImages.length) {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            initialLoadComplete = true;
                        }
                    });
                }
            });

            // Fallback timeout in case images fail to load
            setTimeout(() => {
                if (!initialLoadComplete) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    initialLoadComplete = true;
                }
            }, 2000);
        } else {
            // No GIFs, scroll immediately
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            initialLoadComplete = true;
        }
    }
}

// Reply to a message
function replyToMessage(messageId) {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
        replyTo = messageId;
        replyText.textContent =
            message.text.substring(0, 30) +
            (message.text.length > 30 ? "..." : "");
        replyPreview.classList.add("show");
        messageInput.focus();

        // Debug - Make sure this function is actually being called
        console.log("Replying to message:", messageId, message.text);
    } else {
        console.error("Message not found:", messageId);
    }
}

// Cancel reply to message
function cancelReplyToMessage() {
    replyTo = null;
    replyPreview.classList.remove("show");
}

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !isConnected)
        return;

    try {
        showLoading("Sending message...");

        // Prepare message parameters
        let replyToValue;
        if (replyTo !== null && replyTo !== undefined) {
            // When there is a reply_to value, format it as Some(nat)
            replyToValue = {
                prim: "Some",
                args: [{
                        int: replyTo.toString()
                    }
                ],
            };
        } else {
            // When there is no reply_to value, format it as None
            replyToValue = {
                prim: "None"
            };
        }

        // Prepare the transaction
        const params = {
            kind: beacon.TezosOperationType.TRANSACTION,
            source: userAddress,
            destination: CONTRACT_ADDRESS,
            amount: "0",
            parameters: {
                entrypoint: "post_message", // Use the actual entry point name from your contract
                value: {
                    prim: "Pair",
                    args: [{
                            string: hex(text)
                        }, // message parameter
                        replyToValue, // reply_to parameter (option type)
                    ],
                },
            },
        };

        // Send the transaction
        const op = await wallet.requestOperation({
            operationDetails: [params],
        });

        // Wait for confirmation
        await waitForConfirmation(op.transactionHash);

        // Clear input
        messageInput.value = "";
        messageInput.style.height = "auto";
        cancelReplyToMessage();

        showNotification("Message sent successfully", "success");
    } catch (error) {
        console.error("Error sending message:", error);
        showNotification(
            "Failed to send message: " + (error.message || "Unknown error"),
            "error");
    } finally {
        hideLoading();
    }
}

// Wait for transaction confirmation
async function waitForConfirmation(hash, attempts = 10) {
    for (let i = 0; i < attempts; i++) {
        try {
            const response = await axios.get(
`${RPC_URL}/chains/main/blocks/head/operations`);
            const operations = response.data.flatMap((group) => group);

            for (const group of response.data) {
                for (const op of group) {
                    if (op.hash === hash) {
                        loadMessages();
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error("Error checking confirmation:", error);
        }

        // Wait for 5 seconds before next attempt
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // If we've waited long enough, assume it's confirmed
    return true;
}

// Handle input changes
function handleInput() {
    const text = messageInput.value.trim();
    sendBtn.disabled = !text || !isConnected;
}

// Show notification
function showNotification(message, type = "info") {
    notificationMessage.textContent = message;
    notification.className = `notification ${type} show`;

    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

// Show loading overlay
function showLoading(text) {
    loadingText.textContent = text || "Processing...";
    loadingOverlay.classList.add("show");
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.classList.remove("show");
}

// Utility: Format time
function formatTime(date) {
    return moment(date).format("MMM DD, HH:mm");
}

// Utility: Shorten address
function shortenAddress(address) {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
}

// Utility: Escape HTML
function escapeHTML(str) {
    return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hex(str) {
    return Array.from(new TextEncoder().encode(str))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToString(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function isHex(str) {
    return /^[0-9A-Fa-f]+$/.test(str);
}

function getYoutubeVideoId(url) {
    // Handle youtube.com links
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?/;
    const youtubeMatch = url.match(youtubeRegex);

    if (youtubeMatch) {
        return youtubeMatch[1];
    }

    // Handle youtu.be links
    const youtuBeRegex = /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?/;
    const youtuBeMatch = url.match(youtuBeRegex);

    if (youtuBeMatch) {
        return youtuBeMatch[1];
    }

    return null;
}

// Initialize on load
document.addEventListener("DOMContentLoaded", init);
