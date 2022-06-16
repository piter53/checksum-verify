"use strict";

const CHECKSUM_VALUE_REGEX = /[a-f\d]{32,128}|[A-F\d]{32,128}/g;
const CHECKSUM_SIZE_ARRAY = [32, 40, 56, 64, 96, 128];
const CHECKSUM_ALG_REGEX = /(sha)-?(1|224|256|384|512)|(md)-?5|(sha3-)(224|256|384|512)/gi;
const DANGEROUS_EXTENSIONS = ["bin", "apk", "jar", "ahk", "bms", "oxe", "sk", "xbe",
    "workflow", "elf", "app", "out", "dmg", "exe", "bat", "com", "cmd", "inf",
    "ipa", "osx", "pif", "run", "msi", "pkg", "iso", "zip", "tar.xz", "tar.gz",
    "tar.bz2", "tar.bz", "tar", "rar", "deb", "rpm", "appimage", "flatpakref",
    "flatpak", "snap"];

let checksums = [];
let algorithms = [];
let urls = [];

function extractPattern(pattern) {
    let set = new Set();

    // Gather all HTML nodes; If a node contains a pattern, clean up and add all matching values to the set
    document.querySelectorAll('*').forEach((value) => {
        if (pattern.test(value.innerHTML)) {
            value.innerHTML.match(pattern).forEach((element) => {
                set.add(element.toLowerCase().replace('-', ''));
            });
        }
    });

    // Print all matching values on debug level
    console.debug(set.size + " matches for pattern: \"" + pattern + "\"");
    console.debug(Array.from(set.values()));
    return set;
}

/**
 * Filter hash values based on hasMix() result and validity of length.
 * @param values
 * @returns {Set<any>}
 */
function filterHashes(values) {
    /**
     * Checks whether a given hash value contains both digits and letters, and
     * if the variety of characters is high enough.
     * @param value
     * @returns {boolean}
     */
    function hasMix(value) {
        const minDiversity = 11;
        const letters = /[a-f]|[A-F]/;
        const digits = /\d/;
        let set = new Set();
        for (let char of value) {
            set.add(char);
        }
        return letters.test(value) && digits.test(value) && set.size >= minDiversity;
    }

    let set = new Set();
    values.forEach((value) => {
        if (CHECKSUM_SIZE_ARRAY.includes(value.length) && hasMix(value)) {
            set.add(value);
        }
    });
    return set;
}

/**
 * Return true if filename matches any of the dangerous file extensions.
 * @param filename
 * @returns {boolean}
 */
function isFileExtensionDangerous(filename) {
    return DANGEROUS_EXTENSIONS.some(value => filename.toLowerCase().endsWith(value.toLowerCase()));
}

/**
 * Extract download links from all "a" elements present in DOM. This is a
 * workaround to overcome limitations in chrome.downloads API which does not
 * provide data about tab from which the download has been initiated.
 * @returns {Set<any>}
 */
async function extractLinks() {
    let urls = new Set();
    let onlyVerifyDangerous = await chrome.storage.sync.get(["onlyVerifyDangerous"]);
    document.querySelectorAll("a").forEach((element) => {
        if (element.hasAttribute("href")) {
            let link = element.href;
            if (onlyVerifyDangerous.onlyVerifyDangerous === true) {
                if (isFileExtensionDangerous(link)) {
                    urls.add(link);
                }
            } else {
                urls.add(link);
            }
        }
    });
    console.debug("Urls found: \n");
    console.debug(Array.from(urls.values()));
    return urls;
}

/**
 * Top level function that extracts, filters and sends hash values along with algorithm names and links to the background script
 */
async function extractData() {
    checksums = filterHashes(extractPattern(CHECKSUM_VALUE_REGEX));
    algorithms = extractPattern(CHECKSUM_ALG_REGEX);
    urls = await extractLinks();
    let msgFailed = () => {
        console.debug("Failed to send message")
    }
    if (checksums.size !== 0 && algorithms.size !== 0) {
        chrome.runtime.sendMessage({
            type: "content",
            checksums: [...checksums],
            algorithms: [...algorithms],
            urls: [...urls]
        }).catch(() => msgFailed());
    } else {
        console.log("No checksum/algorithm pairs found!")
        chrome.runtime.sendMessage({
            type: "noContent",
            urls: [...urls]
        }).catch(() => msgFailed());
    }
    for (let i = 0; i < 120; i++) {
        const sleep = ms => new Promise(res => setTimeout(res, ms));
        await sleep(1000);
        chrome.runtime.sendMessage({type: "keepAlive"}).catch(() => msgFailed())
    }
}

extractData();

function displayBanner(){
    mainDiv.style.display = "block";
}

async function createStyle() {
    const style = document.createElement("style");
    let result = await fetch(chrome.runtime.getURL("bannerStyle.css"));
    let data = await result.text();
    style.textContent += data;
    console.log(data);
    return style
}

// Shadow root element that will be attached to the original document as shadow host
const shadowRoot = document.createElement("div");
const shadow = shadowRoot.attachShadow({mode: "closed"});

// const style = createStyle();


// Main container of the popup
const mainDiv = document.createElement("div");
mainDiv.id = "main-div";
mainDiv.style.display = "none";
mainDiv.style.position = "fixed";
// Assign max 32bit integer as a stacking index value to give it the highest priority
mainDiv.style.zIndex = "2147483647";
mainDiv.style.bottom = "0";
mainDiv.style.left = "0";
mainDiv.style.right = "0";
mainDiv.style.backgroundColor = "white";
mainDiv.style.height = "auto";
mainDiv.style.borderWidth = "2px";
let borderRadius = "10px";
mainDiv.style.borderTopLeftRadius = borderRadius;
mainDiv.style.borderTopRightRadius = borderRadius;
mainDiv.style.borderTop = "solid";
mainDiv.style.borderColor = "#0000ff";
mainDiv.style.padding = "5px";
mainDiv.style.float = "left";
// mainDiv.style.verticalAlign = "middle";
shadow.appendChild(mainDiv);

// Div holding logo and extension title
const logoDiv = document.createElement("div");
logoDiv.style.display = "inline-block";
logoDiv.style.width = "50px";
logoDiv.style.height = "50px";
logoDiv.style.padding = "5px";
logoDiv.style.marginRight = "20px";
logoDiv.style.bottom = "0";
logoDiv.style.left = "0";

// Logo
const logo = document.createElement("img");
logo.alt = "Checksum Verify logo";
logo.src = chrome.runtime.getURL("icons/logo.png");
let size = "40px";
logo.style.display = "block";
logo.style.marginLeft = "auto";
logo.style.marginRight = "auto";
logo.style.width = size;
logo.style.height = size;
logoDiv.appendChild(logo);

// Logo title
const logoText = document.createElement("p");
logoText.innerHTML = chrome.i18n.getMessage("extName").toUpperCase();
logoText.style.fontSize = "9px";
logoText.style.margin = "0px";
logoText.style.textAlign = "center";

// Div holding title and message
const textDiv = document.createElement("div");
logoDiv.appendChild(logoText);
textDiv.style.display = "inline-block";
mainDiv.style.bottom = "0";
mainDiv.style.left = "0";

// Popup title
const title = document.createElement("p");
title.innerHTML = "Sample title text";
title.style.fontSize = "20px";
title.style.margin = "5px";
title.style.marginBottom = "20px";
textDiv.appendChild(title);

// Popup message
const message = document.createElement("p");
message.innerHTML = "Sample message text";
message.style.fontSize = "15px";
message.style.margin = "5px";
textDiv.appendChild(message);

mainDiv.appendChild(logoDiv);
mainDiv.appendChild(textDiv);
try {
    document.body.appendChild(shadowRoot);
    console.debug("Appended shadow DOM to the document!");
    displayBanner();
} catch (e) {
    console.debug("Cannot append shadow DOM: " + e.toString());
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.debug("Message received:");
    console.debug(Array.from(request));
    let getMessage = chrome.i18n.getMessage;
    switch (request.type) {
        case "finished":
            title.innerHTML = getMessage("popupDownloadFinishedTitle");
            message.innerHTML = getMessage("popupDownloadFinishedMessage");
            displayBanner();
            break;
        case "finishedNoValues":
            title.innerHTML = getMessage("popupDownloadFinishedNoValuesTitle");
            message.innerHTML = getMessage("popupDownloadFinishedNoValuesMessage");
            displayBanner();
            break;
        case "checksumComputed":
            if (request.isValid) {
                title.innerHTML = getMessage("popupChecksumComputedValidTitle");
                message.innerHTML = getMessage("popupChecksumComputedValidMessage");
            } else {
                title.innerHTML = getMessage("popupChecksumComputedInvalidTitle");
                message.innerHTML = getMessage("popupChecksumComputedInvalidMessage");
            }
            displayBanner();
            break;
    }
    // https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
    sendResponse({});
    return true;
});
