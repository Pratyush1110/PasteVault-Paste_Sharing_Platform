#include "handlers/PasteHandler.hpp"
#include <random>
#include <ctime>

PasteHandler::PasteHandler(DatabaseManager& db) : db_(db) {}

std::string PasteHandler::generate_random_id(size_t length) {
    const std::string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    std::random_device rd;
    std::mt19937 generator(rd());
    std::uniform_int_distribution<> dist(0, chars.size() - 1);

    std::string result;
    for (size_t i = 0; i < length; ++i) {
        result += chars[dist(generator)];
    }
    return result;
}

long long PasteHandler::calculate_expiration(int ttl_minutes) {
    if (ttl_minutes <= 0) return -1; // Never expires
    return std::time(nullptr) + (ttl_minutes * 60);
}

crow::response PasteHandler::create_paste(const crow::request& req) {
    auto body = crow::json::load(req.body);
    if (!body) {
        return crow::response(400, crow::json::wvalue({{"error", "Invalid JSON body"}}));
    }

    if (!body.has("content")) {
        return crow::response(400, crow::json::wvalue({{"error", "Field 'content' is required"}}));
    }

    std::string content = body["content"].s();
    int ttl_minutes = body.has("ttl_minutes") ? body["ttl_minutes"].i() : -1;

    // Client already encrypted `content` locally with CryptoJS if a password
    // was set; the server just stores whatever ciphertext/plaintext it's
    // given plus a flag so the frontend knows to prompt for a password later.
    // The server never sees the password itself.
    bool is_encrypted = body.has("is_encrypted") ? body["is_encrypted"].b() : false;

    // Burn-after-reading: the paste is deleted from SQLite the instant it's
    // read once, regardless of its TTL. See DatabaseManager::get_paste.
    bool burn_after_reading = body.has("burn_after_reading") ? body["burn_after_reading"].b() : false;

    std::string paste_id = generate_random_id();
    long long now = std::time(nullptr);
    long long expires_at = calculate_expiration(ttl_minutes);

    Paste paste{paste_id, content, is_encrypted, burn_after_reading, now, expires_at};

    if (!db_.save_paste(paste)) {
        return crow::response(500, crow::json::wvalue({{"error", "Failed to persist paste to database"}}));
    }

    crow::json::wvalue res;
    res["id"] = paste_id;
    res["is_encrypted"] = is_encrypted;
    res["burn_after_reading"] = burn_after_reading;
    res["created_at"] = now;
    res["expires_at"] = expires_at;
    
    return crow::response(201, res);
}

crow::response PasteHandler::get_paste(const std::string& id) {
    auto paste_opt = db_.get_paste(id);
    if (!paste_opt.has_value()) {
        return crow::response(404, crow::json::wvalue({{"error", "Paste not found or has expired"}}));
    }

    const auto& paste = paste_opt.value();
    crow::json::wvalue res;
    res["id"] = paste.id;
    res["content"] = paste.content; // ciphertext if is_encrypted is true; server never decrypts
    res["is_encrypted"] = paste.is_encrypted;
    res["burn_after_reading"] = paste.burn_after_reading; // true means this response is the only one ever served — it's already deleted
    res["created_at"] = paste.created_at;
    res["expires_at"] = paste.expires_at;

    return crow::response(200, res);
}

crow::response PasteHandler::delete_paste(const std::string& id) {
    if (!db_.delete_paste(id)) {
        return crow::response(404, crow::json::wvalue({{"error", "Paste not found"}}));
    }

    crow::json::wvalue res;
    res["message"] = "Paste deleted successfully";
    return crow::response(200, res);
}