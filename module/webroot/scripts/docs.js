import { linkRedirect, applyRippleEffect, toast, developerOption, learnMore } from './util.js';

// Function to fetch documents
function getDocuments(link, fallbackLink, element) {
    fetch(link)
        .then(response => {
            if (!response.ok) {
                return fetch(fallbackLink).then(fallbackResponse => {
                    if (!fallbackResponse.ok) {
                        throw new Error(`Fallback link failed with status ${fallbackResponse.status}`);
                    }
                    return fallbackResponse.text();
                });
            }
            return response.text();
        })
        .then(data => {
            window.linkRedirect = linkRedirect;
            marked.setOptions({
                sanitize: true,
                walkTokens(token) {
                    if (token.type === 'link') {
                        const href = token.href;
                        const text = token.text;
                        if (text === href) {
                            token.type = "html";
                            token.text = `<span><p class="ripple-element" id="copy-link">${text}</p></span>`;
                        } else {
                            token.href = "javascript:void(0);";
                            token.type = "html";
                            token.text = `<a href="javascript:void(0);" onclick="linkRedirect('${href}')">${text}</a>`;
                        }
                    }
                }
            });
            // For overlay content
            const docsContent = document.getElementById(element);
            docsContent.innerHTML = marked.parse(data);

            // For about content
            const aboutContent = document.getElementById('about-content');
            if (aboutContent) {
                aboutContent.innerHTML = marked.parse(data);
            }
            addCopyToClipboardListeners();
            applyRippleEffect();
        })
        .catch(error => {
            console.error('Error fetching documents:', error);
            document.getElementById(element).textContent = 'Failed to load content: ' + error.message;
        });
}

// Make link tap to copy
function addCopyToClipboardListeners() {
    const sourceLinks = document.querySelectorAll("#copy-link");
    sourceLinks.forEach((element) => {
        element.addEventListener("click", function () {
            navigator.clipboard.writeText(element.innerText).then(() => {
                toast("Text copied to clipboard: " + element.innerText);
            }).catch(err => {
                console.error("Failed to copy text: ", err);
            });
        });
    });
}

// Setup documents menu
let activeDocs = null;
let docsButtonListeners = [];
export async function setupDocsMenu(docsLang) {
    docsButtonListeners.forEach(({ button, listener }) => {
        button.removeEventListener("click", listener);
    });
    docsButtonListeners = [];
    const originalDocsLang = `_${docsLang}`;
    const docsData = {
        source: {
            link: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/sources${originalDocsLang}.md`,
            fallbackLink: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/sources.md`,
            element: 'source-content',
        },
        translate: {
            link: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/localize${originalDocsLang}.md`,
            fallbackLink: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/localize.md`,
            element: 'translate-content',
        },
        modes: {
            link: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/modes${originalDocsLang}.md`,
            fallbackLink: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/modes.md`,
            element: 'modes-content',
        },
        usage: {
            link: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/usage${originalDocsLang}.md`,
            fallbackLink: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/usage.md`,
            element: 'usage-content',
        },
        faq: {
            link: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/faq${originalDocsLang}.md`,
            fallbackLink: `https://raw.githubusercontent.com/bindhosts/bindhosts/master/Documentation/faq.md`,
            element: 'faq-content',
        },
    };

    // For document overlay
    const docsButtons = document.querySelectorAll(".docs-btn");
    const docsOverlay = document.querySelectorAll(".docs");

    docsButtons.forEach(button => {
        const listener = () => {
            const type = button.dataset.type;
            const overlay = document.getElementById(`${type}-docs`);
            if (type === 'modes' && developerOption && !learnMore) return;
            openOverlay(overlay);
            const { link, fallbackLink, element } = docsData[type] || {};
            getDocuments(link, fallbackLink, element);
        };
        button.addEventListener("click", listener);
        docsButtonListeners.push({ button, listener });
    });

    docsOverlay.forEach(overlay => {
        const closeButton = overlay.querySelector(".close-docs-btn");
        if (closeButton) {
            closeButton.addEventListener("click", () => closeOverlay(overlay));
        }
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                closeOverlay(overlay);
            }
        });
    });

    // For about content
    const aboutContent = document.getElementById('about-content');
    const documentCover = document.querySelector('.document-cover');
    if (aboutContent) {
        const header = document.getElementById('title');
        const originalHeader = header.textContent;
        const backButton = document.querySelector('.back-button');

        let startX = 0, currentX = 0, isDragging = false;

        // Start recognizing hold
        aboutContent.addEventListener('pointerdown', (e) => {
            isDragging = true;
            startX = e.clientX;
            aboutContent.style.transition = 'none';
            documentCover.style.transition = 'none';
            e.stopPropagation();
        });

        // Dragging
        aboutContent.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            currentX = e.clientX - startX;
            if (currentX < 0) return;
            aboutContent.style.transform = `translateX(${Math.max(currentX, -window.innerWidth)}px)`;
            // Calculate opacity based on position
            const opacity = 1 - (currentX / window.innerWidth);
            documentCover.style.opacity = Math.max(0, Math.min(1, opacity));
            e.stopPropagation();
        });

        // Release, close about docs if dragged more than 40% of the screen
        const handlePointerUp = () => {
            if (!isDragging) return;
            isDragging = false;
            aboutContent.style.transition = 'transform 0.2s ease';
            documentCover.style.transition = 'opacity 0.2s ease';

            const threshold = window.innerWidth * 0.2;
            if (Math.abs(currentX) > threshold) {
                backButton.click();
            } else {
                aboutContent.style.transform = 'translateX(0)';
                documentCover.style.opacity = '1';
            }
            startX = 0;
            currentX = 0;
        };

        aboutContent.addEventListener('pointerup', handlePointerUp);

        // Attach click event to all about docs buttons
        document.querySelectorAll('.about-docs').forEach(element => {
            element.addEventListener('click', () => {
                aboutContent.innerHTML = '';
                const { link, fallbackLink } = docsData[element.dataset.type] || {};
                getDocuments(link, fallbackLink, 'about-content');
                aboutContent.style.transform = 'translateX(0)';
                documentCover.style.opacity = '1';
                header.style.marginLeft = '31px';
                backButton.style.transform = 'translateX(0)';
                header.textContent = element.querySelector('.document-title').textContent;
            });

            // Alternative way to close about docs with back button
            backButton.addEventListener('click', () => {
                aboutContent.style.transform = 'translateX(100%)';
                documentCover.style.opacity = '0';
                backButton.style.transform = 'translateX(-100%)';
                header.style.marginLeft = '0';
                header.textContent = originalHeader;
            });
        });
    } // End of about docs
}

function openOverlay(overlay) {
    if (activeDocs) closeOverlay(activeDocs);
    activeDocs = overlay;
    document.body.style.overflow = "hidden";
    overlay.style.display = "flex";
    setTimeout(() => {
        overlay.style.opacity = "1";
    }, 10);
}

function closeOverlay(overlay) {
    activeDocs = null;
    document.body.style.overflow = "";
    overlay.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = "none";
    }, 200);
}
