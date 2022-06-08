"use strict";

const CHECKSUM_VALUE_REGEX = /[a-f\d]{32,128}|[A-F\d]{32,128}/g;
const CHECKSUM_SIZE_ARRAY = [32, 40, 56, 64, 96, 128];
const CHECKSUM_ALG_REGEX = /(sha)-?(1|224|256|384|512)|(md)-?5|(sha3-)(224|256|384|512)/gi;
const DANGEROUS_EXTENSIONS = ["dmg", "exe", "msi", "pkg", "iso", "zip", "tar.xz"
    , "tar.gz", "tar.bz2", "tar", "deb", "rpm", "appimage"];

//TODO variable should be set from within settings/options page
// chrome.storage.sync.set({onlyMatchDangerous: false}, () => {
//     console.log("value set");
// });

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
    // let iterator = set.values();
    // let result = iterator.next();
    // while (!result.done) {
    //     console.debug(result.value);
    //     result = iterator.next();
    // }
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
    DANGEROUS_EXTENSIONS.forEach((value) => {
        if (filename.toLowerCase().endsWith(value.toLowerCase())) {
            return true;
        }
    });
    return false;
}

/**
 * Extract download links from all "a" elements present in DOM. This is a
 * workaround to overcome limitations in chrome.downloads API which does not
 * provide data about tab from which the download has been initiated.
 * @returns {Set<any>}
 */
function extractLinks() {
    let urls = new Set();
    let extractAll = true;
    // chrome.storage.sync.get(onlyMatchDangerous, ({onlyMatchDangerous}) => {
    //     console.log("value received: " + onlyMatchDangerous);
    //     extractAll = onlyMatchDangerous;
    // });
    document.querySelectorAll("a").forEach((element) => {
        if (element.hasAttribute("href")) {
            let link = element.href;
            if (!extractAll) {
                if (isFileExtensionDangerous(link)) {
                    urls.add(link);
                }
            } else {
                urls.add(link);
            }
        }
    });
    return urls;
}

/**
 * Top level function that extracts, filters and sends hash values along with algorithm names and links to the background script
 */
async function extractData() {
    checksums = filterHashes(extractPattern(CHECKSUM_VALUE_REGEX));
    algorithms = extractPattern(CHECKSUM_ALG_REGEX);
    urls = extractLinks();
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
