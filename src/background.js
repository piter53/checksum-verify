'use strict';

import * as crypto from "crypto-js"

const hash = crypto.algo.SHA256.create();

/**
 * Greet the user upon install/update
 */
chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.create({'url': 'welcome-page.html'});
    console.debug("Inside welcome page");
});

/**
 * Collect data about ongoing downloads.
 * @type {{}}
 */
let downloads = {};

/**
 * Listen for a started download.
 */
chrome.downloads.onCreated.addListener((downloadItem) => {
    console.log("Download started!");
});

/**
 * Listen for a change in download.
 */
chrome.downloads.onChanged.addListener((downloadDelta) => {
    console.debug("Download changed!");
    console.debug(downloadDelta);
    // testFetch();
    if (downloadDelta.filename) {
        const filename = downloadDelta.filename.current;
        if (filename !== "") {
            downloads[downloadDelta.id] = {
                filename: "file://" + filename
            };
        }
    } else if (downloadDelta.state) {
        let state = downloadDelta.state.current;
        if (state === "complete") {
            let id = downloadDelta.id;
            let hash = computeHash(downloads[id].filename);
            downloads[id] = {
                hash: hash
            }
        } else if (state === "interrupted") {
            delete downloads[downloadDelta.id];
        }
    }
})

/**
 * Fetch the file given filename, and compute a checksum from the acquired stream.
 * @param filename
 * @returns Hash of the file
 */
function computeHash(filename) {
    console.debug("Inside computeHash");
    let hashValue;
    fetch(filename)
        .then(response => {
            if (response.ok) {
                const reader = response.body.getReader();
                let totalByteLen = 0;
                const read = () => {
                    reader.read().then(({done, value}) => {
                        if (done) {
                            let start = performance.now();
                            hashValue = hash.finalize().toString();
                            let total = (performance.now() - start) / 1000;
                            console.log("Hash for file: " + filename + " took "
                                + total + "seconds to compute. The value is:\n" + hashValue);
                            console.debug("Total size (bytes): " + totalByteLen);
                            reader.releaseLock();
                        } else {
                            console.debug("New chunk length: " + value.byteLength);
                            totalByteLen += value.byteLength;
                            hash.update(crypto.lib.WordArray.create(value));
                            read();
                        }
                    }).catch(reason => {
                        console.debug(reason);
                    });
                }
                read();
            } else {
                console.debug("Response status: " + response.status);
            }
        }).catch((reason) => {
        console.debug(reason);
    });
    return hashValue;
}
