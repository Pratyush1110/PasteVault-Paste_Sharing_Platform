#include "crow.h"
#include "database/DatabaseManager.hpp"
#include "handlers/PasteHandler.hpp"
#include "routes/Router.hpp"
#include <iostream>
#include <cstdlib>

int main() {
    DatabaseManager db("pastevault.db");
    if (!db.init()) {
        std::cerr << "Failed to initialize database. Exiting..." << std::endl;
        return 1;
    }

    PasteHandler paste_handler(db);
    crow::SimpleApp app;

    // Serve index.html at root "/"
    CROW_ROUTE(app, "/")
    ([](crow::response& res) {
        res.set_static_file_info("public/index.html");
        res.end();
    });

    // Serve static assets (style.css, app.js, etc.)
    CROW_ROUTE(app, "/<string>")
    ([](crow::response& res, std::string filename) {
        res.set_static_file_info("public/" + filename);
        res.end();
    });

    // Attach REST API routes
    setup_routes(app, paste_handler);

    // Read PORT from environment variable (required for cloud hosting)
    const char* port_env = std::getenv("PORT");
    uint16_t port = port_env ? static_cast<uint16_t>(std::atoi(port_env)) : 18080;

    std::cout << "PasteVault backend running on port " << port << std::endl;
    app.port(port).multithreaded().run();

    return 0;
}