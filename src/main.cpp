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

    // 1. Serve index.html at root "/"
    CROW_ROUTE(app, "/")
    ([](crow::response& res) {
        res.set_static_file_info("public/index.html");
        res.end();
    });

    // 2. Attach REST API routes (/api/paste, etc.)
    setup_routes(app, paste_handler);

    // 3. Dynamic route for static files or Paste ID URLs (e.g., /RCOtjlQ)
    CROW_ROUTE(app, "/<string>")
    ([](crow::response& res, std::string path) {
        // If requesting explicit static files, serve them from public/
        if (path == "style.css" || path == "app.js" || path == "favicon.ico") {
            res.set_static_file_info("public/" + path);
        } else {
            // For any paste ID path (e.g. /RCOtjlQ), serve index.html
            res.set_static_file_info("public/index.html");
        }
        res.end();
    });

    const char* port_env = std::getenv("PORT");
    uint16_t port = port_env ? static_cast<uint16_t>(std::atoi(port_env)) : 18080;

    std::cout << "PasteVault backend running on port " << port << std::endl;
    app.port(port).multithreaded().run();

    return 0;
}