import { execCommand, showPrompt, applyRippleEffect, checkMMRL, basePath, initialTransition } from './util.js';
import { loadTranslations } from './language.js';

/**
 * Function to check the if user has installed bindhosts app
 * Show QS tile option when user has not installed bindhosts app
 * Click to install bindhosts app
 */
async function checkBindhostsApp() {
    const tilesContainer = document.getElementById('tiles-container');
    try {
        const appInstalled = await execCommand(`pm path me.itejo443.bindhosts >/dev/null 2>&1 || echo "false"`);
        if (appInstalled.trim() === "false") {
            tilesContainer.style.display = "flex";
        }
    } catch (error) {
        console.error("Error while checking bindhosts app:", error);
    }
    tilesContainer.addEventListener('click', async () => {
        try {
            showPrompt("control_panel.installing", true, undefined, "[+]");
            await new Promise(resolve => setTimeout(resolve, 200));
            const output = await execCommand("sh /data/adb/modules/bindhosts/bindhosts-app.sh");
            const lines = output.split("\n");
            lines.forEach(line => {
                if (line.includes("[+]")) {
                    showPrompt("control_panel.installed", true, 5000, "[+]");
                    tilesContainer.style.display = "none";
                } else if (line.includes("[x] Failed to download")) {
                    showPrompt("control_panel.download_fail", false, undefined, "[×]");
                } else if (line.includes("[*]")) {
                    showPrompt("control_panel.install_fail", false, 5000, "[×]");
                }
            });
        } catch (error) {
            console.error("Execution failed:", error);
        }
    });
}

/**
 * Function to check module update status
 * Event listener for module update toggle
 */
async function checkUpdateStatus() {
    const toggleVersion = document.getElementById('toggle-version');
    try {
        const result = await execCommand("grep -q '^updateJson' /data/adb/modules/bindhosts/module.prop");
        toggleVersion.checked = true;
    } catch (error) {
        toggleVersion.checked = false;
        console.error('Error checking update status:', error);
    }
}
document.getElementById('update-toggle-container').addEventListener('click', async function () {
    try {
        const result = await execCommand("sh /data/adb/modules/bindhosts/bindhosts.sh --toggle-updatejson");
        const lines = result.split("\n");
        lines.forEach(line => {
            if (line.includes("[+]")) {
                showPrompt("control_panel.update_true", true, undefined, "[+]");
            } else if (line.includes("[x]")) {
                showPrompt("control_panel.update_false", false, undefined, "[×]");
            }
        });
        checkUpdateStatus();
    } catch (error) {
        console.error("Failed to toggle update", error);
    }
});

/**
 * Display action redirect switch when running in Magisk
 * Action redirect WebUI toggle
 */
const actionRedirectContainer = document.getElementById('action-redirect-container');
const actionRedirectStatus = document.getElementById('action-redirect');
async function checkMagisk() {
    try {
        const magiskEnv = await execCommand(`command -v magisk >/dev/null 2>&1 && echo "true" || echo "false"`);
        if (magiskEnv.trim() === "true") {
            actionRedirectContainer.style.display = "flex";
            actionRedirectContainer.addEventListener('click', async function () {
                try {
                    await execCommand(`sed -i "s/^magisk_webui_redirect=.*/magisk_webui_redirect=${actionRedirectStatus.checked ? 0 : 1}/" ${basePath}/webui_setting.sh`);
                    if (actionRedirectStatus.checked) {
                        showPrompt("control_panel.action_prompt_false", false, undefined, "[×]");
                    } else {
                        showPrompt("control_panel.action_prompt_true", true, undefined, "[+]");
                    }
                    await checkRedirectStatus();
                } catch (error) {
                    console.error("Failed to execute change status", error);
                }
            });
            await checkRedirectStatus();
        }
    } catch (error) {
        console.error("Error while checking magisk", error);
    }
}
async function checkRedirectStatus() {
    try {
        const result = await execCommand(`[ ! -f ${basePath}/webui_setting.sh ] || grep -q '^magisk_webui_redirect=1' ${basePath}/webui_setting.sh`);
        actionRedirectStatus.checked = true;
    } catch (error) {
        actionRedirectStatus.checked = false;
        console.error('Error checking action redirect status:', error);
    }
}

/**
 * Function to check cron status
 * Event listener for cron toggle
 */
const cronToggle = document.getElementById('toggle-cron');
async function checkCronStatus() {
    try {
        const result = await execCommand(`grep -q "bindhosts.sh" ${basePath}/crontabs/root`);
        cronToggle.checked = true;
    } catch (error) {
        cronToggle.checked = false;
        console.error('Error checking cron status:', error);
    }
}
document.getElementById('cron-toggle-container').addEventListener('click', async function () {
    try {
        const result = await execCommand(`sh /data/adb/modules/bindhosts/bindhosts.sh --${cronToggle.checked ? "disable" : "enable"}-cron`);
        const lines = result.split("\n");
        lines.forEach(line => {
            if (line.includes("[+]")) {
                showPrompt("control_panel.cron_true", true, undefined, "[+]");
            } else if (line.includes("[x]")) {
                showPrompt("control_panel.cron_false", false, undefined, "[×]");
            }
        });
        checkCronStatus();
    } catch (error) {
        console.error("Failed to toggle cron", error);
    }
});

// Language menu
document.getElementById('language-container').addEventListener('click', () => {
    const languageOverlay = document.getElementById('language-overlay');
    const overlayContent = document.querySelector('.overlay-content');
    languageOverlay.style.display = 'flex';
    setTimeout(() => {
        languageOverlay.style.opacity = '1';
    }, 10);

    const closeOverlay = () => {
        languageOverlay.style.opacity = '0';
        setTimeout(() => {
            languageOverlay.style.display = 'none';
        }, 200);
    };

    document.querySelector('.close-btn').addEventListener('click', closeOverlay);
    languageOverlay.addEventListener('click', (event) => {
        if (!overlayContent.contains(event.target)) closeOverlay();
    });
});

document.addEventListener('DOMContentLoaded', async () => {
    checkMMRL();
    initialTransition();
    loadTranslations();
    checkUpdateStatus();
    checkBindhostsApp();
    checkMagisk();
    applyRippleEffect();
});