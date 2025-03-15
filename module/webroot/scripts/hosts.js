import { execCommand, showPrompt, applyRippleEffect, checkMMRL, basePath } from './util.js';
import { initializeAvailableLanguages, detectUserLanguage, loadTranslations } from './language.js';

const filePaths = {
    custom: `${basePath}/custom.txt`,
    sources: `${basePath}/sources.txt`,
    blacklist: `${basePath}/blacklist.txt`,
    whitelist: `${basePath}/whitelist.txt`,
    sources_whitelist: `${basePath}/sources_whitelist.txt`,
};

// Function to read a file and display its content in the UI
async function loadFile(fileType) {
    try {
        const content = await execCommand(`
            [ -f ${filePaths[fileType]} ] || touch ${filePaths[fileType]}
            cat ${filePaths[fileType]}
        `);
        const lines = content
            .split("\n")
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#"));
        const listElement = document.getElementById(`${fileType}-list`);
        listElement.innerHTML = "";
        lines.forEach(line => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `
                <span>${line}</span>
                <button class="delete-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="#ffffff"><path d="M277.37-111.87q-37.78 0-64.39-26.61t-26.61-64.39v-514.5h-45.5v-91H354.5v-45.5h250.52v45.5h214.11v91h-45.5v514.5q0 37.78-26.61 64.39t-64.39 26.61H277.37Zm78.33-168.37h85.5v-360h-85.5v360Zm163.1 0h85.5v-360h-85.5v360Z"/></svg>
                </button>
            `;
            // Click to show remove button
            listElement.appendChild(listItem);
            listItem.addEventListener('click', () => {
                listItem.scrollTo({ left: listItem.scrollWidth, behavior: 'smooth' });
            });
            // Remove line from file
            listItem.querySelector(".delete-btn").addEventListener("click", async () => {
                await execCommand(`sed -i "/^${line}/d" ${filePaths[fileType]}`);
                listElement.removeChild(listItem);
            });
        });
    } catch (error) {
        console.error(`Failed to load ${fileType} file: ${error}`);
    }
}

// Function to handle adding input to the file
async function handleAdd(fileType, prompt) {
    const inputElement = document.getElementById(`${fileType}-input`);
    const inputValue = inputElement.value.trim();
    console.log(`Input value for ${fileType}: "${inputValue}"`);
    if (inputValue === "") {
        console.error("Input is empty. Skipping add operation.");
        return;
    }
    const inputLines = inputValue.split('\n').map(line => line.trim()).filter(line => line !== "");
    try {
        const fileContent = await execCommand(`cat ${filePaths[fileType]}`);
        const existingLines = fileContent.split('\n').map(line => line.trim()).filter(line => line !== "");

        for (const line of inputLines) {
            if (existingLines.includes(line)) {
                console.log(`"${line}" is already in ${fileType}. Skipping add operation.`);
                showPrompt(prompt, false, 2000, `${line}`);
                continue;
            }
            await execCommand(`echo "${line}" >> ${filePaths[fileType]}`);
            console.log(`Added "${line}" to ${fileType} successfully.`);
        }

        inputElement.value = "";
        console.log(`Input box for ${fileType} cleared.`);
        loadFile(fileType);
    } catch (error) {
        console.error(`Failed to process input for ${fileType}: ${error}`);
    }
}

// Help event listener
export let activeOverlay = null;
function setupHelpMenu() {
    const helpButtons = document.querySelectorAll(".help-btn");
    const overlays = document.querySelectorAll(".overlay");
    helpButtons.forEach(button => {
        button.addEventListener("click", () => {
            const type = button.dataset.type;
            const overlay = document.getElementById(`${type}-help`);
            if (overlay) {
                openOverlay(overlay);
            }
        });
    });
    overlays.forEach(overlay => {
        const closeButton = overlay.querySelector(".close-btn");
        const docsButtons = overlay.querySelector(".docs-btn");
        const languageContainer = document.getElementById('language-container');
        const language = document.getElementById('language-help');

        if (closeButton) {
            closeButton.addEventListener("click", () => closeOverlay(overlay));
        }

        if (docsButtons) {
            docsButtons.addEventListener("click", () => closeOverlay(overlay));
        }

        if (languageContainer) {
            languageContainer.addEventListener('click', () => {
            openOverlay(language);
            });
        }

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeOverlay(overlay);
            }
        });
    });
    function openOverlay(overlay) {
        if (activeOverlay) closeOverlay(activeOverlay);
        activeOverlay = overlay;
        overlay.style.display = "flex";
        document.body.style.overflow = "hidden";
        setTimeout(() => {
            overlay.style.opacity = "1";
        }, 10);
    }
    function closeOverlay(overlay) {
        activeOverlay = null;
        document.body.style.overflow = "";
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.style.display = "none";
        }, 200);
    }
}

// Prevent input box blocked by keyboard
document.querySelectorAll('textarea').forEach(input => {
    input.addEventListener('focus', event => {
        document.querySelector('.placeholder').classList.add('focused');
        const wrapper = event.target.closest('.input-box-wrapper');
        wrapper.classList.add('focus');
        const inputBox = wrapper.querySelector('.input-box');
        inputBox.style.paddingLeft = '9px';
        setTimeout(() => {
            const inputRect = event.target.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const keyboardHeight = viewportHeight * 0.6;
            const safeArea = 20;
            if (inputRect.bottom > (viewportHeight - keyboardHeight)) {
                const scrollAmount = inputRect.bottom - (viewportHeight - keyboardHeight) + safeArea;
                document.querySelector('.content').scrollBy({
                    top: scrollAmount,
                    behavior: 'smooth'
                });
            }
        }, 100);
    });
    input.addEventListener('blur', () => {
        document.querySelector('.placeholder').classList.remove('focused');
        const wrapper = input.closest('.input-box-wrapper');
        wrapper.classList.remove('focus');
        const inputBox = wrapper.querySelector('.input-box');
        inputBox.style.paddingLeft = '10px';
    });
});

// Attach event listeners to the add buttons
function attachAddButtonListeners() {
    const elements = [
        { id: "custom-input", type: "custom", fail: "custom.prompt_fail" },
        { id: "sources-input", type: "sources", fail: "source.prompt_fail" },
        { id: "blacklist-input", type: "blacklist", fail: "blacklist.prompt_fail" },
        { id: "whitelist-input", type: "whitelist", fail: "whitelist.prompt_fail" },
        { id: "sources_whitelist-input", type: "sources_whitelist", fail: "sources_whitelist.prompt_fail" }
    ];
    elements.forEach(({ id, type, fail }) => {
        const inputElement = document.getElementById(id);
        const buttonElement = document.getElementById(`${type}-add`);
        if (inputElement) {
            inputElement.addEventListener("keypress", (e) => {
                if (e.key === "Enter") handleAdd(type, fail);
            });
        }
        if (buttonElement) {
            buttonElement.addEventListener("click", () => handleAdd(type, fail));
        }
    });
}


/**
 * Action button click event
 * Run bindhosts.sh --action on click
 */
document.getElementById("actionButton").addEventListener("click", async () => {
    try {
        showPrompt("global.executing", true, 50000);
        await new Promise(resolve => setTimeout(resolve, 200));
            const command = "sh /data/adb/modules/bindhosts/bindhosts.sh --action";
            const output = await execCommand(command);
            const lines = output.split("\n");
            lines.forEach(line => {
                if (line.includes("[+] hosts file reset!")) {
                    showPrompt("global.reset", true, undefined, "[+]");
                } else if (line.includes("[+]")) {
                    showPrompt(line, true);
                } else if (line.includes("[x] unwritable")) {
                    showPrompt("global.unwritable", false, undefined, "[×]");
                } else if (line.includes("[x]")) {
                    showPrompt(line, false);
                } else if (line.includes("[*] not running")) {
                    showPrompt("global.disabled", false, undefined, "[*]");
                } else if (line.includes("[*] please reset")) {
                    showPrompt("global.adaway", false, undefined, "[*]");
                } else if (line.includes("[*]")) {
                    showPrompt(line, false);
                }
            });
    } catch (error) {
        showPrompt("global.execute_error", false, undefined, undefined, error);
        console.error("Failed to execute action script:", error);
    }
});

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    checkMMRL();
    await initializeAvailableLanguages();
    const userLang = await detectUserLanguage();
    await loadTranslations(userLang);
    ["custom", "sources", "blacklist", "whitelist", "sources_whitelist"].forEach(loadFile);
    attachAddButtonListeners();
    setupHelpMenu();
    applyRippleEffect();
});