// Master Dashboard B.L.A.S.T Script

const uptimeDisplay = document.getElementById('uptime-display');
const memoryDisplay = document.getElementById('memory-display');
const integrationList = document.getElementById('integration-list');
const logContainer = document.getElementById('log-container');

// State tracking
let lastLogCount = 0;

// Format seconds into HH:MM:SS
function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Fetch and update status metrics
async function fetchStatus() {
    try {
        const response = await fetch('/api/dashboard/status');
        if (!response.ok) return;
        const data = await response.json();

        // Update Uptime
        uptimeDisplay.textContent = formatUptime(data.uptime);

        // Update Memory
        memoryDisplay.textContent = `${data.memoryUsage} MB`;

        // Update Integrations (only if empty to avoid DOM redraws)
        if (integrationList.children.length === 0) {
            integrationList.innerHTML = '';
            data.activeIntegrations.forEach(integration => {
                const li = document.createElement('li');
                li.textContent = integration;
                integrationList.appendChild(li);
            });
        }
    } catch (error) {
        console.error('Master Dashboard: Status fetch failed', error);
    }
}

// Fetch and update system logs
async function fetchLogs() {
    try {
        const response = await fetch('/api/dashboard/logs');
        if (!response.ok) return;
        const logs = await response.json();

        // Only render if we have new logs
        if (logs.length !== lastLogCount) {
            lastLogCount = logs.length;
            renderLogs(logs);
        }
    } catch (error) {
        console.error('Master Dashboard: Log fetch failed', error);
    }
}

// Fetch Guided Setup Phase 12 keys
async function fetchSetup() {
    try {
        const response = await fetch('/api/dashboard/setup');
        if (!response.ok) return;
        const data = await response.json();

        const setupCard = document.getElementById('setup-card');
        const setupTitle = document.getElementById('setup-title');
        const setupContent = document.getElementById('setup-content');

        if (data.isFullyArmed) {
            setupCard.classList.add('ready');
            setupTitle.textContent = 'Systems Fully Armed';
            setupContent.innerHTML = `
                <div class="setup-success">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <span>All Phase 1 and Phase 3 API Keys detected. Operations nominal.</span>
                </div>
            `;
        } else {
            setupCard.classList.remove('ready');
            setupTitle.textContent = 'Action Required: Missing Keys';
            setupContent.innerHTML = data.missingKeys.map(item => `
                <div class="setup-item">
                    <header>
                        <span class="setup-key">${item.key}</span>
                        <span class="setup-badge pending">PENDING</span>
                    </header>
                    <div class="setup-desc">Blocker for: <strong>${item.feature}</strong></div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Master Dashboard: Setup fetch failed', error);
    }
}

// Render the log buffer into the DOM
function renderLogs(logs) {
    // Clear current logs
    logContainer.innerHTML = '';

    // Append in chronological order
    logs.forEach(log => {
        const row = document.createElement('div');
        row.className = 'log-row';

        // Format Timestamp
        const date = new Date(log.timestamp);
        const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

        const timeSpan = `<span class="log-time">[${timeString}]</span>`;
        const levelSpan = `<span class="log-level-${log.level}">${log.level.toUpperCase()}</span>`;
        const messageSpan = `<span class="log-message">${log.message}</span>`;

        row.innerHTML = `${timeSpan} ${levelSpan} ${messageSpan}`;
        logContainer.appendChild(row);
    });

    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
}

// Initialization and Polling
function initDashboard() {
    console.log("Master Dashboard Initialized. Initiating telemetry loop.");

    // Initial fetch
    fetchStatus();
    fetchLogs();
    fetchSetup();

    // Set polling intervals
    setInterval(fetchStatus, 1000); // 1-second ticks for uptime
    setInterval(fetchLogs, 1500);   // 1.5-second ticks for logs
    setInterval(fetchSetup, 5000);  // 5-second ticks for setup keys

    // Initialize Phase 13 Canvas Elements
    initCanvas();
}

// --- Phase 13 & 14: Agentic Canvas UI Logic ---
function initCanvas() {
    const urlParams = new URLSearchParams(window.location.search);
    const fublead = urlParams.get('fublead');
    const mode = urlParams.get('mode');

    if (mode === 'sidecar') {
        document.body.classList.add('sidecar-mode');
    }

    const tabTelemetry = document.getElementById('tab-telemetry');
    const tabCanvas = document.getElementById('tab-canvas');
    const tabActionQueue = document.getElementById('tab-action-queue');

    const viewTelemetry = document.getElementById('view-telemetry');
    const viewCanvas = document.getElementById('view-canvas');
    const viewActionQueue = document.getElementById('view-action-queue');

    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const canvasContainer = document.getElementById('canvas-container');

    // Optic Nerve Elements (Phase 15)
    const opticToggleBtn = document.getElementById('optic-nerve-toggle');
    const opticPreviewContainer = document.getElementById('optic-nerve-preview-container');
    const hardwareStreamVideo = document.getElementById('sensory-hardware-stream');
    let hardwareStreamActive = false;
    let localMediaStream = null;

    // Global Lead Search Logic
    const searchInput = document.getElementById('global-lead-search');
    const searchBtn = document.getElementById('global-search-btn');

    if (searchInput && searchBtn) {
        function executeSearch() {
            const query = searchInput.value.trim();
            if (!query) return;
            // Native Jump to FUB UUID Workspace
            window.location.href = `/?fublead=${encodeURIComponent(query)}`;
        }
        searchBtn.addEventListener('click', executeSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') executeSearch();
        });
    }

    if (mode === 'sidecar' || fublead) {
        // Auto-focus canvas if we are in sidecar mode or loaded a specific lead
        setTimeout(() => tabCanvas.click(), 50);
    }

    // Tab Switching Logic
    tabTelemetry.addEventListener('click', () => {
        tabTelemetry.classList.add('active');
        tabCanvas.classList.remove('active');
        tabActionQueue.classList.remove('active');

        viewTelemetry.classList.remove('hidden');
        viewCanvas.classList.add('hidden');
        viewActionQueue.classList.add('hidden');
    });

    tabCanvas.addEventListener('click', () => {
        tabCanvas.classList.add('active');
        tabTelemetry.classList.remove('active');
        tabActionQueue.classList.remove('active');

        viewCanvas.classList.remove('hidden');
        viewTelemetry.classList.add('hidden');
        viewActionQueue.classList.add('hidden');
        chatInput.focus();
    });

    tabActionQueue.addEventListener('click', () => {
        tabActionQueue.classList.add('active');
        tabCanvas.classList.remove('active');
        tabTelemetry.classList.remove('active');

        viewActionQueue.classList.remove('hidden');
        viewCanvas.classList.add('hidden');
        viewTelemetry.classList.add('hidden');
    });

    // --- Phase 15: Hardware Optic Nerve ---
    async function toggleOpticNerve() {
        if (hardwareStreamActive) {
            // Shut Down
            if (localMediaStream) {
                localMediaStream.getTracks().forEach(track => track.stop());
            }
            hardwareStreamVideo.srcObject = null;
            opticPreviewContainer.classList.add('hidden');
            opticToggleBtn.classList.remove('active');
            hardwareStreamActive = false;
            console.log("[Canvas] Optic Nerve deactivated.");
        } else {
            // Boot Up
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                localMediaStream = stream;
                hardwareStreamVideo.srcObject = stream;
                hardwareStreamVideo.play().catch(e => console.warn("[Canvas] Autoplay hardware lock ignored:", e));
                opticPreviewContainer.classList.remove('hidden');
                opticToggleBtn.classList.add('active');
                hardwareStreamActive = true;
                console.log("[Canvas] Optic Nerve engaged.");
            } catch (err) {
                console.error("[Canvas] Failed to access hardware sensors:", err);
                alert("Optic Nerve Error: Could not access hardware camera. Check permissions.");
            }
        }
    }

    if (opticToggleBtn) {
        opticToggleBtn.addEventListener('click', toggleOpticNerve);
    }

    // Capture the current frame from the webcam stream
    function captureHardwareFrame() {
        if (!hardwareStreamActive || !hardwareStreamVideo) return null;

        const canvas = document.createElement('canvas');
        canvas.width = hardwareStreamVideo.videoWidth || 640;
        canvas.height = hardwareStreamVideo.videoHeight || 480;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(hardwareStreamVideo, 0, 0, canvas.width, canvas.height);

        // Return Base64 JPEG data
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // 85% quality to save bandwidth
        if (!dataUrl || dataUrl === "data:,") {
            console.warn("[Canvas] Optic Nerve frame capture failed (empty buffer).");
            return null;
        }
        return dataUrl;
    }

    // Chat Sending Logic
    async function sendMessage() {
        const text = chatInput.value.trim();
        const frameData = captureHardwareFrame();

        if (!text && !frameData) return; // Allow purely visual prompts if needed, but text is preferred

        // Render user message immediately
        let displayMessage = text;
        if (frameData) {
            displayMessage = `[📸 Optic Frame Captured] ${text}`;
        }
        appendCanvasBlock(displayMessage, 'user');
        chatInput.value = '';

        try {
            const payload = {
                message: text || "Analyze the attached physical space/document.",
                fublead: fublead
            };

            if (frameData) {
                payload.mediaBase64 = frameData;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                appendCanvasBlock('Error: Failed to reach Intelligence Engine.', 'error');
            }
        } catch (error) {
            console.error('Chat error:', error);
            appendCanvasBlock('Error: Network failure.', 'error');
        }
    }

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Polymorphic WebSocket Logic
    const socket = io();

    if (fublead) {
        socket.emit('join_room', fublead);
        console.log(`[Canvas] Joined FUB Context Room: ${fublead}`);
    }

    socket.on('canvas_update', (payload) => {
        console.log("Canvas Update Received:", payload);

        // Handle legacy string payloads gracefully
        if (typeof payload === 'string') {
            appendCanvasBlock(payload, 'markdown');
            return;
        }

        if (payload.type === 'markdown') {
            appendCanvasBlock(payload.content, 'markdown');
        } else if (payload.type === 'widget') {
            // Future-proofing for specialized widgets
            const html = `<div class="canvas-widget" data-widget-type="${payload.widgetType}">${payload.content}</div>`;
            appendCanvasHtml(html);
        }
    });

    function appendCanvasBlock(content, type) {
        const div = document.createElement('div');
        div.className = 'canvas-block';

        if (type === 'user') {
            div.style.borderColor = 'var(--text-secondary)';
            div.innerHTML = `<strong>You:</strong> ${content}`;
        } else if (type === 'error') {
            div.style.borderColor = 'var(--danger)';
            div.style.color = 'var(--danger)';
            div.innerHTML = content;
        } else {
            // Rely on marked.js for markdown rendering
            div.classList.add('canvas-markdown');
            div.innerHTML = marked.parse(content);
        }

        canvasContainer.appendChild(div);
        canvasContainer.scrollTop = canvasContainer.scrollHeight;
    }

    function appendCanvasHtml(htmlString) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = htmlString;
        canvasContainer.appendChild(wrapper.firstChild);
        canvasContainer.scrollTop = canvasContainer.scrollHeight;
    }

    // --- WILLOW V50 Action Queue Socket Intercept ---
    socket.on('canvas_update', (payload) => {
        if (payload.type === 'widget' && (payload.widgetType === 'oracle-input' || payload.widgetType === 'action-queue-item')) {
            const queueContainer = document.getElementById('action-queue-container');
            const wrapper = document.createElement('div');
            wrapper.innerHTML = payload.content;

            // Overwrite existing card for the same lead if present
            const newElem = wrapper.firstElementChild;
            const leadId = newElem.dataset.leadId;
            const existing = queueContainer.querySelector(`[data-lead-id="${leadId}"]`);
            if (existing) {
                existing.replaceWith(newElem);
            } else {
                queueContainer.prepend(newElem);
            }

            // Update badge (rudimentary count)
            const badge = document.querySelector('#tab-action-queue .badge');
            badge.textContent = queueContainer.children.length;

            // Prevent generic canvas rendering
            return;
        }
    });
}

// Global functions for inline HTML widget calls
window.submitOraclePrice = async function (leadId) {
    const inputElem = document.getElementById(`oracle-price-${leadId}`);
    const targetPrice = inputElem.value;

    if (!targetPrice) {
        alert("Please enter a target price.");
        return;
    }

    inputElem.disabled = true;
    inputElem.parentElement.style.opacity = '0.5';

    try {
        await fetch(`/api/willow/resume/${leadId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPrice: targetPrice })
        });
    } catch (err) {
        console.error("Resume error: ", err);
    }
}

window.executeExecutionProtocol = async function (leadId) {
    const card = document.querySelector(`.action-queue-card[data-lead-id="${leadId}"]`);
    if (card) {
        card.style.opacity = '0.5';
        card.innerHTML = `<h2 style="color: var(--success); text-align: center;">🚀 EXECUTING PROTOCOL...</h2>`;
    }
    try {
        await fetch(`/api/willow/execute/${leadId}`, {
            method: 'POST'
        });
        setTimeout(() => {
            if (card) card.remove();

            // Update badge
            const queueContainer = document.getElementById('action-queue-container');
            const badge = document.querySelector('#tab-action-queue .badge');
            badge.textContent = queueContainer.children.length;
        }, 2000);
    } catch (err) {
        console.error("Execution error: ", err);
    }
}

// Anticipatory UI Functions for Widget Injection
window.submitTextPrompt = async function (promptString) {
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    if (!promptString || !chatInput || !chatSend) return;

    // Visually feed into the GUI loop
    chatInput.value = promptString;
    chatSend.click();
};

window.copyText = function (btn) {
    const textTarget = btn.parentElement.querySelector('div, p, span.sms-bubble');
    const textToCopy = textTarget ? textTarget.innerText.replace(/"/g, '') : "Failed to extract text";
    navigator.clipboard.writeText(textToCopy);

    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.color = 'var(--success)';
    btn.style.borderColor = 'var(--success)';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.color = '';
        btn.style.borderColor = '';
    }, 2000);
}

// Start
document.addEventListener('DOMContentLoaded', initDashboard);
