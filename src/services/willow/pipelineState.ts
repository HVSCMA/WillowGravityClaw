export interface PipelineState {
    leadId: string;
    address: string;
    targetPrice: number | null;
    status: "PENDING_INTENT" | "AWAITING_ORACLE" | "COMPUTING" | "VERIFICATION_FAILED" | "READY_FOR_APPROVAL" | "EXECUTED";
    assets?: {
        infographicUrl?: string;
        mmsDraft?: string;
        emailDraft?: string;
    };
}

// In-memory store for active pipelines
export const activePipelines: Record<string, PipelineState> = {};
