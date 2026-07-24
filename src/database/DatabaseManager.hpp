#ifndef DATABASE_MANAGER_HPP
#define DATABASE_MANAGER_HPP

#include <sqlite3.h>
#include <string>
#include <optional>

struct Paste {
    std::string id;
    std::string content;
    bool is_encrypted = false;
    long long created_at;
    long long expires_at; // -1 means never expires
};

class DatabaseManager {
public:
    DatabaseManager(const std::string& db_path);
    ~DatabaseManager();

    bool init();
    bool save_paste(const Paste& paste);
    std::optional<Paste> get_paste(const std::string& id);
    bool delete_paste(const std::string& id);
    void delete_expired_pastes();

private:
    sqlite3* db_;
    std::string db_path_;
};

#endif