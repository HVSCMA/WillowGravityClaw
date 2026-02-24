import { executeOmniSync } from "./omniSync.js";
import { executeComplianceGate } from "./complianceGate.js";
import { executeMarketDefense } from "./marketDefense.js";
import { executeAssetRender } from "./assetRender.js";
import { executeCommsVP } from "./commsVP.js";
import { updateLiveCanvas } from "../../server.js";
import { activePipelines } from "./pipelineState.js";
import { spawn } from "child_process";
import path from "path";

/**
 * Executes the pure python C.R.O. script to verify the payload.
 */
async function executeRiskOfficerAudit(mmsDraft: string, emailDraft: string, comps: any[], targetPrice: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), "src", "services", "willow", "factLock.py");

        const draftsJson = JSON.stringify({ mmsDraft, emailDraft });
        const compsJson = JSON.stringify(comps);

        const pythonProcess = spawn("python", [scriptPath, draftsJson, compsJson, targetPrice.toString()]);

        let stdout = "";
        let stderr = "";

        pythonProcess.stdout.on("data", (data) => { stdout += data.toString(); });
        pythonProcess.stderr.on("data", (data) => { stderr += data.toString(); });

        pythonProcess.on("close", (code) => {
            if (code !== 0) {
                console.error(`[WILLOW C.R.O.] Script failed. Code ${code}: ${stderr}`);
                resolve(false);
                return;
            }
            try {
                const result = JSON.parse(stdout);
                if (result.status === "VERIFIED") {
                    console.log("[WILLOW C.R.O.] Output verified against hallucination firewall.");
                    resolve(true);
                } else {
                    console.error(`[WILLOW C.R.O.] Audit failed: ${result.reason}`);
                    resolve(false);
                }
            } catch (err) {
                console.error("[WILLOW C.R.O.] Could not parse python output.");
                resolve(false);
            }
        });
    });
}

/**
 * Initializes the pipeline on an inbound lead.
 */
export async function initializePipeline(leadId: string, address: string, initialPayload: any) {
    console.log(`[PIPELINE] Initializing deep compute for ${leadId} at ${address}.`);

    // Create new pipeline state
    activePipelines[leadId] = {
        leadId,
        address,
        targetPrice: null,
        status: "PENDING_INTENT"
    };

    // 1. C.I.O. wakes up
    const cioStatus = await executeOmniSync(initialPayload, null);

    try {
        // 2. C.C.O. Gate Keeper
        await executeComplianceGate(cioStatus.targetPrice);
    } catch (error: any) {
        if (error.message === "PRIME_DIRECTIVE_HALT") {
            activePipelines[leadId].status = "AWAITING_ORACLE";

            // Alert Frontend via WebSocket to request Oracle input
            updateLiveCanvas({
                type: 'widget',
                widgetType: 'oracle-input',
                content: `
                    <div class="glass-panel oracle-alert" data-lead-id="${leadId}">
                        <h2 style="color: var(--danger);">🚨 HIGH-VALUE TARGET ACQUIRED</h2>
                        <p>PIPELINE HALTED: EXPERT VALUATION REQUIRED TO PROCEED.</p>
                        <p><strong>Address:</strong> ${address}</p>
                        <input type="number" id="oracle-price-${leadId}" placeholder="Enter Target Price ($)" class="neo-input" />
                        <button class="primary-btn" onclick="submitOraclePrice('${leadId}')">UNLOCK PIPELINE</button>
                    </div>
                `
            });
            return;
        }
    }
}

/**
 * Resumes pipeline after Oracle supplies the target price.
 */
export async function resumePipeline(leadId: string, targetPrice: number) {
    const state = activePipelines[leadId];
    if (!state) throw new Error("Pipeline state not found.");

    console.log(`[PIPELINE] Oracle Price Accepted: $${targetPrice}. Resuming Deep Compute...`);

    state.targetPrice = targetPrice;
    state.status = "COMPUTING";

    // Update UI
    updateLiveCanvas({ type: 'markdown', content: `*Deep Compute Initiated for ${state.address} at $${targetPrice}...*` });

    try {
        // 3. C.F.O. Anchored Defense
        const verifiedComps = await executeMarketDefense(targetPrice);

        // 4. C.M.O. Asset Render & 5. V.P. Comms Draft (Parallelized for speed)
        const [infographicUrl, commsPayload] = await Promise.all([
            executeAssetRender(verifiedComps, targetPrice, state.address),
            executeCommsVP(verifiedComps, targetPrice, state.address)
        ]);

        // 6. C.R.O. Hallucination Firewall
        const isValid = await executeRiskOfficerAudit(commsPayload.mmsDraft, commsPayload.emailDraft, verifiedComps, targetPrice);

        if (!isValid) {
            state.status = "VERIFICATION_FAILED";
            updateLiveCanvas({ type: 'markdown', content: `**🚨 FATAL ERROR:** The C.R.O. detected hallucinated data or a math error in the V.P.'s draft. Pipeline blocked.` });
            return;
        }

        // 7. Pipeline complete, ready for Action Queue
        state.status = "READY_FOR_APPROVAL";
        state.assets = {
            infographicUrl,
            mmsDraft: commsPayload.mmsDraft,
            emailDraft: commsPayload.emailDraft
        };

        // Push "Approve" UI widget to the canvas
        updateLiveCanvas({
            type: 'widget',
            widgetType: 'action-queue-item',
            content: `
                <div class="glass-panel action-queue-card" data-lead-id="${leadId}">
                    <h2 style="color: var(--success); text-align: center;">✅ PIPELINE READY: ${state.address}</h2>
                    <div style="display: flex; gap: 20px; margin-top: 20px;">
                        <div style="flex: 1;">
                            <img src="${infographicUrl}" style="width: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);" />
                        </div>
                        <div style="flex: 2; display: flex; flex-direction: column; gap: 15px;">
                            <div class="draft-block glass-panel">
                                <h3>MMS TIME-ZERO STRIKE</h3>
                                <pre>${commsPayload.mmsDraft}</pre>
                            </div>
                            <div class="draft-block glass-panel">
                                <h3>+24H ANCHOR EMAIL</h3>
                                <pre>${commsPayload.emailDraft}</pre>
                            </div>
                        </div>
                    </div>
                    <button class="primary-btn glow-btn" style="width: 100%; margin-top: 20px; padding: 20px; font-size: 1.2rem; font-weight: bold;" onclick="executeExecutionProtocol('${leadId}')">
                        [ APPROVE & EXECUTE PROTOCOL ]
                    </button>
                </div>
            `
        });

    } catch (error) {
        console.error("[PIPELINE] Execution Failed:", error);
        state.status = "VERIFICATION_FAILED";
    }
}
