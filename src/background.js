'use strict';

// TODO optimise imports so that they only include hashing libraries
import * as cryptoJs from "crypto-js";

// Keep data extracted from tabs by content script
let tabsData = [];
// Keep data about ongoing downloads
let downloads = {};

// Remove all previous alarms when a new process is started
chrome.alarms.clearAll();

/**
 * Greet the user upon install/update
 */
chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.create({'url': 'welcome-page.html'});
});

/**
 * Listen for a started download.
 */
chrome.downloads.onCreated.addListener((downloadItem) => {
    console.debug("Download started!");
    for (let tab of tabsData) {
        if (tab.urls.includes(downloadItem.url) || tab.urls.includes(downloadItem.finalUrl)) {
            downloads[downloadItem.id] = {
                tab: tab,
                url: downloadItem.url,
                checksums: tab.checksums,
                algorithms: tab.algorithms
            }
            keepAlive();
            break;
        }
    }
});

/**
 * Listen for a change in download.
 */
chrome.downloads.onChanged.addListener(async (downloadDelta) => {
    console.debug("Download changed!");
    console.debug(downloadDelta);
    if (downloads[downloadDelta.id] === undefined) {
        downloads[downloadDelta.id] = {};
    }
    if (downloadDelta.filename) {
        const filename = downloadDelta.filename.current;
        if (filename !== "") {
            downloads[downloadDelta.id].filename = "file://" + filename;
        }
    } else if (downloadDelta.state) {
        let state = downloadDelta.state.current;
        if (state === "complete") {
            let id = downloadDelta.id;
            downloads[id].state = "complete";
            if (downloads[id].checksums === undefined ||
                downloads[id].algorithms === undefined) {
                console.log("Cannot verify the hash value!")
            } else {
                let computedHashes = await computeHashes(downloads[id].filename,
                    getHashesFromNames(downloads[id].tab.algorithms));
                downloads[id].computedHashes = computedHashes;
                if (downloads[id].checksums.filter(value => computedHashes.includes(value))) {
                    console.log("The checksum is valid!");
                } else {
                    console.log("The checksum is NOT valid!");
                }
            }
        } else if (state === "interrupted") {
            delete downloads[downloadDelta.id];
            console.log("Download interrupted!");
        }
    }
});

/**
 * Wrapper function around getHashFromName() that supplies hash objects out of multiple names
 * @param names
 * @returns {Set<any>}
 */
function getHashesFromNames(names) {
    let set = new Set();
    names.forEach((elem) => {
        set.add(getHashFromName(elem));
    })
    return set;
}

/**
 * Get a hash object from crypto library based on a string representation
 * @param name
 * @returns {Hasher}
 */
function getHashFromName(name) {
    let algorithms = cryptoJs.algo;
    switch (name) {
        case "sha1":
            return algorithms.SHA1.create();
        case "sha224":
            return algorithms.SHA224.create();
        case "sha256":
            return algorithms.SHA256.create();
        case "sha384":
            return algorithms.SHA384.create();
        case "sha512":
            return algorithms.SHA512.create();
        case "md5":
            return algorithms.MD5.create();
        case "sha3224":
            return algorithms.SHA3.create({outputLength: 224});
        case "sha3256":
            return algorithms.SHA3.create({outputLength: 256});
        case "sha3384":
            return algorithms.SHA3.create({outputLength: 384});
        case "sha3512":
            return algorithms.SHA3.create({outputLength: 512});
    }
}

/**
 * Fetch the file given filename and compute checksums from the acquired stream,
 * based on passed hash objects
 * @param filename
 * @param hashes array of hash objects
 * @returns array of the file hash values
 */
async function computeHashes(filename, hashes) {
    console.debug("Inside computeHashes");
    const response = await fetch(filename);
    const reader = response.body.getReader();
    let totalByteLen = 0;
    const hashValuesMap = new Map();

    const read = async () => {
        const {done, value} = await reader.read();

        try {
            if (done) {
                hashes.forEach((hash) => {
                    hashValuesMap.set(hash, hash.finalize().toString().toLowerCase());
                });
                console.log(
                    "Computed hashes for file: " + filename + " :\n"
                );
                console.log(Array.from(hashValuesMap.values()));
                console.debug("Total size (bytes): " + totalByteLen);
                reader.releaseLock();
            } else {
                // console.debug("New chunk of length: " + value.byteLength);
                totalByteLen += value.byteLength;
                hashes.forEach((hash) => {
                    hash.update(cryptoJs.lib.WordArray.create(value));
                });
                await read();
            }
        } catch (e) {
            console.debug(e);
        }
    };

    try {
        if (!response.ok) {
            throw new Error(response.status);
        }
        await read();
        return Array.from(hashValuesMap.values());
    } catch (e) {
        console.error(e);
    }
}

/**
 * Listen for messages coming from content filter and unpack any relevant data
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "content":
            tabsData.unshift({
                urls: message.urls,
                checksums: message.checksums,
                algorithms: message.algorithms
            });
            break;
        case "noContent":
            tabsData.unshift({
                urls: message.urls
            })
            break;
        case "keepAlive":
            break;
    }
    // https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
    sendResponse({});
    return true;
});

/**
 * Verify if URL file access is allowed. If not display instructions in a new tab.
 */
chrome.extension.isAllowedFileSchemeAccess(function (isAllowed) {
    if (!isAllowed) {
        chrome.tabs.create({url: "settings/" + chrome.i18n.getMessage("lang") + "/instructions.html"})
    }
});

/**
 * Schedule next alarm
 */
function keepAlive() {
    console.debug("Background request to keep alive");
    chrome.alarms.create("keepAlive", {when: Date.now() + 1000});
}

/**
 * Keep background script alive if there is at least one ongoing download
 */
chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case "keepAlive":
            for (let i = 0; i < downloads.size; i++) {
                if (downloads[i].state !== "complete") {
                    keepAlive();
                    break;
                }
            }
            break;
    }
});
