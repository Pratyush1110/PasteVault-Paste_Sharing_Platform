#ifndef ROUTER_HPP
#define ROUTER_HPP

#include "crow.h"
#include "handlers/PasteHandler.hpp"

inline void setup_routes(crow::SimpleApp& app, PasteHandler& paste_handler) {
    using namespace crow;

    // Create a new paste (POST)
    CROW_ROUTE(app, "/api/paste").methods("POST"_method)
    ([&paste_handler](const crow::request& req) {
        return paste_handler.create_paste(req);
    });

    // Retrieve a paste by ID (GET)
    CROW_ROUTE(app, "/api/paste/<string>")
    ([&paste_handler](const std::string& id) {
        return paste_handler.get_paste(id);
    });

    // Delete a paste by ID (DELETE)
    CROW_ROUTE(app, "/api/paste/<string>").methods("DELETE"_method)
    ([&paste_handler](const std::string& id) {
        return paste_handler.delete_paste(id);
    });
}

#endif