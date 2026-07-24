let currentPasteId = null;

async function createPaste() {
    const content = document.getElementById("paste-content").value;
    const ttlMinutes = parseInt(document.getElementById("ttl-select").value);

    if (!content.trim()) {
        alert("Please enter some text!");
        return;
    }

    try {
        const response = await fetch("/api/paste", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content, ttl_minutes: ttlMinutes })
        });

        const data = await response.json();

        if (response.ok) {
            const shareUrl = `${window.location.origin}/#${data.id}`;
            document.getElementById("share-link").value = shareUrl;
            document.getElementById("create-result").classList.remove("hidden");
        } else {
            alert(data.error || "Failed to create paste");
        }
    } catch (err) {
        alert("Error connecting to server!");
    }
}

async function fetchPaste(idOverride = null) {
    const pasteId = idOverride || document.getElementById("lookup-id").value.trim();

    if (!pasteId) {
        alert("Enter a paste ID");
        return;
    }

    try {
        const response = await fetch(`/api/paste/${pasteId}`);
        const data = await response.json();

        if (response.ok) {
            currentPasteId = data.id;
            document.getElementById("paste-display").textContent = data.content;
            
            const created = new Date(data.created_at * 1000).toLocaleString();
            const expires = data.expires_at === -1 ? "Never" : new Date(data.expires_at * 1000).toLocaleString();

            document.getElementById("meta-created").textContent = `Created: ${created}`;
            document.getElementById("meta-expires").textContent = `Expires: ${expires}`;
            
            document.getElementById("view-result").classList.remove("hidden");
        } else {
            alert(data.error || "Paste not found!");
            document.getElementById("view-result").classList.add("hidden");
        }
    } catch (err) {
        alert("Error retrieving paste!");
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
            document.getElementById("view-result").classList.add("hidden");
            document.getElementById("lookup-id").value = "";
            currentPasteId = null;
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

// Auto-fetch if hash is present in URL (e.g. http://localhost:18080/#RCOtjlQ)
window.addEventListener("load", () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        document.getElementById("lookup-id").value = hash;
        fetchPaste(hash);
    }
});