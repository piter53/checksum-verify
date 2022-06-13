"use strict";

const CHECKSUM_VALUE_REGEX = /[a-f\d]{32,128}|[A-F\d]{32,128}/g;
const CHECKSUM_SIZE_ARRAY = [32, 40, 56, 64, 96, 128];
const CHECKSUM_ALG_REGEX = /(sha)-?(1|224|256|384|512)|(md)-?5|(sha3-)(224|256|384|512)/gi;
const DANGEROUS_EXTENSIONS = ["apk", "jar", "ahk", "bms", "oxe", "sk", "xbe",
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
