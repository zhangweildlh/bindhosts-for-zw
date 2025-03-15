import { translations } from './language.js';

export let developerOption = false;
export let learnMore = false;

export function setDeveloperOption(value) { developerOption = value; }
export function setLearnMore(value) { learnMore = value; }

export const basePath = "/data/adb/bindhosts";
const header = document.querySelector('.header');
const actionContainer = document.querySelector('.float');
const content = document.querySelector('.content');

// Execute shell commands
export async function execCommand(command) {
    return new Promise((resolve, reject) => {
        const callbackName = `exec_callback_${Date.now()}`;
        window[callbackName] = (errno, stdout, stderr) => {
            delete window[callbackName];
            if (errno === 0) {
                resolve(stdout);
            } else {
                console.error(`Error executing command: ${stderr}`);
                reject(stderr);
            }
        };
        try {
            ksu.exec(command, "{}", callbackName);
        } catch (error) {
            console.error(`Execution error: ${error}`);
            reject(error);
        }
    });
}

// Show toast with ksu
export function toast(message) {
    try {
        ksu.toast(message);
    } catch (error) {
        console.error("Failed to show toast:", error);
    }
}

// Function to redirect link on external browser
export async function linkRedirect(link) {
    try {
        await execCommand(`am start -a android.intent.action.VIEW -d ${link}`);
    } catch (error) {
        console.error('Error redirect link:', error);
    }
}

// Function to add material design style ripple effect
export function applyRippleEffect() {
    document.querySelectorAll('.ripple-element, .reboot').forEach(element => {
        if (element.dataset.rippleListener !== "true") {
            element.addEventListener("pointerdown", function (event) {
                if (isScrolling) return;
                const ripple = document.createElement("span");
                ripple.classList.add("ripple");

                // Calculate ripple size and position
                const rect = element.getBoundingClientRect();
                const width = rect.width;
                const size = Math.max(rect.width, rect.height);
                const x = event.clientX - rect.left - size / 2;
                const y = event.clientY - rect.top - size / 2;

                // Determine animation duration
                let duration = 0.2 + (width / 800) * 0.4;
                duration = Math.min(0.8, Math.max(0.2, duration));

                // Set ripple styles
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;
                ripple.style.animationDuration = `${duration}s`;
                ripple.style.transition = `opacity ${duration}s ease`;

                // Adaptive color
                const computedStyle = window.getComputedStyle(element);
                const bgColor = computedStyle.backgroundColor || "rgba(0, 0, 0, 0)";
                const textColor = computedStyle.color;
                const isDarkColor = (color) => {
                    const rgb = color.match(/\d+/g);
                    if (!rgb) return false;
                    const [r, g, b] = rgb.map(Number);
                    return (r * 0.299 + g * 0.587 + b * 0.114) < 96; // Luma formula
                };
                ripple.style.backgroundColor = isDarkColor(bgColor) ? "rgba(255, 255, 255, 0.2)" : "";

                // Append ripple and handle cleanup
                element.appendChild(ripple);
                const handlePointerUp = () => {
                    ripple.classList.add("end");
                    setTimeout(() => {
                        ripple.classList.remove("end");
                        ripple.remove();
                    }, duration * 1000);
                    element.removeEventListener("pointerup", handlePointerUp);
                    element.removeEventListener("pointercancel", handlePointerUp);
                };
                element.addEventListener("pointerup", handlePointerUp);
                element.addEventListener("pointercancel", handlePointerUp);
            });
            element.dataset.rippleListener = "true";
        }
    });
}

// Function to show the prompt with a success or error message
export function showPrompt(key, isSuccess = true, duration = 2000, preValue = "", postValue = "") {
    const prompt = document.getElementById('prompt');
    const message = key.split('.').reduce((acc, k) => acc && acc[k], translations) || key;
    const finalMessage = `${preValue} ${message} ${postValue}`.trim();
    prompt.textContent = finalMessage;
    prompt.classList.toggle('error', !isSuccess);

    if (window.promptTimeout) {
        clearTimeout(window.promptTimeout);
    }
    if (message.includes("Reboot to take effect")) {
        prompt.classList.add('reboot');
        applyRippleEffect();
        let countdownActive = false;
        prompt.onclick = () => {
            if (countdownActive) return;
            countdownActive = true;
            let countdown = 3;
            prompt.textContent = `Rebooting in ${countdown}...`;
            const countdownInterval = setInterval(() => {
                countdown--;
                if (countdown > 0) {
                    prompt.textContent = `Rebooting in ${countdown}...`;
                } else {
                    clearInterval(countdownInterval);
                    countdownActive = false;
                    execCommand("svc power reboot").catch(error => {
                        console.error("Failed to execute reboot command:", error);
                    });
                }
            }, 1000);
        };
    } else {
        prompt.classList.remove('reboot', 'ripple-element');
    }

    setTimeout(() => {
        if (typeof ksu !== 'undefined' && ksu.mmrl) {
            prompt.style.transform = 'translateY(calc((var(--window-inset-bottom) + 85px) * -1))';
        } else {
            prompt.style.transform = 'translateY(-85px)';
        }
        window.promptTimeout = setTimeout(() => {
            prompt.style.transform = 'translateY(100%)';
        }, duration);
    }, 100);
}

// Function to check if running in MMRL
export function checkMMRL() {
    if (typeof ksu !== 'undefined' && ksu.mmrl) {
        // Adjust inset
        if (actionContainer) actionContainer.style.bottom = 'calc(var(--window-inset-bottom) + 80px)';
        header.style.top = 'var(--window-inset-top)';
        content.style.height = 'calc(100vh - var(--window-inset-top) - var(--window-inset-bottom) - 135px)';
        content.style.top = 'calc(var(--window-inset-top) + 55px)';

        // Set status bars theme based on device theme
        try {
            $bindhosts.setLightStatusBars(!window.matchMedia('(prefers-color-scheme: dark)').matches)
        } catch (error) {
            console.log("Error setting status bars theme:", error)
        }

        // Request API permission
        try {
            $bindhosts.requestAdvancedKernelSUAPI();
        } catch (error) {
            console.log("Error requesting API:", error);
        }
    } else {
        console.log("Not running in MMRL environment.");
    }
}

// Scroll event
let lastScrollY = content.scrollTop;
let isScrolling = false;
let scrollTimeout;
const scrollThreshold = 25;
content.addEventListener('scroll', () => {
    isScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isScrolling = false;
    }, 200);
    if (content.scrollTop > lastScrollY && content.scrollTop > scrollThreshold) {
        if (actionContainer) actionContainer.style.transform = 'translateY(110px)';
    } else if (content.scrollTop < lastScrollY) {
        if (actionContainer) actionContainer.style.transform = 'translateY(0)';
    }

    // Hide remove button on scroll
    const box = document.querySelector('.box li');
    if (box) {
        document.querySelectorAll('.box li').forEach(li => {
            li.scrollTo({ left: 0, behavior: 'smooth' });
        });
    }

    lastScrollY = content.scrollTop;
});