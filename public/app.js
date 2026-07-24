let currentPasteId = null;
let currentIsEncrypted = false;

async function createPaste() {
    const content = document.getElementById("paste-content").value;
    const ttlValue = document.getElementById("ttl-select").value;
    const password = document.getElementById("paste-password").value;

    if (!content.trim()) {
        alert("Please enter some text!");
        return;
    }

    // "burn" is a special dropdown value: the paste never expires by TTL,
    // but the server deletes it the instant it's read once (see get_paste
    // in DatabaseManager). ttl_minutes is sent as -1 (never) in that case.
    const burnAfterReading = ttlValue === "burn";
    const ttlMinutes = burnAfterReading ? -1 : parseInt(ttlValue);

    // Zero-knowledge encryption: if a password was given, encrypt the
    // content locally in the browser. Only the ciphertext ever leaves
    // the client — the server and database never see the plaintext or
    // the password.
    const isEncrypted = password.length > 0;
    const payloadContent = isEncrypted
        ? CryptoJS.AES.encrypt(content, password).toString()
        : content;

    try {
        const response = await fetch("/api/paste", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: payloadContent,
                ttl_minutes: ttlMinutes,
                is_encrypted: isEncrypted,
                burn_after_reading: burnAfterReading
            })
        });

        const data = await response.json();

        if (response.ok) {
            const shareUrl = `${window.location.origin}/${data.id}`;
            document.getElementById("share-link").value = shareUrl;
            document.getElementById("create-result").classList.remove("hidden");
            document.getElementById("paste-password").value = "";
            showToast(shareUrl);
        } else {
            alert(data.error || "Failed to create paste");
        }
    } catch (err) {
        alert("Error connecting to server!");
    }
}

// Holds the raw paste payload (ciphertext or plaintext) between fetch and render,
// so we can re-render after a decrypt attempt without another network request.
let pendingPasteContent = null;

async function fetchPaste(pasteId) {
    try {
        // RESET BANNER AT START
        document.getElementById("burn-banner").classList.add("hidden");

        const response = await fetch(`/api/paste/${pasteId}`);
        const data = await response.json();

        if (response.ok) {
            currentPasteId = data.id;
            currentIsEncrypted = !!data.is_encrypted;
            const wasBurned = !!data.burn_after_reading;
            pendingPasteContent = data.content;

            const created = new Date(data.created_at * 1000).toLocaleString();
            document.getElementById("meta-created").textContent = `Created: ${created}`;

            if (wasBurned) {
                document.getElementById("meta-expires").textContent = "🔥 Burned after reading";
                document.getElementById("burn-banner").classList.remove("hidden");
                document.getElementById("delete-btn").classList.add("hidden");
            } else {
                const expires = data.expires_at === -1 ? "Never" : new Date(data.expires_at * 1000).toLocaleString();
                document.getElementById("meta-expires").textContent = `Expires: ${expires}`;
                document.getElementById("burn-banner").classList.add("hidden");
                document.getElementById("delete-btn").classList.remove("hidden");
            }

            // Hide Create section, show Read section
            document.getElementById("create-view").classList.add("hidden");
            document.getElementById("read-view").classList.remove("hidden");

            if (currentIsEncrypted) {
                document.getElementById("decrypt-box").classList.remove("hidden");
                document.getElementById("code-toolbar").classList.add("hidden");
                document.getElementById("paste-display-wrapper").classList.add("hidden");
                document.getElementById("delete-btn").classList.add("hidden");
            } else {
                renderPasteContent(data.content, wasBurned);
            }

            if (wasBurned) {
                document.getElementById("delete-btn").classList.add("hidden");
            }
        } else {
            alert(data.error || "Paste not found or has expired!");
            window.location.href = "/";
        }
    } catch (err) {
        alert("Error retrieving paste!");
        window.location.href = "/";
    }
}

function renderPasteContent(plaintext, wasBurned = false) {
    const codeElem = document.getElementById("paste-display");

    codeElem.textContent = plaintext;

    document.getElementById("decrypt-box").classList.add("hidden");
    document.getElementById("code-toolbar").classList.remove("hidden");
    document.getElementById("paste-display-wrapper").classList.remove("hidden");
    
    if (wasBurned) {
        document.getElementById("delete-btn").classList.add("hidden");
    } else {
        document.getElementById("delete-btn").classList.remove("hidden");
    }

    resetCopyButton();

    if (window.Prism) {
        Prism.highlightElement(codeElem);
    }
}

function attemptDecrypt() {
    const password = document.getElementById("decrypt-password").value;
    const errorEl = document.getElementById("decrypt-error");

    if (!password) {
        errorEl.textContent = "Please enter a password.";
        errorEl.classList.remove("hidden");
        return;
    }

    try {
        const bytes = CryptoJS.AES.decrypt(pendingPasteContent, password);
        const plaintext = bytes.toString(CryptoJS.enc.Utf8);

        // CryptoJS doesn't throw on a wrong password with this cipher mode —
        // it just yields empty/garbage bytes that fail UTF-8 decoding.
        // An empty result for non-empty ciphertext means the password was wrong.
        if (!plaintext) {
            throw new Error("decryption produced empty output");
        }

        errorEl.classList.add("hidden");
        renderPasteContent(plaintext);
    } catch (err) {
        errorEl.textContent = "Incorrect password!";
        errorEl.classList.remove("hidden");
    }
}

async function deletePaste() {
    if (!currentPasteId) return;

    if (!confirm("Are you sure you want to delete this paste?")) return;

    try {
        const response = await fetch(`/api/paste/${currentPasteId}`, { method: "DELETE" });
        const data = await response.json();

        if (response.ok) {
            alert("Paste deleted!");
            window.location.href = "/";
        } else {
            alert(data.error || "Failed to delete paste");
        }
    } catch (err) {
        alert("Error deleting paste!");
    }
}

function copyLink() {
    const copyText = document.getElementById("share-link");
    copyText.select();
    navigator.clipboard.writeText(copyText.value);
    alert("Copied link to clipboard!");
}

let toastDismissTimer = null;
let toastCopyResetTimer = null;

function showToast(shareUrl) {
    const toast = document.getElementById("toast");
    document.getElementById("toast-share-link").value = shareUrl;
    resetToastCopyButton();

    // Make it visible in the layout first, then flip the animation class
    // on the next frame so the slide-down transition actually plays.
    toast.classList.remove("hidden");
    requestAnimationFrame(() => {
        toast.classList.add("toast-visible");
    });

    clearTimeout(toastDismissTimer);
    toastDismissTimer = setTimeout(hideToast, 6000);
}

function hideToast() {
    const toast = document.getElementById("toast");
    clearTimeout(toastDismissTimer);
    toast.classList.remove("toast-visible");

    // Wait for the slide-up transition to finish before removing it from
    // the layout entirely.
    setTimeout(() => {
        if (!toast.classList.contains("toast-visible")) {
            toast.classList.add("hidden");
        }
    }, 450);
}

function copyToastLink() {
    const url = document.getElementById("toast-share-link").value;
    const btn = document.getElementById("toast-copy-btn");
    const btnText = document.getElementById("toast-copy-btn-text");

    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
        btnText.textContent = "Copied! ✓";

        clearTimeout(toastCopyResetTimer);
        toastCopyResetTimer = setTimeout(resetToastCopyButton, 2000);
    }).catch(() => {
        alert("Couldn't copy to clipboard. Your browser may be blocking clipboard access.");
    });
}

function resetToastCopyButton() {
    const btnText = document.getElementById("toast-copy-btn-text");
    if (!btnText) return;
    clearTimeout(toastCopyResetTimer);
    btnText.textContent = "Copy Link";
}

let copyResetTimer = null;

function copyPasteContent() {
    const codeElem = document.getElementById("paste-display");
    const btn = document.getElementById("copy-content-btn");
    const btnText = document.getElementById("copy-content-btn-text");
    const text = codeElem.textContent;

    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add("copied");
        btnText.textContent = "Copied! ✓";

        clearTimeout(copyResetTimer);
        copyResetTimer = setTimeout(resetCopyButton, 2000);
    }).catch(() => {
        alert("Couldn't copy to clipboard. Your browser may be blocking clipboard access.");
    });
}

function resetCopyButton() {
    const btn = document.getElementById("copy-content-btn");
    const btnText = document.getElementById("copy-content-btn-text");
    if (!btn || !btnText) return;

    clearTimeout(copyResetTimer);
    btn.classList.remove("copied");
    btnText.textContent = "Copy";
}

// Route handler on page load
window.addEventListener("load", () => {
    const path = window.location.pathname.substring(1);

    if (path && path !== "index.html") {
        fetchPaste(path);
    } else {
        document.getElementById("create-view").classList.remove("hidden");
        document.getElementById("read-view").classList.add("hidden");
    }
});