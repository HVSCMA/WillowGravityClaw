import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export interface SystemSkill {
    name: string;
    description: string;
    instructions: string;
}

export async function loadSystemSkills(): Promise<SystemSkill[]> {
    const skillsDir = path.resolve(process.cwd(), "skills");
    const loadedSkills: SystemSkill[] = [];

    try {
        const files = await fs.readdir(skillsDir);
        for (const file of files) {
            if (file.endsWith(".md")) {
                const fullPath = path.join(skillsDir, file);
                const content = await fs.readFile(fullPath, "utf-8");
                const parsed = matter(content);

                loadedSkills.push({
                    name: parsed.data.name || path.parse(file).name,
                    description: parsed.data.description || "No description provided.",
                    instructions: parsed.content.trim()
                });
            }
        }
    } catch (error: any) {
        // If the directory doesn't exist, ignore and return empty.
        if (error.code !== "ENOENT") {
            console.error(`[SkillsLoader] Failed to read skills: ${error.message}`);
        }
    }

    return loadedSkills;
}

export async function buildSkillsPrompt(skills: SystemSkill[]): Promise<string> {
    if (skills.length === 0) return "";

    let promptBlock = "\n\n=== LOADED CAPABILITIES (SKILLS) ===\nYou have been injected with the following custom skills. Follow their instructions strictly when interacting with the user or their system.\n\n";

    for (const skill of skills) {
        promptBlock += `## Skill: ${skill.name}\n`;
        promptBlock += `**Description**: ${skill.description}\n`;
        promptBlock += `**Instructions**:\n${skill.instructions}\n\n`;
    }

    promptBlock += "===================================\n";
    return promptBlock;
}
