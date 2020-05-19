# Fimme-server

Server for the location sharing app [Fimme](https://github.com/michalgerhat/fimme). Allows a pair of users to establish connection and exchange their coordinates, so their client apps can navigate towards each other.

## Usage

* `npm start` to launch the server, displaying table of client activity on console (uses console.clear()).
* `npm run verbose` to launch the server, logging all incoming and outgoing messages.
* `npm run client` to launch an HTML dummy client for testing. Some test logins [here](https://github.com/michalgerhat/fimme-server/blob/master/db/users.txt).
* Live demo of dummy client [here](https://gerhat.cz/client.html). You can open it in multiple browser tabs and simulate connections.

## Features

* User registration and login.
* Friends list, friend requests management.
* Connecting two users and exchanging their coordinates periodically.
* Logging connections (for analytics only - no usernames).
* [Administration console](https://github.com/michalgerhat/fimme-admin).

## Technologies

* The server is a Node.js app.
* All communication is done using WebSocket.
* Data is stored in an SQLite database.
* Passwords are stored hashed using bcrypt.
* Every message is authenticated using JWT with expiration and refreshing.

The database and .env file with tokens are commited for demo purposes. Any production setting should use its own files that are not published anywhere.

## Todo

* Some timeout mechanism to reestablish connection if interrupted by network change, etc.
* User and connection management within server.js is not very nice, should be done using ES6 classes.
* Dummy client is somewhat messy, would be better done using React.
