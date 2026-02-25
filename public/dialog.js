const micBtn = document.getElementById('mic-btn');
const transcriptItem = document.getElementById('transcript');
const audioPlayer = document.getElementById('audio-player');
const connectionStatus = document.getElementById('connection-status');
const textInput = document.getElementById('text-input');
const canvasFrame = document.getElementById('agentic-canvas');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isProcessing = false;

// Session ID for contextual memory, derived from query params
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session') || "dialog-mobile";

// Initialize Socket connection
const socket = io();
socket.on('connect', () => console.log('Sovereign PWA Socket Connected:', socket.id));

// Listen for Agentic Widget pushes from the server
socket.on('canvas-widget', (payload) => {
    // If targeted at the mobile session
    if (payload.sessionId === sessionId || !payload.sessionId) {
        if (!payload.html) {
            canvasFrame.classList.add('empty');
            canvasFrame.innerHTML = '';
        } else {
            canvasFrame.classList.remove('empty');
            canvasFrame.innerHTML = payload.html;
            canvasFrame.scrollTo({ top: canvasFrame.scrollHeight, behavior: 'smooth' });
        }
    }
});

function appendMessage(role, text) {
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = `message-wrapper ${role}`;

    const labelDiv = document.createElement('div');
    labelDiv.className = 'message-label';
    labelDiv.textContent = role === 'user' ? 'Broker Command' : 'Oracle AI';

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    // Parse Markdown natively for agent replies
    if (role === 'agent' && typeof marked !== 'undefined') {
        msgDiv.innerHTML = marked.parse(text);
    } else {
        msgDiv.textContent = text;
    }

    wrapperDiv.appendChild(labelDiv);
    wrapperDiv.appendChild(msgDiv);

    transcriptItem.appendChild(wrapperDiv);

    // Smooth scroll to bottom
    setTimeout(() => {
        transcriptItem.scrollTo({ top: transcriptItem.scrollHeight, behavior: 'smooth' });
    }, 50);

    return msgDiv;
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                const b64 = reader.result.split(',')[1];
                resolve(b64);
            } else {
                reject(new Error("Failed to convert blob to base64"));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

micBtn.addEventListener('click', async () => {
    if (isProcessing) return;

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = processAudio;

            audioChunks = [];
            mediaRecorder.start();
            isRecording = true;
            micBtn.classList.add('recording');
            document.getElementById('mic-container').classList.add('recording');

            // Transform icon to square (stop)
            document.getElementById('icon-mic').innerHTML = '<path d="M6 6h12v12H6z"/>';

            connectionStatus.style.backgroundColor = '#ef4444'; // Red recording
            connectionStatus.style.boxShadow = '0 0 15px rgba(239, 68, 68, 0.8)';
            document.getElementById('status-text').textContent = "Recording...";
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Microphone configuration required by Sovereign Protocol restrictions.");
        }
    } else {
        // Stop recording
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        micBtn.classList.remove('recording');
        document.getElementById('mic-container').classList.remove('recording');

        micBtn.classList.add('processing');
        // Transform icon to cloud sync / processing
        document.getElementById('icon-mic').innerHTML = '<path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.36 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM13 13v4h-2v-4H8l4-4 4 4h-3z"/>';

        isProcessing = true;

        connectionStatus.style.backgroundColor = '#f59e0b'; // Gold processing
        connectionStatus.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.8)';
        document.getElementById('status-text').textContent = "Architect Processing";
    }
});

async function processAudio() {
    const userMsgNode = appendMessage('user', 'Processing audio...');

    // Web browsers natively record in webm or ogg depending on the platform (webm for Android/Chrome)
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

    try {
        const base64Audio = await blobToBase64(audioBlob);
        await transmitPayload({ audioBase64: base64Audio, mimeType: 'audio/webm' }, userMsgNode);
    } catch (e) {
        console.error("Blob encode failed:", e);
        cleanupUI();
    }
}

// Multimodal Text Input Listener
textInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && textInput.value.trim() !== '') {
        if (isProcessing) return;
        const prompt = textInput.value.trim();
        textInput.value = '';
        textInput.blur(); // dismiss keyboard

        const userMsgNode = appendMessage('user', prompt);
        setProcessingUI();

        await transmitPayload({ textPrompt: prompt }, userMsgNode);
    }
});

// Global Hook for Agentic "Anticipatory Dialogue Buttons"
window.submitTextPrompt = async function (promptString) {
    if (isProcessing || !promptString) return;

    // Visually clear out the canvas when an action is selected so it doesn't clutter
    canvasFrame.classList.add('empty');
    canvasFrame.innerHTML = '';

    const userMsgNode = appendMessage('user', promptString);
    setProcessingUI();

    await transmitPayload({ textPrompt: promptString }, userMsgNode);
};

function setProcessingUI() {
    isProcessing = true;
    micBtn.classList.add('processing');
    document.getElementById('icon-mic').innerHTML = '<path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.36 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM13 13v4h-2v-4H8l4-4 4 4h-3z"/>';
    connectionStatus.style.backgroundColor = '#f59e0b';
    connectionStatus.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.8)';
    document.getElementById('status-text').textContent = "Architect Processing";
}

function cleanupUI() {
    isProcessing = false;
    micBtn.classList.remove('processing');
    document.getElementById('icon-mic').innerHTML = '<path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>';
    connectionStatus.style.backgroundColor = '#10b981';
    connectionStatus.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.6)';
    document.getElementById('status-text').textContent = "Encrypted";
}

async function transmitPayload(payload, userMsgNode) {
    try {
        payload.sessionId = sessionId;
        const response = await fetch('/api/dialog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Update the UI with perfect transcriptions or text echoes
        if (userMsgNode) {
            userMsgNode.textContent = data.userTranscript || payload.textPrompt || "(Silent audio)";
        }

        // Use Markdown if available, else plain text
        if (typeof marked !== 'undefined' && data.agentReply) {
            appendMessage('agent', data.agentReply);
        } else {
            appendMessage('agent', data.agentReply || 'Understood.');
        }

        // Auto-play the synthesized ElevenLabs speech
        if (data.audioBase64Out) {
            const audioUri = `data:audio/mp3;base64,${data.audioBase64Out}`;
            audioPlayer.src = audioUri;
            audioPlayer.play();
        }

    } catch (e) {
        console.error("Failed to process payload:", e);
        if (userMsgNode) userMsgNode.textContent = '⚠️ Sensory pipeline degraded.';
        appendMessage('agent', 'Signal lost. Re-establish connection.');
    } finally {
        cleanupUI();
    }
}
