// background.js

chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes("followupboss.com")) {
        // Send a message to the content script in the active tab
        chrome.tabs.sendMessage(tab.id, { action: "toggle_sidecar" });
    }
});
