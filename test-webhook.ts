async function main() {
    console.log("Triggering Webhook...");
    try {
        const res = await fetch("http://localhost:3000/webhook/fello", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lead_id: "L-123", address: "80 Oak Ln" })
        });
        console.log("Webhook Response:", await res.json());

        // Wait a few seconds for WILLOW CCO Gate to trigger
        console.log("Waiting 3s for pipeline initialization...");
        await new Promise(r => setTimeout(r, 3000));

        // Let's assume the human provided the price
        console.log("Submitting Oracle price...");
        const res2 = await fetch("http://localhost:3000/api/willow/resume/L-123", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetPrice: 850000 })
        });
        console.log("Resume Response:", await res2.json());

    } catch (e) {
        console.error("Test failed:", e);
    }
}

main();
