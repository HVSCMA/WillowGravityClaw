// content.js
console.log("[Gravity Claw] Content Script Injected.");

let sidecarWrapper = null;
let currentLeadId = null;

function initializeSidecar() {
    if (document.getElementById('gravity-claw-sidecar-wrapper')) return;

    // Create Wrapper
    sidecarWrapper = document.createElement('div');
    sidecarWrapper.id = 'gravity-claw-sidecar-wrapper';

    // Create Iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'gravity-claw-sidecar-iframe';
    iframe.allow = "microphone; camera"; // Allow AI audio if needed

    sidecarWrapper.appendChild(iframe);
    document.body.appendChild(sidecarWrapper);
}

function updateSidecarUrl(leadId) {
    const iframe = document.getElementById('gravity-claw-sidecar-iframe');
    if (iframe && leadId) {
        const newUrl = `https://hvscma-production.up.railway.app/?fublead=${leadId}&mode=sidecar`;
        // Only update if it changed to avoid reloading
        if (iframe.src !== newUrl) {
            iframe.src = newUrl;
        }
    }
}

// Scrape FUB Lead Data and send webhook
async function harvestSensoryData() {
    const urlMatches = window.location.href.match(/people\/view\/(\d+)/);
    if (!urlMatches) return; // Not on a lead page

    const newLeadId = urlMatches[1];
    if (newLeadId !== currentLeadId) {
        currentLeadId = newLeadId;
        updateSidecarUrl(currentLeadId);
    }

    // Crude scraping (can be refined based on FUB's exact DOM)
    const nameEl = document.querySelector('h1') || document.querySelector('.person-name');
    const name = nameEl ? nameEl.innerText.trim() : "Unknown";

    const payload = {
        leadId: currentLeadId,
        sourceUrl: window.location.href,
        context: {
            name: name,
            scrapedAt: new Date().toISOString()
        }
    };

    console.log("[Gravity Claw] Firing Sensory Webhook for Lead:", currentLeadId);

    try {
        await fetch("https://hvscma-production.up.railway.app/api/sensory/fub_lead", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("[Gravity Claw] Failed to reach Brain:", e);
    }
}

// Listen for toggle messages from Background worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle_sidecar") {
        if (!sidecarWrapper) {
            initializeSidecar();
            harvestSensoryData();
        }

        if (sidecarWrapper.classList.contains('open')) {
            sidecarWrapper.classList.remove('open');
        } else {
            sidecarWrapper.classList.add('open');
            // Re-harvest just in case
            harvestSensoryData();
        }
    }
});

// Observe URL changes (SPA navigation handling)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        harvestSensoryData();
    }
}).observe(document, { subtree: true, childList: true });

// Initial boot
setTimeout(() => {
    // We don't auto-open, but we can auto-harvest
    harvestSensoryData();
}, 2000);
