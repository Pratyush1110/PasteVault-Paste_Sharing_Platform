#include "database/DatabaseManager.hpp"
#include <iostream>
#include <ctime>

DatabaseManager::DatabaseManager(const std::string& db_path) 
    : db_(nullptr), db_path_(db_path) {}

DatabaseManager::~DatabaseManager() {
    if (db_) {
        sqlite3_close(db_);
    }
}

bool DatabaseManager::init() {
    if (sqlite3_open(db_path_.c_str(), &db_) != SQLITE_OK) {
        std::cerr << "Failed to open SQLite database: " << sqlite3_errmsg(db_) << std::endl;
        return false;
    }

    const char* create_table_query = R"(
        CREATE TABLE IF NOT EXISTS pastes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
        );
    )";

    char* err_msg = nullptr;
    if (sqlite3_exec(db_, create_table_query, nullptr, nullptr, &err_msg) != SQLITE_OK) {
        std::cerr << "SQL Error during table creation: " << err_msg << std::endl;
        sqlite3_free(err_msg);
        return false;
    }

    return true;
}

bool DatabaseManager::save_paste(const Paste& paste) {
    const char* sql = "INSERT INTO pastes (id, content, created_at, expires_at) VALUES (?, ?, ?, ?);";
    sqlite3_stmt* stmt;

    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_text(stmt, 1, paste.id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, paste.content.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int64(stmt, 3, paste.created_at);
    sqlite3_bind_int64(stmt, 4, paste.expires_at);

    bool result = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return result;
}

std::optional<Paste> DatabaseManager::get_paste(const std::string& id) {
    const char* sql = "SELECT id, content, created_at, expires_at FROM pastes WHERE id = ?;";
    sqlite3_stmt* stmt;

    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return std::nullopt;
    }

    sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) == SQLITE_ROW) {
        Paste paste;
        paste.id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        paste.content = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        paste.created_at = sqlite3_column_int64(stmt, 2);
        paste.expires_at = sqlite3_column_int64(stmt, 3);
        
        sqlite3_finalize(stmt);

        // Check expiration on access
        long long now = std::time(nullptr);
        if (paste.expires_at != -1 && now > paste.expires_at) {
            delete_paste(id);
            return std::nullopt;
        }

        return paste;
    }

    sqlite3_finalize(stmt);
    return std::nullopt;
}

bool DatabaseManager::delete_paste(const std::string& id) {
    const char* sql = "DELETE FROM pastes WHERE id = ?;";
    sqlite3_stmt* stmt;

    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_TRANSIENT);
    bool result = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return result;
}

void DatabaseManager::delete_expired_pastes() {
    const char* sql = "DELETE FROM pastes WHERE expires_at != -1 AND expires_at < ?;";
    sqlite3_stmt* stmt;

    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) == SQLITE_OK) {
        sqlite3_bind_int64(stmt, 1, std::time(nullptr));
        sqlite3_step(stmt);
        sqlite3_finalize(stmt);
    }
}