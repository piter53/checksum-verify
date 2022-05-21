'use strict';

const HashThrough = require('hash-through');
const crypto = require('crypto');
const hashThrough = HashThrough(createHash);
const digestType = 'hex';
const algType = 'sha256';

/**
 * Auxiliary function required by hash-through
 * @returns {Hash}
 */
function createHash(){
    return crypto.createHash(algType);
}

/**
 * Greet the user upon install/update
 */
chrome.runtime.onInstalled.addListener(() => {
    chrome.tabs.create({'url': 'html/welcome-page.html'});
});

let downloads = {};

chrome.downloads.onCreated.addListener((downloadItem) => {
    console.debug(downloadItem);
    // downloads[downloadItem.id].filename = "file://" + downloadItem.filename;
    const response = fetch(downloadItem.filename);
    response.body.pipe(hashThrough);
    // req.responseType = 'arraybuffer';
    // req.open('GET', downloads[downloadItem.id].filename, true);
    // req.addEventListener('progress', processFile)
})

hashThrough.on('finish', () => {
    console.log("HashThrough digest at time: " + performance.now() / 1000 + "\n" + hashThrough.digest(digestType));
});
