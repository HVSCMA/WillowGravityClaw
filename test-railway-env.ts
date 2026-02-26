async function checkCloudEnv() {
    try {
        const res = await fetch("https://gravity-claw-production-6f74.up.railway.app/api/dashboard/setup");
        const data = await res.json();
        console.log("=== CLOUD ENVIRONMENT DIAGNOSTIC ===");
        if (data.isFullyArmed) {
            console.log("GREEN: All critical keys are present.");
        } else {
            console.log("RED: Missing Keys Detected!");
            data.missingKeys.forEach((k: any) => console.log(`- ${k.key} (Needed for: ${k.feature})`));
        }
    } catch (e) {
        console.error("Diagnostic failed:", e);
    }
}
checkCloudEnv();
