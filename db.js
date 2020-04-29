// https://github.com/CharlieTheProgrammer/NodejsSQLite-Pt3
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const dbSchema = require('./db-create');
const dbPath = './fimme.db';

class Database
{
    constructor()
    {
        this.db = new sqlite3.Database(dbPath, (err) =>
        {
            if (err)
                return console.error(err);
            
            console.log('Connected to ' + dbPath);
    
            this.db.exec('PRAGMA foreign_keys = ON;', (err) =>
            {
                err ? console.error("Pragma statement error") : console.log("Foreign keys on");
            });
        });
    
        this.db.exec(dbSchema, (err) => 
        {
            if (err)
                return console.error(err);
        });
    }   

    registerUser(username, password, _callback)
    {
        bcrypt.hash(password, saltRounds, (err, hash) =>
        {                
            if (err || !row) 
                return _callback(false);

            const insertUser = "INSERT INTO users (username, password) VALUES (?, ?)";
            this.db.run(insertUser, [username, hash], (err) => 
            {                
                err ? _callback(false) : _callback(true);
            });
        });
    }

    verifyUser(username, password, _callback)
    {
        const selectUsers = "SELECT * FROM users WHERE username = ?";
        this.db.get(selectUsers, username, (err, row) =>
        {
            if (err || !row) 
                return _callback(false);

            bcrypt.compare(password, row.password, (err, res) =>
            {
                err ? _callback(false) : _callback(res);
            });
        });
    }

    requestFriend(requester, responder, _callback)
    {
        const selectFriendship = "SELECT * FROM friendships WHERE username = ? AND friend = ?";
        this.db.get(selectFriendship, [requester, responder], (err, row) =>
        {
            if (err || row)
                return _callback(-1); 
    
            const selectRequest = "SELECT * FROM friendship_requests WHERE requester = ? AND responder = ?";
            this.db.get(selectRequest, [responder, requester], (err, row) =>
            {
                if (err)
                    return _callback(-1); 
    
                if (row)
                {
                    const insertFriendship = "INSERT INTO friendships (username, friend) VALUES (?, ?)";
                    this.db.run(insertFriendship, [requester, responder], (err) =>
                    {
                        if (err)
                            return _callback(-1); 
    
                        this.db.run(insertFriendship, [responder, requester], (err) =>
                        {
                            err ? _callback(-1) : _callback(1);
                        }); 
                    });  
                }
                                          
                else
                {
                    const insertRequest = "INSERT INTO friendship_requests (requester, responder) VALUES (?, ?)";
                    this.db.run(insertRequest, [requester, responder], (err) =>
                    {
                        err ? _callback(-1) : _callback(0);
                    });
                } 
            });
        });
    }

    cancelRequest(requester, responder, _callback)
    {
        const deleteRequest = "DELETE FROM friendship_requests (requester, responder) WHERE requester = ? AND responder = ?";
        this.db.run(deleteRequest, [requester, responder], (err) =>
        {
            if (err)
                return _callback(false); 
            
            if (this.changes == 0)
                this.db.run(deleteRequest, [responder, requester], (err) =>
                {
                    (err || this.changes == 0) ? _callback(false) : _callback(true); 
                });  
            else
                _callback(true);
        });  
    }

    removeFriend(username, friend, _callback)
    {
        const deleteFriendship = "DELETE FROM friendships (username, friend) WHERE username = ? AND friend = ?";
        this.db.run(deleteFriendship, [username, friend], (err) =>
        {
            if (err)
                return _callback(false);
            
            this.db.run(deleteFriendship, [friend, username], (err) =>
            {
                err ? _callback(false) : _callback(true);
            });
        });
    }

    getFriendsList(username, _callback)
    {
        var friendsList = [];
        var requestsOutgoing = [];
        var requestsIncoming = [];

        const selectFriendsList = "SELECT friend FROM friendships WHERE username = ?";
        this.db.all(selectFriendsList, username, (err, rows) =>
        {
            if (err)
                return _callback(null);

            rows.forEach((row) => { friendsList.push(row.friend) });
                
            const selectRequestsOutgoing = "SELECT responder FROM friendship_requests WHERE requester = ?";
            this.db.all(selectRequestsOutgoing, username, (err, rows) =>
            {
                if (err)
                    return _callback(null);
                
                rows.forEach((row) => { requestsOutgoing.push(row.responder) });

                const selectRequestsIncoming = "SELECT requester FROM friendship_requests WHERE responder = ?";
                this.db.all(selectRequestsIncoming, username, (err, rows) =>
                {
                    if (err)
                        return _callback(null);
                    
                    rows.forEach((row) => { requestsIncoming.push(row.responder) });

                    var res = { 
                        friendsList: friendsList, 
                        requestsOutgoing: requestsOutgoing, 
                        requestsIncoming: requestsIncoming
                    };
                    _callback(res);
                });
            });
        });
    }

    checkFriendship(username, friend, _callback)
    {
        const selectFriendship = "SELECT * FROM friendships WHERE username = ? AND friend = ?";
        this.db.get(selectFriendship, [username, friend], (err, row) =>
        {
            (err || !row) ? _callback(false) : _callback(true);
        });
    }
}

module.exports = Database;