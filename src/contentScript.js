'use strict';
const CHECKSUM_VALUE_REGEX = /[a-f\d]{32,128}|[A-F\d]{32,128}/g;
const CHECKSUM_SIZE_ARRAY = [32, 40, 56, 64, 96, 128];
const CHECKSUM_ALG_REGEX = /(sha)-?(1|224|256|2|384|3|512|5)|(md)-?5/gi;
const DANGEROUS_EXTENSIONS = ["dmg", "exe", "msi", "pkg", "iso", "zip", "tar.xz"
    , "tar.gz", "tar.bz2", "tar", "deb", "rpm", "appimage"];

let checksums = [];
let algorithms = [];

function extractPattern(pattern) {
    let set = new Set();

    // Gather all HTML nodes; If a node contains a pattern, clean up and add all matching values to the set
    document.querySelectorAll('*').forEach((value) => {
        if (pattern.test(value.innerHTML)){
            value.innerHTML.match(pattern).forEach((element) => {
                set.add(element.toLowerCase().replace('-',''));
            });
        }
    });

    // Print all matching values on debug level
    console.debug("Matches for pattern: \"" + pattern + "\"");
    let iterator = set.values();
    let result = iterator.next();
    while (!result.done) {
        console.debug(result.value);
        result = iterator.next();
    }
    return set;
}

/**
 * Filter hash values based on hasMix() result and validity of length
 * @param values
 * @returns {Set<any>}
 */
function filterHashes(values) {
    /**
     * Checks whether a given hash value contains both digits and letters, and if the variety of characters is high enough.
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
 * Top level function extracting and filtering hash values and algorithm names
 */
function extractData() {
    checksums = filterHashes(extractPattern(CHECKSUM_VALUE_REGEX));

    algorithms = extractPattern(CHECKSUM_ALG_REGEX);
}

extractData();

// Communicate with background file by sending a message
// chrome.runtime.sendMessage(
//   {
//     type: 'GREETINGS',
//     payload: {
//       message: 'Hello, my name is Con. I am from ContentScript.',
//     },
//   },
//   response => {
//     console.log(response.message);
//   }
// );

// Listen for message
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.type === 'COUNT') {
//     console.log(`Current count is ${request.payload.count}`);
//   }
//
//   // Send an empty response
//   // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
//   sendResponse({});
//   return true;
// });
