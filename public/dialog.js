const micBtn = document.getElementById('mic-btn');
const transcriptItem = document.getElementById('transcript');
const audioPlayer = document.getElementById('audio-player');
const connectionStatus = document.getElementById('connection-status');

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isProcessing = false;

// Session ID for contextual memory, derived from query params
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session') || "dialog-mobile";

function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    msgDiv.textContent = text;
    transcriptItem.appendChild(msgDiv);
    transcriptItem.scrollTop = transcriptItem.scrollHeight;
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
            micBtn.textContent = '⏹️';
            connectionStatus.style.backgroundColor = '#da3633'; // Red while recording
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Microphone access is required for Dialog mode.");
        }
    } else {
        // Stop recording
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.classList.add('processing');
        micBtn.textContent = '⏳';
        isProcessing = true;
        connectionStatus.style.backgroundColor = '#d29922'; // Yellow while processing
    }
});

async function processAudio() {
    const userMsgNode = appendMessage('user', 'Processing audio...');

    // Web browsers natively record in webm or ogg depending on the platform (webm for Android/Chrome)
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

    try {
        const base64Audio = await blobToBase64(audioBlob);

        const response = await fetch('/api/dialog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: 'audio/webm',
                sessionId: sessionId
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Update the UI with perfect transcriptions
        userMsgNode.textContent = data.userTranscript || "(Silent audio)";
        appendMessage('agent', data.agentReply || 'Understood.');

        // Auto-play the synthesized ElevenLabs speech
        if (data.audioBase64Out) {
            const audioUri = `data:audio/mp3;base64,${data.audioBase64Out}`;
            audioPlayer.src = audioUri;
            audioPlayer.play();
        }

    } catch (e) {
        console.error("Failed to process audio:", e);
        userMsgNode.textContent = '⚠️ Error processing voice chunk.';
        appendMessage('agent', 'System Error: Transmission sequence failed.');
    } finally {
        isProcessing = false;
        micBtn.classList.remove('processing');
        micBtn.textContent = '🎙️';
        connectionStatus.style.backgroundColor = '#238636'; // Back to green
    }
}
