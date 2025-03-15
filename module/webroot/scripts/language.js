import { setupDocsMenu } from './docs.js';
import { execCommand, basePath } from './util.js';

const languageMenu = document.querySelector('.language-menu');

export let translations = {};
let availableLanguages = ['en-US'];

// Function to check for available language
export async function initializeAvailableLanguages() {
    try {
        const response = await fetch('locales/available-lang.json');
        const config = await response.json();
        availableLanguages = config.languages;
        generateLanguageMenu();
    } catch (error) {
        console.error('Failed to fetch available languages:', error);
        availableLanguages = ['en-US'];
    }
}

// Function to detect user's default language
export async function detectUserLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    const langCode = userLang.split('-')[0];

    // Fetch preferred language
    let prefered_language_code = 'default';
    try {
        const response = await fetch('locales/prefered_language.txt');
        if (response.ok) {
            prefered_language_code = (await response.text()).trim();
        }
    } catch (error) {
        console.error("Error fetching preferred language:", error);
    }

    // Check if preferred language is valid
    if (prefered_language_code !== 'default' && availableLanguages.includes(prefered_language_code)) {
        return prefered_language_code;
    } else if (availableLanguages.includes(userLang)) {
        return userLang;
    } else if (availableLanguages.includes(langCode)) {
        return langCode;
    } else {
        return 'en-US';
    }
}

// Load translations dynamically based on the selected language
export async function loadTranslations(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        translations = await response.json();
        setupDocsMenu(lang);
        applyTranslations();
    } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
        if (lang !== 'en-US') {
            console.log("Falling back to English.");
            loadTranslations('en-US');
        }
    }
}

// Function to apply translations to all elements with data-i18n attributes
function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const keyString = el.getAttribute("data-i18n");
        const translation = keyString.split('.').reduce((acc, key) => acc && acc[key], translations);
        if (translation) {
            if (el.hasAttribute("placeholder")) {
                el.setAttribute("placeholder", translation);
            } else {
                const existingHTML = el.innerHTML;
                const splitHTML = existingHTML.split(/<br>/);
                if (splitHTML.length > 1) {
                    el.innerHTML = `${translation}<br>${splitHTML.slice(1).join('<br>')}`;
                } else {
                    el.textContent = translation;
                }
            }
        }
    });
}

// Function to generate the language menu dynamically
async function generateLanguageMenu() {
    if (!languageMenu) return;
    languageMenu.innerHTML = '';
    
    // Add System Default option
    const defaultButton = document.createElement('button');
    defaultButton.classList.add('language-option', 'ripple-element');
    defaultButton.setAttribute('data-lang', 'default');
    defaultButton.textContent = 'System Default';
    languageMenu.appendChild(defaultButton);

    const languagePromises = availableLanguages.map(async (lang) => {
        try {
            const response = await fetch(`locales/${lang}.json`);
            const data = await response.json();
            return { lang, name: data.language || lang };
        } catch (error) {
            console.error(`Error fetching language name for ${lang}:`, error);
            return { lang, name: lang };
        }
    });
    const languageData = await Promise.all(languagePromises);
    const sortedLanguages = languageData.sort((a, b) => a.name.localeCompare(b.name));
    sortedLanguages.forEach(({ lang, name }) => {
        const button = document.createElement('button');
        button.classList.add('language-option', 'ripple-element');
        button.setAttribute('data-lang', lang);
        button.textContent = name;
        if (languageMenu) {
            languageMenu.appendChild(button);
        }
    });
}

/**
 * Add memory to the language menu
 * Restore user language if default language is selected
 */
if (languageMenu) {
    languageMenu.addEventListener("click", (e) => {
        if (e.target.classList.contains("language-option")) {
            const lang = e.target.getAttribute("data-lang");
            if (lang !== 'default') loadTranslations(lang);
            try {
                execCommand(`
                    echo "${lang}" > ${basePath}/prefered_language.txt
                    [ -L /data/adb/modules/bindhosts/webroot/locales/prefered_language.txt ] || ln -s ${basePath}/prefered_language.txt /data/adb/modules/bindhosts/webroot/locales/prefered_language.txt
                `);
                if (lang === 'default') {
                    detectUserLanguage().then((detectedLang) => {
                        loadTranslations(detectedLang);
                    });
                }
            } catch (error) {
                console.error("Error setting default language:", error);
            }
            const languageOverlay = document.getElementById('language-overlay');
            languageOverlay.style.opacity = "0";
            setTimeout(() => {
                languageOverlay.style.display = "none";
            }, 200);
            document.body.style.overflow = "";
            activeOverlay = null;
        }
    });
}
