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
            // Clean URL path (e.g. http://localhost:18080/RCOtjlQ)
            const shareUrl = `${window.location.origin}/${data.id}`;
            document.getElementById("share-link").value = shareUrl;
            document.getElementById("create-result").classList.remove("hidden");
        } else {
            alert(data.error || "Failed to create paste");
        }
    } catch (err) {
        alert("Error connecting to server!");
    }
}

async function fetchPaste(pasteId) {
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
            
            // Hide Create section, show Read section
            document.getElementById("create-view").classList.add("hidden");
            document.getElementById("read-view").classList.remove("hidden");
        } else {
            alert(data.error || "Paste not found or has expired!");
            window.location.href = "/";
        }
    } catch (err) {
        alert("Error retrieving paste!");
        window.location.href = "/";
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

// Route handler on page load
window.addEventListener("load", () => {
    // Extract pathname ID (e.g. "/RCOtjlQ" -> "RCOtjlQ")
    const path = window.location.pathname.substring(1);

    if (path && path !== "index.html") {
        fetchPaste(path);
    } else {
        // Show Create view on "/"
        document.getElementById("create-view").classList.remove("hidden");
        document.getElementById("read-view").classList.add("hidden");
    }
});