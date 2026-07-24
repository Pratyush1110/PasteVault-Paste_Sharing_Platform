#ifndef PASTE_HANDLER_HPP
#define PASTE_HANDLER_HPP

#include "database/DatabaseManager.hpp"
#include "crow.h"
#include <string>

class PasteHandler {
public:
    PasteHandler(DatabaseManager& db);

    crow::response create_paste(const crow::request& req);
    crow::response get_paste(const std::string& id);
    crow::response delete_paste(const std::string& id);

private:
    DatabaseManager& db_;
    std::string generate_random_id(size_t length = 7);
    long long calculate_expiration(int ttl_minutes);
};

#endif