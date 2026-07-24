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
            is_encrypted INTEGER NOT NULL DEFAULT 0,
            burn_after_reading INTEGER NOT NULL DEFAULT 0,
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

    // Migration path: if an older pastevault.db already exists without these
    // columns, ALTER TABLE adds them. If a column already exists (fresh DB
    // created above, or already-migrated DB), SQLite returns an error
    // ("duplicate column name") which we simply ignore.
    const char* migrate_encrypted_query = "ALTER TABLE pastes ADD COLUMN is_encrypted INTEGER NOT NULL DEFAULT 0;";
    char* migrate_encrypted_err = nullptr;
    if (sqlite3_exec(db_, migrate_encrypted_query, nullptr, nullptr, &migrate_encrypted_err) != SQLITE_OK) {
        sqlite3_free(migrate_encrypted_err); // expected on fresh/already-migrated DBs, safe to ignore
    }

    const char* migrate_burn_query = "ALTER TABLE pastes ADD COLUMN burn_after_reading INTEGER NOT NULL DEFAULT 0;";
    char* migrate_burn_err = nullptr;
    if (sqlite3_exec(db_, migrate_burn_query, nullptr, nullptr, &migrate_burn_err) != SQLITE_OK) {
        sqlite3_free(migrate_burn_err); // expected on fresh/already-migrated DBs, safe to ignore
    }

    return true;
}

bool DatabaseManager::save_paste(const Paste& paste) {
    const char* sql = "INSERT INTO pastes (id, content, is_encrypted, burn_after_reading, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?);";
    sqlite3_stmt* stmt;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

    sqlite3_bind_text(stmt, 1, paste.id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, paste.content.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 3, paste.is_encrypted ? 1 : 0);
    sqlite3_bind_int(stmt, 4, paste.burn_after_reading ? 1 : 0);
    sqlite3_bind_int64(stmt, 5, paste.created_at);
    sqlite3_bind_int64(stmt, 6, paste.expires_at);

    bool result = (sqlite3_step(stmt) == SQLITE_DONE);
    sqlite3_finalize(stmt);
    return result;
}

std::optional<Paste> DatabaseManager::get_paste(const std::string& id) {
    // Explicitly select columns matching index 0 to 5
    const char* sql = "SELECT id, content, is_encrypted, burn_after_reading, created_at, expires_at FROM pastes WHERE id = ?;";
    sqlite3_stmt* stmt;

    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return std::nullopt;
    }

    sqlite3_bind_text(stmt, 1, id.c_str(), -1, SQLITE_TRANSIENT);

    if (sqlite3_step(stmt) == SQLITE_ROW) {
        Paste paste;
        paste.id = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
        paste.content = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1));
        
        // STRICT COMPARISON: Must equal 1 explicitly!
        // Prevents raw timestamps from evaluating to true.
        int enc_val = sqlite3_column_int(stmt, 2);
        int burn_val = sqlite3_column_int(stmt, 3);
        
        paste.is_encrypted = (enc_val == 1);
        paste.burn_after_reading = (burn_val == 1);
        
        paste.created_at = sqlite3_column_int64(stmt, 4);
        paste.expires_at = sqlite3_column_int64(stmt, 5);

        sqlite3_finalize(stmt);

        // Expiration check
        long long now = std::time(nullptr);
        if (paste.expires_at != -1 && now > paste.expires_at) {
            delete_paste(id);
            return std::nullopt;
        }

        // Delete immediately if burn_after_reading is strictly true (1)
        if (paste.burn_after_reading) {
            delete_paste(id);
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