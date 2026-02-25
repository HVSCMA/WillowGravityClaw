import io from 'socket.io-client';

async function verifyProduction() {
    const url = "https://gravity-claw-production-6f74.up.railway.app";
    const leadId = "PRODUCTION_VERIFICATION";
    const delayMs = 15000;
    const maxRetries = 10;

    console.log("Connecting to Railway WebSocket...");

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        await new Promise<void>((resolve) => {
            const socket = io(url, { transports: ['websocket', 'polling'] });
            let isResolved = false;

            const closeAndResolve = () => {
                if (!isResolved) {
                    isResolved = true;
                    socket.disconnect();
                    resolve();
                }
            };

            socket.on("connect", async () => {
                console.log(`[Attempt ${attempt + 1}] Connected. Joining room fublead_${leadId}...`);
                socket.emit("join_room", leadId);

                socket.on("canvas_update", (payload: any) => {
                    if (payload.type === "markdown" && payload.content !== "*Thinking...*") {
                        if (payload.content.includes("Agent is using tool")) return;

                        console.log("\n=== PRODUCTION SOCKET RESPONSE ===");
                        console.log(payload.content);
                        console.log("==================================\n");

                        const text = payload.content.toLowerCase();
                        if (text.includes("arrr") || text.includes("matey")) {
                            console.warn("⚠️ PIRATE PERSONA STILL DETECTED. Railway deployment may still be building. Retrying...");
                            closeAndResolve();
                        } else if (text.length > 5) {
                            console.log("✅ SUCCESS: The agent responded with a professional, non-pirate tone. Deployment is live!");
                            process.exit(0);
                        }
                    }
                });

                // Trigger the chat POST
                console.log("Triggering prompt...");
                fetch(`${url}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ message: "hello", fublead: leadId })
                }).catch(err => console.error("Fetch error:", err));
            });

            socket.on("connect_error", (err) => {
                console.log(`Socket connection error: ${err.message}`);
                closeAndResolve();
            });

            setTimeout(() => {
                console.log("Timeout waiting for response.");
                closeAndResolve();
            }, delayMs);
        });

        console.log(`Retrying in 5 seconds...`);
        await new Promise(r => setTimeout(r, 5000));
    }

    console.error("❌ Failed to verify production update.");
    process.exit(1);
}

verifyProduction();
