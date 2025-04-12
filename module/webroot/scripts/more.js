import { exec, showPrompt, applyRippleEffect, checkMMRL, basePath, initialTransition, moduleDirectory, linkRedirect, filePaths } from './util.js';
import { loadTranslations } from './language.js';
import { openFileSelector } from './file_selector.js';

/**
 * Check if user has installed bindhosts app
 * Show QS tile option when user has not installed bindhosts app
 * Click to install bindhosts app
 * @returns {Promise<void>}
 */
async function checkBindhostsApp() {
    const tilesContainer = document.getElementById('tiles-container');
    try {
        await new Promise(resolve => setTimeout(resolve, 80));
        const appInstalled = await exec(`pm path me.itejo443.bindhosts >/dev/null 2>&1 || echo "false"`);
        if (appInstalled.trim() === "false") {
            tilesContainer.style.display = "flex";
        }
    } catch (error) {
        console.error("Error while checking bindhosts app:", error);
    }
}

/**
 * Install the bindhosts app, called by controlPanelEventlistener
 * @returns {Promise<void>}
 */
async function installBindhostsApp () {
    try {
        showPrompt("control_panel.installing", true, undefined, "[+]");
        await new Promise(resolve => setTimeout(resolve, 200));
        const output = await exec(`sh ${moduleDirectory}/bindhosts-app.sh`);
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
}

/**
 * Check module update status
 * Event listener for module update toggle
 * @returns {void}
 */
function checkUpdateStatus() {
    const toggleVersion = document.getElementById('toggle-version');
    fetch(`link/MODDIR/module.prop`)
        .then(response => response.text())
        .then(data => {
            const lines = data.split('\n');
            toggleVersion.checked = lines.some(line => line.trim().startsWith("updateJson="));
        })
}

/**
 * Switch module update status and refresh toggle, called by controlPanelEventlistener
 * @returns {Promise<void>}
 */
async function toggleModuleUpdate() {
    try {
        const result = await exec(`sh ${moduleDirectory}/bindhosts.sh --toggle-updatejson`);
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
}

const actionRedirectStatus = document.getElementById('action-redirect');
/**
 * Display action redirect switch when running in Magisk
 * Action redirect WebUI toggle
 * @returns {Promise<void>}
 */
async function checkMagisk() {
    try {
        await new Promise(resolve => setTimeout(resolve, 80));
        const magiskEnv = await exec(`command -v magisk >/dev/null 2>&1 && echo "true" || echo "false"`);
        if (magiskEnv.trim() === "true") {
            document.getElementById('action-redirect-container').style.display = "flex";
            checkRedirectStatus();
        }
    } catch (error) {
        console.error("Error while checking magisk", error);
    }
}

/**
 * Toggle the action redirect WebUI setting, called by controlPanelEventlistener
 * @returns {Promise<void>}
 */
async function toggleActionRedirectWebui() {
    try {
        await exec(`
            echo "magisk_webui_redirect=${actionRedirectStatus.checked ? 0 : 1}" > ${basePath}/webui_setting.sh
            chmod 755 ${basePath}/webui_setting.sh
        `);
        if (actionRedirectStatus.checked) {
            showPrompt("control_panel.action_prompt_false", false, undefined, "[×]");
        } else {
            showPrompt("control_panel.action_prompt_true", true, undefined, "[+]");
        }
        checkRedirectStatus();
    } catch (error) {
        console.error("Failed to execute change status", error);
    }
}

/**
 * Check action redirect status
 * @returns {void}
 */
function checkRedirectStatus() {
    fetch(`link/PERSISTENT_DIR/webui_setting.sh`)
        .then(response => {
            if (!response.ok) throw new Error('File not found');
            return response.text();
        })
        .then(data => {
            const redirectStatus = data.match(/magisk_webui_redirect=(\d)/)[1];
            actionRedirectStatus.checked = redirectStatus === "1";
        })
        .catch(error => {
            actionRedirectStatus.checked = true;
        });
}

const cronToggle = document.getElementById('toggle-cron');
/**
 * Check cron status
 * Event listener for cron toggle
 * @returns {Promise<void>}
 */
async function checkCronStatus() {
    try {
        // Hide cron toggle when using AdAway
        const status = await fetch('link/MODDIR/module.prop');
        const text = await status.text();
        if (text.includes('AdAway')) {
            document.getElementById('cron-toggle-container').style.display = 'none';
        }

        await new Promise(resolve => setTimeout(resolve, 80));
        const result = await exec(`grep -q "bindhosts.sh" ${basePath}/crontabs/root || echo "false"`);
        cronToggle.checked = result.trim() === "false" ? false : true;
    } catch (error) {
        console.error('Error checking cron status:', error);
    }
}

/**
 * Toggle cron job status, called by controlPanelEventlistener
 * @returns {Promise<void>}
 */
async function toggleCron() {
    try {
        const result = await exec(`sh ${moduleDirectory}/bindhosts.sh --${cronToggle.checked ? "disable" : "enable"}-cron`);
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
}

/**
 * Open language menu overlay, called by controlPanelEventlistener
 * @returns {void}
 */
function openLanguageMenu() {
    const languageOverlay = document.getElementById('language-overlay');
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

    let languageMenuListener = false;
    if (!languageMenuListener) {
        document.querySelector('.close-btn').addEventListener('click', closeOverlay);
        languageOverlay.addEventListener('click', (event) => {
            if (event.target === languageOverlay) closeOverlay();
        });
        languageMenuListener = true;
    }
}

/**
 * Backup bindhosts config to /sdcard/Download/bindhosts_config.json
 * @returns {Promise<void>}
 */
async function exportConfig() {
    try {
        const config = {
            metadata: {
                version: "v1",
                description: "bindhosts config backup"
            }
        };

        // Fetch and process each file
        for (const [fileType, filePath] of Object.entries(filePaths)) {
            const response = await fetch(`link/PERSISTENT_DIR/${filePath}`);
            if (!response.ok) throw new Error(`Failed to fetch ${filePath}`);
            const text = await response.text();
            const lines = text.trim();
            config[fileType] = {
                path: filePath,
                content: lines
            };
        }

        // Output in json format
        const fileName = await exec(`
            FILENAME="/storage/emulated/0/Download/bindhosts_config_$(date +%Y%m%d_%H%M%S).json"
            cat <<'JSON_EOF' > "$FILENAME"
${JSON.stringify(config)}
JSON_EOF
            echo "$FILENAME"
        `);
        showPrompt("backup_restore.exported", true, undefined, undefined, fileName.trim());
    } catch (error) {
        console.error("Backup failed:", error);
        showPrompt("backup_restore.export_fail", false);
    }
}

/**
 * Restore config
 * Open file selector and restore config from selected file
 * @return {Promise<void>}
 */
async function restoreConfig() {
    try {
        const jsonConfig = await openFileSelector("json");
        const config = JSON.parse(jsonConfig);

        // Validate using metadata
        const isValid = config.metadata && config.metadata.description === "bindhosts config backup";
        if (!isValid) {
            showPrompt("backup_restore.invalid_config", false);
            return;
        }

        // Restore each file according to backup version
        if (config.metadata.version === "v1") {
            for (const [fileType, fileData] of Object.entries(config)) {
                if (!filePaths[fileType] || !fileData.content) continue;
                const content = fileData.content;
                await exec(`
                    cat <<'RESTORE_EOF' > ${basePath}/${fileData.path}
${content}
RESTORE_EOF
                    chmod 644 ${basePath}/${fileData.path}
                `);
            }
        }

        showPrompt("backup_restore.restored", true);
    } catch (error) {
        console.error("Restore failed:", error);
        showPrompt("backup_restore.restore_fail", false);
    }
}

/**
 * Attach event listeners to control panel items
 * @returns {void}
 */
function controlPanelEventlistener(event) {
    const controlPanel = {
        "language-container": openLanguageMenu,
        "tiles-container": installBindhostsApp,
        "update-toggle-container": toggleModuleUpdate,
        "action-redirect-container": toggleActionRedirectWebui,
        "cron-toggle-container": toggleCron,
        "github-issues": () => linkRedirect('https://github.com/bindhosts/bindhosts/issues/new'),
        "export": exportConfig,
        "restore": restoreConfig
    };

    Object.entries(controlPanel).forEach(([element, functionName]) => {
        const el = document.getElementById(element);
        if (el) {
            let touchMoved = false, isHandling = false;

            // Handler for end events
            const handleEndEvent = () => {
                if (isHandling) return;
                isHandling = true;
                if (!touchMoved) {
                    setTimeout(() => {
                        functionName(event);
                        isHandling = false;
                    }, 50);
                } else {
                    isHandling = false;
                }
                touchMoved = false;
            };

            // Touch event
            el.addEventListener('touchstart', () => touchMoved = false);
            el.addEventListener('touchmove', () => touchMoved = true);
            el.addEventListener('touchend', handleEndEvent);

            // Mouse event
            el.addEventListener('mousedown', () => touchMoved = false);
            el.addEventListener('mousemove', () => touchMoved = true);
            el.addEventListener('mouseup', handleEndEvent);
        }
    });
}

/**
 * Initial load event listener
 * @returns {void}
 */
document.addEventListener('DOMContentLoaded', async () => {
    initialTransition();
    checkMMRL();
    loadTranslations();
    checkUpdateStatus();
    checkBindhostsApp();
    checkMagisk();
    checkCronStatus();
    controlPanelEventlistener();
    applyRippleEffect();
});