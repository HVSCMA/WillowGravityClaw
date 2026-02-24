import puppeteer, { Browser, Page } from "puppeteer";
import { OpenAITool } from "../services/mcp.js";

let browserInstance: Browser | null = null;
let pageInstance: Page | null = null;

async function getPage(): Promise<Page> {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });
        pageInstance = await browserInstance.newPage();
    }
    if (!pageInstance) {
        pageInstance = await browserInstance.newPage();
    }
    return pageInstance;
}

export const browserNavigateDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "browser_navigate",
        description: "Navigate the headless browser to a specified URL.",
        parameters: {
            type: "object",
            properties: {
                url: { type: "string", description: "The URL to navigate to" }
            },
            required: ["url"]
        }
    }
};

export async function executeBrowserNavigate(args: any): Promise<any> {
    try {
        const page = await getPage();
        await page.goto(args.url, { waitUntil: "networkidle2", timeout: 15000 });
        const title = await page.title();
        return { success: true, title };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const browserClickDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "browser_click",
        description: "Click an element on the current page using a CSS selector.",
        parameters: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector for the element" }
            },
            required: ["selector"]
        }
    }
};

export async function executeBrowserClick(args: any): Promise<any> {
    try {
        if (!pageInstance) throw new Error("No active page. Call browser_navigate first.");
        await pageInstance.waitForSelector(args.selector, { timeout: 5000 });
        await pageInstance.click(args.selector);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const browserTypeDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "browser_type",
        description: "Type text into an input field on the current page.",
        parameters: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector for the input element" },
                text: { type: "string", description: "The text to type" }
            },
            required: ["selector", "text"]
        }
    }
};

export async function executeBrowserType(args: any): Promise<any> {
    try {
        if (!pageInstance) throw new Error("No active page. Call browser_navigate first.");
        await pageInstance.waitForSelector(args.selector, { timeout: 5000 });
        await pageInstance.type(args.selector, args.text);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const browserExtractDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "browser_extract",
        description: "Extract text content from an element on the current page.",
        parameters: {
            type: "object",
            properties: {
                selector: { type: "string", description: "CSS selector to extract from" }
            },
            required: ["selector"]
        }
    }
};

export async function executeBrowserExtract(args: any): Promise<any> {
    try {
        if (!pageInstance) throw new Error("No active page. Call browser_navigate first.");
        await pageInstance.waitForSelector(args.selector, { timeout: 5000 });
        const content = await pageInstance.$eval(args.selector, el => (el as HTMLElement).innerText);
        return { success: true, content };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export const browserCloseDeclaration: OpenAITool = {
    type: "function",
    function: {
        name: "browser_close",
        description: "Close the active browser instance to free up memory.",
        parameters: { type: "object", properties: {} }
    }
};

export async function executeBrowserClose(args: any): Promise<any> {
    try {
        if (browserInstance) {
            await browserInstance.close();
            browserInstance = null;
            pageInstance = null;
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
