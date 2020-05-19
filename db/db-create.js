module.exports = `
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS friendships (
        username TEXT NOT NULL,
        friend TEXT NOT NULL,
        PRIMARY KEY (username, friend),
        FOREIGN KEY (username)
            REFERENCES users (username)
                ON UPDATE CASCADE
                ON DELETE CASCADE,
        FOREIGN KEY (friend)
            REFERENCES users (username)
                ON UPDATE CASCADE
                ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friendship_requests (
        requester TEXT NOT NULL,
        responder TEXT NOT NULL,
        PRIMARY KEY (requester, responder),
        FOREIGN KEY (requester)
            REFERENCES users (username)
                ON UPDATE CASCADE
                ON DELETE CASCADE,
        FOREIGN KEY (responder)
            REFERENCES users (username)
                ON UPDATE CASCADE
                ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS connections (
        timestamp INTEGER NOT NULL,
        a_lat REAL NOT NULL,
        a_lon REAL NOT NULL,
        a_alt REAL NOT NULL,
        b_lat REAL NOT NULL,
        b_lon REAL NOT NULL,
        b_alt REAL NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS administrators (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL
    );`