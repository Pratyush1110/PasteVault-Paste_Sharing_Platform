let currentPasteId = null;
let currentIsEncrypted = false;

async function createPaste() {
    const content = document.getElementById("paste-content").value;
    const ttlMinutes = parseInt(document.getElementById("ttl-select").value);
    const password = document.getElementById("paste-password").value;

    if (!content.trim()) {
        alert("Please enter some text!");
        return;
    }

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
                is_encrypted: isEncrypted
            })
        });

        const data = await response.json();

        if (response.ok) {
            const shareUrl = `${window.location.origin}/${data.id}`;
            document.getElementById("share-link").value = shareUrl;
            document.getElementById("create-result").classList.remove("hidden");
            document.getElementById("paste-password").value = "";
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
        const response = await fetch(`/api/paste/${pasteId}`);
        const data = await response.json();

        if (response.ok) {
            currentPasteId = data.id;
            currentIsEncrypted = !!data.is_encrypted;
            pendingPasteContent = data.content;

            const created = new Date(data.created_at * 1000).toLocaleString();
            const expires = data.expires_at === -1 ? "Never" : new Date(data.expires_at * 1000).toLocaleString();
            document.getElementById("meta-created").textContent = `Created: ${created}`;
            document.getElementById("meta-expires").textContent = `Expires: ${expires}`;

            // Hide Create section, show Read section
            document.getElementById("create-view").classList.add("hidden");
            document.getElementById("read-view").classList.remove("hidden");

            if (currentIsEncrypted) {
                // Prompt for password; content is only rendered after a
                // successful local decryption in attemptDecrypt().
                document.getElementById("decrypt-box").classList.remove("hidden");
                document.getElementById("code-toolbar").classList.add("hidden");
                document.getElementById("paste-display-wrapper").classList.add("hidden");
                document.getElementById("delete-btn").classList.add("hidden");
            } else {
                renderPasteContent(data.content);
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

function renderPasteContent(plaintext) {
    const codeElem = document.getElementById("paste-display");

    // Set text content safely
    codeElem.textContent = plaintext;

    document.getElementById("decrypt-box").classList.add("hidden");
    document.getElementById("code-toolbar").classList.remove("hidden");
    document.getElementById("paste-display-wrapper").classList.remove("hidden");
    document.getElementById("delete-btn").classList.remove("hidden");
    resetCopyButton();

    // Trigger Prism Syntax Highlighting
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