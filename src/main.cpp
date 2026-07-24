#include "crow.h"
#include "database/DatabaseManager.hpp"
#include "handlers/PasteHandler.hpp"
#include "routes/Router.hpp"
#include <iostream>

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

    // Serve any static asset (style.css, app.js, etc.) from public/
    CROW_ROUTE(app, "/<string>")
    ([](crow::response& res, std::string filename) {
        res.set_static_file_info("public/" + filename);
        res.end();
    });

    // Attach REST API routes
    setup_routes(app, paste_handler);

    std::cout << "PasteVault backend running on http://localhost:18080" << std::endl;
    app.port(18080).multithreaded().run();

    return 0;
}