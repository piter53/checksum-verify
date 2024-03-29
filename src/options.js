function save_options() {
    let onlyVerifyDangerous = document.getElementById('filetypes').checked;
    // let enableProgressiveHashing = document.getElementById('progressive-hashing').checked;
    chrome.storage.sync.set({
        "onlyVerifyDangerous": onlyVerifyDangerous,
        // "enableProgressiveHashing": enableProgressiveHashing
    }, () => {
        // Update status to let user know options were saved.
        let status = document.getElementById('status');
        status.style.color = "green";
        status.textContent = chrome.i18n.getMessage("prefSavedMsg");
        setTimeout(function() {
            status.textContent = '';
        }, 3000);
        console.debug("Preferences saved");
    });
}

/**
 * Restores select box and checkbox state using the preferences stored in chrome.storage.
 */
function restore_options() {
    chrome.storage.sync.get(["onlyVerifyDangerous"]
    , ({onlyVerifyDangerous}) => {
        document.getElementById('filetypes').checked = onlyVerifyDangerous;
    });
    // chrome.storage.sync.get(["enableProgressiveHashing"]
    //     , ({enableProgressiveHashing}) => {
    //     document.getElementById("progressive-hashing").checked = enableProgressiveHashing;
    // });
    console.debug("Preferences restored");
}

document.getElementById("pref-header").innerHTML = chrome.i18n.getMessage("prefMainSectionTitle");
document.getElementById("verif-header").innerHTML = chrome.i18n.getMessage("prefVerifSectionTitle");
document.getElementById("filetypes-checkbox-text").innerHTML = chrome.i18n.getMessage("prefVerifCheckboxText");
document.getElementById("progressive-hashing-text").innerHTML = chrome.i18n.getMessage("prefParallelHashCheckboxText");
document.getElementById("progressive-hashing").disabled = true;
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
