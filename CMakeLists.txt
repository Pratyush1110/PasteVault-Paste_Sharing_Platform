cmake_minimum_required(VERSION 3.14)
project(PasteVault CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Force Asio standalone mode
add_definitions(-DASIO_STANDALONE)

# Find SQLite3 and Threads
find_package(SQLite3 REQUIRED)
find_package(Threads REQUIRED)

# Fetch Crow automatically
include(FetchContent)
FetchContent_Declare(
    Crow
    GIT_REPOSITORY https://github.com/CrowCpp/Crow.git
    GIT_TAG master
)
FetchContent_MakeAvailable(Crow)

# Include project source files
include_directories(
    ${CMAKE_SOURCE_DIR}/src
    ${SQLITE3_INCLUDE_DIRS}
)

file(GLOB_RECURSE SOURCES "src/*.cpp")

add_executable(pastevault ${SOURCES})

if(WIN32)
    target_link_libraries(pastevault PRIVATE ws2_32 mswsock iphlpapi)
endif()

# Explicitly link SQLite3 target / library
target_link_libraries(pastevault
    PRIVATE
        Crow::Crow
        SQLite::SQLite3
        Threads::Threads
)