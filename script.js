document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_KEY = "AIzaSyAM7acUehOuPiCev_RBKSqJAsfshoMsGiU"; 
    const MODEL_NAME = "gemini-1.5-flash";
    const HISTORY_KEY = "rohit_bhaiya_chat_history";
    const MAX_HISTORY_ITEMS = 5;

    // System instructions
    const rohitBhaiyaInstruction = `You are Rohit Bhaiya — GATE AIR 202, ex-Uber SDE (₹2 Cr package), MTech from IIT. 
    You run Coder Army, where you teach students like a strict but caring elder brother. 
    You're a brutally honest, sarcastic mentor who genuinely wants students to succeed, but doesn’t tolerate laziness, spoon-feeding, or endless roadmap questions. 
    You teach: DSA, Full Stack Dev, System Design, Blockchain, GenAI. 
    You promote only your course when asked about courses till then dont promote it: Nexus (₹6000) via www.coderarmy.in. 
    You also have free content on: Coder Army YouTube (DSA, LLD) & Rohit Negi YouTube (GenAI).
    You always explain why that thing was introduced before explaining what that thing is. 
    Your Style: - Hinglish only (English + Hindi slang blend). - Replies must be short, crisp, and savage if needed. 
    - Use phrases like: "chamak gaya?", "samajh aa raha hai?", "hanji bhaiya", "kaise kar loge bhai aise?" 
    - Start "Ram-Ram bhai" ONLY once per full chat session. 
    - Use 1–2 emojis only for punch (😤🔥✨) — not every line. Teaching Principles: 
    - Always explain the “why” first (first principles) before teaching any concept.
    
    Then explain the core concept in simple terms. 
    - Push students to code themselves — no spoon-feeding. 
    - If a question repeats, reply strictly like: “fir wahi puchh raha hai? kaise kar loge bhai aise?” 😤 R
    esource Rule: - If asked for resources for hld, blockchain, dev, etc. → promote Nexus course: “Nexus le le bhai — ₹6000 mein sab milega, full stack + blockchain + HLD.” - If user wants free resources → promote YouTube: “YouTube pe daal rakha hai bhai — jaa dekh lo.” - Never mention any other platform. Just say "YouTube pr search karlo varna controversy ho jaati hai". - For resume advice: "Resume ka funda simple hai — 1 pager, DSA + 2 Projects + skills. Dekh le maine YouTube pe explain kiya hai.” Remember: You are Rohit Bhaiya — a top-tier mentor. You care about the student, but only if they are ready to work hard. and dont call bhaiay in every text to anyone`;

    const codeMentorInstruction = `You are a professional DSA and Coding Mentor. Your task is to help students with:
    1. Code examples in multiple languages
    2. Error detection and debugging
    3. Code optimization suggestions
    4. Algorithm explanations
    5. Time/space complexity analysis
    
    Guidelines:
    - Be precise and technical
    - Provide runnable code examples when possible
    - Format code properly with syntax highlighting
    - Explain complex concepts clearly
    - Focus on best practices and efficiency
    - Never give complete solutions, guide students to find answers`;

    // --- DOM ELEMENTS ---
    const chatBox = document.getElementById('chat-box');
    const inputForm = document.getElementById('input-form');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const voiceButton = document.getElementById('voice-button');
    const voiceUI = document.getElementById('voice-ui');
    const cancelVoiceBtn = document.getElementById('cancel-voice');
    const historyBtn = document.getElementById('history-btn');
    const chatHistory = document.getElementById('chat-history');
    const closeHistory = document.getElementById('close-history');
    const historyList = document.getElementById('history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const newChatHeaderBtn = document.getElementById('new-chat-header-btn'); // Added
    const mentorMode = document.getElementById('mentor-mode');
    const featuresBtn = document.getElementById('features-btn');
    const featureTour = document.getElementById('feature-tour');
    const overlay = document.getElementById('overlay');
    const closeTour = document.getElementById('close-tour');
    const deleteConfirmModal = document.getElementById('delete-confirm');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const editTitleModal = document.getElementById('edit-title-modal');
    const newChatTitleInput = document.getElementById('new-chat-title');
    const saveTitleBtn = document.getElementById('save-title');
    const cancelEditBtn = document.getElementById('cancel-edit');

    // --- STATE MANAGEMENT ---
    let history = [];
    let isRecording = false;
    let recognition;
    let firstMessage = true;
    let currentChatId = generateChatId();
    let isCodeMentorMode = false;
    let chatSessions = loadChatHistory();
    let chatToDelete = null;
    let chatToEdit = null;

    // --- INITIAL SETUP ---
    // Start with sidebar closed
    chatHistory.classList.remove('active');
    overlay.classList.remove('active');

    // Initialize chat with welcome message if new session
    initializeChatSession();

    // --- EVENT LISTENERS ---
    inputForm.addEventListener('submit', handleSendMessage);
    voiceButton.addEventListener('click', toggleVoiceRecording);
    cancelVoiceBtn.addEventListener('click', stopRecording);
    historyBtn.addEventListener('click', toggleChatHistory);
    closeHistory.addEventListener('click', closeHistorySidebar);
    newChatBtn.addEventListener('click', startNewChat);
    newChatHeaderBtn.addEventListener('click', startNewChat); // Added
    mentorMode.addEventListener('change', toggleMentorMode);
    featuresBtn.addEventListener('click', showFeatures);
    closeTour.addEventListener('click', hideFeatures);
    confirmDeleteBtn.addEventListener('click', confirmDeleteChat);
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    saveTitleBtn.addEventListener('click', saveChatTitle);
    cancelEditBtn.addEventListener('click', hideEditModal);
    overlay.addEventListener('click', closeAllModals);

    // --- CORE FUNCTIONS ---

    // Initialize new chat session with welcome message
    function initializeChatSession() {
        const currentChat = chatSessions.find(chat => chat.id === currentChatId);
        
        if (!currentChat) {
            // Display welcome message based on mode
            const welcomeMessage = isCodeMentorMode ? 
                "New coding session started. What are you working on?" : 
                "Ram-Ram ji, batao kya madat kare";
            
            displayMessage(welcomeMessage, isCodeMentorMode ? 'code-mentor' : 'bot');
            
            // Save to history with welcome message
            saveToHistory('', welcomeMessage, true);
        } else {
            // Load existing chat
            loadChat(currentChatId);
        }
    }

    async function handleSendMessage(event) {
        event.preventDefault();
        const userMessage = messageInput.value.trim();
        if (!userMessage) return;

        displayMessage(userMessage, 'user');
        messageInput.value = '';
        sendButton.disabled = true;

        const typingIndicator = createTypingIndicator();
        
        try {
            const botResponse = await getBotResponse(userMessage);
            chatBox.removeChild(typingIndicator);
            
            const messageType = isCodeMentorMode ? 'code-mentor' : 'bot';
            displayMessage(botResponse, messageType);
            
            saveToHistory(userMessage, botResponse);
        } catch (error) {
            chatBox.removeChild(typingIndicator);
            displayMessage(`Error: ${error.message}`, 'error');
        }
        
        sendButton.disabled = false;
        messageInput.focus();
    }

    function toggleMentorMode() {
        isCodeMentorMode = mentorMode.checked;
        if (isCodeMentorMode) {
            displayMessage("Code Mentor mode activated. How can I help with your code?", 'code-mentor');
        } else {
            displayMessage("Switched back to Rohit Bhaiya mode. Batao bhai, kya help chahiye?", 'bot');
        }
    }

    // --- CHAT HISTORY MANAGEMENT ---

    function saveToHistory(userMessage, botResponse, isWelcomeMessage = false) {
        let currentChat = chatSessions.find(chat => chat.id === currentChatId);
        
        if (!currentChat) {
            currentChat = {
                id: currentChatId,
                title: isWelcomeMessage ? 'New Chat' : (userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '')),
                messages: [],
                timestamp: new Date().toISOString(),
                isCodeMentor: isCodeMentorMode
            };
            chatSessions.unshift(currentChat);
            
            // Ensure we don't exceed max history items
            if (chatSessions.length > MAX_HISTORY_ITEMS) {
                chatSessions.pop();
            }
        }
        
        // Add welcome message if this is a new chat
        if (isWelcomeMessage && currentChat.messages.length === 0) {
            currentChat.messages.push({
                user: '',
                bot: botResponse,
                timestamp: new Date().toISOString()
            });
        } 
        // Add regular message
        else if (!isWelcomeMessage) {
            currentChat.messages.push({
                user: userMessage,
                bot: botResponse,
                timestamp: new Date().toISOString()
            });
            
            // Update title if this is the first user message
            if (currentChat.messages.length === 2) { // 2 because welcome is first
                currentChat.title = userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : '');
            }
        }
        
        localStorage.setItem(HISTORY_KEY, JSON.stringify(chatSessions));
        renderChatHistory();
    }

    function startNewChat() {
        currentChatId = generateChatId();
        chatBox.innerHTML = '';
        history = [];
        firstMessage = true;
        
        // Display welcome message based on mode
        const welcomeMessage = isCodeMentorMode ? 
            "New coding session started. What are you working on?" : 
            "Ram-Ram ji, batao kya madat kare";
        
        displayMessage(welcomeMessage, isCodeMentorMode ? 'code-mentor' : 'bot');
        
        // Save to history with welcome message
        saveToHistory('', welcomeMessage, true);
        
        // Close history sidebar if open
        closeHistorySidebar();
    }

    function loadChat(chatId) {
        const chat = chatSessions.find(c => c.id === chatId);
        if (!chat) return;
        
        currentChatId = chatId;
        chatBox.innerHTML = '';
        history = [];
        
        // Set the correct mode
        isCodeMentorMode = chat.isCodeMentor;
        mentorMode.checked = isCodeMentorMode;
        
        // Load all messages and rebuild history context
        chat.messages.forEach(msg => {
            if (msg.user) {
                displayMessage(msg.user, 'user');
                history.push({ role: 'user', parts: [{ text: msg.user }] });
            }
            if (msg.bot) {
                const messageType = isCodeMentorMode ? 'code-mentor' : 'bot';
                displayMessage(msg.bot, messageType);
                history.push({ role: 'model', parts: [{ text: msg.bot }] });
            }
        });
        
        renderChatHistory();
    }

    function renderChatHistory() {
        historyList.innerHTML = '';
        
        if (chatSessions.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; opacity: 0.7;">No chat history yet</p>';
            return;
        }
        
        chatSessions.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'history-item';
            if (chat.id === currentChatId) {
                chatElement.classList.add('active');
            }
            
            chatElement.innerHTML = `
                <div class="history-actions">
                    <button class="history-action-btn edit-chat" title="Edit title">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="history-action-btn delete-chat" title="Delete chat">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="history-preview">${chat.title}</div>
                <div class="history-date">${formatDate(chat.timestamp)} • ${chat.isCodeMentor ? 'Code Mentor' : 'Rohit Bhaiya'}</div>
            `;
            
            chatElement.addEventListener('click', (e) => {
                if (!e.target.closest('.history-actions')) {
                    loadChat(chat.id);
                    closeHistorySidebar();
                }
            });
            
            const editBtn = chatElement.querySelector('.edit-chat');
            const deleteBtn = chatElement.querySelector('.delete-chat');
            
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showEditModal(chat.id);
            });
            
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showDeleteModal(chat.id);
            });
            
            historyList.appendChild(chatElement);
        });
    }

    // --- UI FUNCTIONS ---

    function toggleChatHistory() {
        chatHistory.classList.add('active');
        overlay.classList.add('active');
    }

    function closeHistorySidebar() {
        chatHistory.classList.remove('active');
        overlay.classList.remove('active');
    }

    function showFeatures() {
        featureTour.classList.add('active');
        overlay.classList.add('active');
    }

    function hideFeatures() {
        featureTour.classList.remove('active');
        overlay.classList.remove('active');
    }

    function closeAllModals() {
        chatHistory.classList.remove('active');
        featureTour.classList.remove('active');
        deleteConfirmModal.classList.remove('active');
        editTitleModal.classList.remove('active');
        overlay.classList.remove('active');
    }

    function displayMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);
        
        if (sender === 'code-mentor' && text.includes('```')) {
            const parts = text.split('```');
            let formattedText = '';
            
            for (let i = 0; i < parts.length; i++) {
                if (i % 2 === 1) {
                    const languageMatch = parts[i].match(/^(\w+)\n/);
                    const language = languageMatch ? languageMatch[1] : '';
                    const code = languageMatch ? parts[i].substring(languageMatch[0].length) : parts[i];
                    
                    formattedText += `
                        <div class="code-block">
                            <div class="code-header">
                                <span class="code-language">${language || 'Code'}</span>
                            </div>
                            <div class="code-content">${code}</div>
                        </div>
                    `;
                } else {
                    formattedText += parts[i];
                }
            }
            
            messageElement.innerHTML = formattedText;
        } else {
            messageElement.textContent = text;
        }
        
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }

    function createTypingIndicator() {
        const typingElement = document.createElement('div');
        typingElement.classList.add('message', isCodeMentorMode ? 'code-mentor-message' : 'bot-message', 'typing-indicator');
        typingElement.innerHTML = `<span></span><span></span><span></span>`;
        
        chatBox.appendChild(typingElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return typingElement;
    }

    // --- UTILITY FUNCTIONS ---

    function generateChatId() {
        return 'chat-' + Date.now();
    }

    function loadChatHistory() {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    }

    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    // --- VOICE RECOGNITION ---

    function toggleVoiceRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function startRecording() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            displayMessage("Voice feature is not supported in your browser", 'error');
            return;
        }

        isRecording = true;
        voiceButton.classList.add('listening');
        voiceUI.classList.add('active');
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript.trim()) {
                messageInput.value = transcript;
                stopRecording();
                const submitEvent = new Event('submit', { cancelable: true });
                inputForm.dispatchEvent(submitEvent);
            }
        };
        
        recognition.onerror = (event) => {
            console.error("Recognition error:", event.error);
            displayMessage(`Voice recognition error: ${event.error}`, 'error');
            stopRecording();
        };
        
        recognition.start();
    }

    function stopRecording() {
        isRecording = false;
        voiceButton.classList.remove('listening');
        voiceUI.classList.remove('active');
        
        if (recognition) {
            recognition.stop();
        }
    }

    // --- API COMMUNICATION ---

    async function getBotResponse(userMessage) {
        history.push({ role: 'user', parts: [{ text: userMessage }] });

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
        
        const requestBody = {
            contents: history,
            systemInstruction: {
                parts: [{ 
                    text: isCodeMentorMode ? codeMentorInstruction : rohitBhaiyaInstruction 
                }]
            },
            generationConfig: {
                temperature: isCodeMentorMode ? 0.3 : 0.7,
                maxOutputTokens: 5000,
            },
            safetySettings: [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("API Error Response:", responseData);
            const errorMsg = responseData.error?.message || "API se ajeeb response aaya hai.";
            throw new Error(errorMsg);
        }
        
        let botResponseText = "Sorry, I didn't understand that. Could you rephrase?";
        if (responseData.candidates && responseData.candidates.length > 0) {
            botResponseText = responseData.candidates[0].content.parts[0].text;
        } else if (responseData.promptFeedback) {
            botResponseText = `I can't respond to that. Please ask something else. (${responseData.promptFeedback.blockReason})`;
        }

        history.push({ role: 'model', parts: [{ text: botResponseText }] });
        return botResponseText;
    }

    // --- MODAL HANDLING FUNCTIONS ---

function showDeleteModal(chatId) {
    chatToDelete = chatId;
    deleteConfirmModal.classList.add('active');
    overlay.classList.add('active');
}

function hideDeleteModal() {
    deleteConfirmModal.classList.remove('active');
    overlay.classList.remove('active');
    chatToDelete = null;
}

function showEditModal(chatId) {
    chatToEdit = chatId;
    const chat = chatSessions.find(c => c.id === chatId);
    if (chat) {
        newChatTitleInput.value = chat.title;
    }
    editTitleModal.classList.add('active');
    overlay.classList.add('active');
}

function hideEditModal() {
    editTitleModal.classList.remove('active');
    overlay.classList.remove('active');
    chatToEdit = null;
}

function confirmDeleteChat() {
    if (chatToDelete) {
        // Remove the chat from sessions
        chatSessions = chatSessions.filter(chat => chat.id !== chatToDelete);
        
        // Save to localStorage
        localStorage.setItem(HISTORY_KEY, JSON.stringify(chatSessions));
        
        // If we deleted the current chat, start a new one
        if (chatToDelete === currentChatId) {
            startNewChat();
        }
        
        // Update the history list
        renderChatHistory();
    }
    hideDeleteModal();
}

function saveChatTitle() {
    if (chatToEdit && newChatTitleInput.value.trim()) {
        const chat = chatSessions.find(c => c.id === chatToEdit);
        if (chat) {
            chat.title = newChatTitleInput.value.trim();
            localStorage.setItem(HISTORY_KEY, JSON.stringify(chatSessions));
            renderChatHistory();
        }
    }
    hideEditModal();
}
});