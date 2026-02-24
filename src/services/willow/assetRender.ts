// SEAT 4: THE C.M.O. (CHIEF MARKETING OFFICER) / The Artisan
// Domain: Visual Asset Rendering Engine (Non-LLM)
// Technical Skill: skill_render_glassmorphism_asset

import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";
import type { CompDetails } from "./marketDefense.js";

/**
 * Renders a NotebookLM style 9:16 translucent frosted-glass infographic.
 * @param compData Array of verified comparables.
 * @param targetPrice The Oracle's approved target price.
 * @returns Path to the generated PNG asset.
 */
export async function executeAssetRender(compData: CompDetails[], targetPrice: number, address: string): Promise<string> {
    console.log(`[WILLOW C.M.O.] Initializing Renderer for ${address}...`);

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                margin: 0;
                padding: 0;
                width: 1080px;
                height: 1920px;
                background-image: url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1080&q=80');
                background-size: cover;
                background-position: center;
                font-family: 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .glass-card {
                background: rgba(25, 25, 25, 0.4);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 40px;
                padding: 80px;
                width: 85%;
                color: white;
                box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
            }
            .header-info { text-align: center; margin-bottom: 60px; }
            .address { font-size: 50px; font-weight: 500; letter-spacing: 2px; color: #aaa; text-transform: uppercase; }
            .target-price { font-size: 160px; font-weight: 800; margin: 20px 0; background: linear-gradient(180deg, #fff, #bbb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .label { font-size: 40px; font-weight: 600; color: #4ade80; text-transform: uppercase; letter-spacing: 4px; }
            
            .comps-list { margin-top: 60px; border-top: 2px solid rgba(255, 255, 255, 0.1); padding-top: 60px; }
            .comp-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 40px;}
            .comp-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0;}
            .comp-address { font-size: 45px; font-weight: 600; }
            .comp-details { font-size: 35px; color: #bbb; margin-top: 10px; }
            .comp-price { font-size: 55px; font-weight: 700; color: white; }
            
            .footer { position: absolute; bottom: 80px; display: flex; align-items: center; gap: 30px; background: rgba(0,0,0,0.6); padding: 30px 60px; border-radius: 100px; backdrop-filter: blur(10px); }
            .headshot { width: 120px; height: 120px; border-radius: 50%; border: 3px solid white; object-fit: cover; }
            .agent-info h2 { margin: 0; font-size: 40px; color: white; }
            .agent-info p { margin: 10px 0 0 0; font-size: 30px; color: #aaa; }
        </style>
    </head>
    <body>
        <div class="glass-card">
            <div class="header-info">
                <div class="address">${address}</div>
                <div class="target-price">$${targetPrice.toLocaleString()}</div>
                <div class="label">Target Execution Price</div>
            </div>
            <div class="comps-list">
                ${compData.map(c => `
                    <div class="comp-item">
                        <div>
                            <div class="comp-address">${c.address}</div>
                            <div class="comp-details">${c.sqft} SQFT | ${c.lotAcres} Acres</div>
                        </div>
                        <div class="comp-price">$${c.price.toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="footer">
            <img class="headshot" src="https://ui-avatars.com/api/?name=Glenn+Fitzgerald&background=random&size=200" alt="Glenn">
            <div class="agent-info">
                <h2>Glenn Fitzgerald</h2>
                <p>Chairman & Human Oracle</p>
            </div>
        </div>
    </body>
    </html>
    `;

    console.log("[WILLOW C.M.O.] Spinning up Puppeteer for HTML-to-Image rendering...");
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Output directory handling
    const outputDir = path.join(process.cwd(), "public", "assets", "willow");
    await fs.mkdir(outputDir, { recursive: true });

    const fileName = `target_price_${Date.now()}.png`;
    const outputPath = path.join(outputDir, fileName);

    await page.screenshot({ path: outputPath, type: "png", omitBackground: true });
    await browser.close();

    console.log(`[WILLOW C.M.O.] 🎨 Artisan Render Complete: ${outputPath}`);

    // Return relative URL for web display
    return `/assets/willow/${fileName}`;
}
