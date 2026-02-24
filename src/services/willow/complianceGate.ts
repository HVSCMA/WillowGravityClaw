// SEAT 2: THE C.C.O. (CHIEF COMPLIANCE OFFICER) / The Warden
// Domain: State Management & Executive Enforcement
// Technical Skill: skill_prime_directive_gatekeeper

/**
 * Enforces the Prime Directive: Halts operations if Agent_Established_Price is NULL.
 * @param targetPrice The target price passed from the C.I.O.
 * @returns Boolean TRUE to proceed + $Target_Price. Throws/Halts if NULL.
 */
export async function executeComplianceGate(targetPrice: number | null): Promise<{ proceed: boolean, targetPrice: number }> {
    if (targetPrice === null) {
        console.error("[WILLOW C.C.O.] 🚨 FATAL HALT: Prime Directive Violation. Agent_Established_Price is NULL.");
        // We throw a specific error to catch in the pipeline and alert the UI
        throw new Error("PRIME_DIRECTIVE_HALT");
    }

    console.log(`[WILLOW C.C.O.] Prime Directive Satisfied. Target Price Verified: $${targetPrice.toLocaleString()}. Unlocking pipeline.`);

    return {
        proceed: true,
        targetPrice: targetPrice
    };
}
