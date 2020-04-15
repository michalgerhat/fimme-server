// https://github.com/CharlieTheProgrammer/NodejsSQLite-Pt3
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const saltRounds = 10;

const selectUsers = "SELECT * FROM users WHERE username = ?";
const selectRequest = "SELECT * FROM friendship_requests WHERE requester = ? AND responder = ?";
const selectFriendship = "SELECT * FROM friendships WHERE username = ? AND friend = ?";
const selectFriendsList = "SELECT friend FROM friendships WHERE username = ?";
const selectRequestsIncoming = "SELECT requester FROM friendship_requests WHERE responder = ?";
const selectRequestsOutgoing = "SELECT responder FROM friendship_requests WHERE requester = ?";
const insertUser = "INSERT INTO users (username, password) VALUES (?, ?)";
const insertRequest = "INSERT INTO friendship_requests (requester, responder) VALUES (?, ?)";
const insertFriendship = "INSERT INTO friendships (username, friend) VALUES (?, ?)";
const deleteRequest = "DELETE FROM friendship_requests (requester, responder) WHERE requester = ? AND responder = ?";
const deleteFriendship = "DELETE FROM friendships (username, friend) WHERE username = ? AND friend = ?";

function Database(path, dbSchema)
{
    const db = new sqlite3.Database(path, (err) =>
    {
        if (err)
            return console.error(err);
        
        console.log('Connected to ' + path);

        db.exec('PRAGMA foreign_keys = ON;', (err) =>
        {
            err ? console.error("Pragma statement error") : console.log("Foreign keys on");
        });
    });

    db.exec(dbSchema, (err) => 
    {
        if (err)
            return console.error(err);
    });

    return {
        registerUser: function(username, password, _callback)
        {
            bcrypt.hash(password, saltRounds, (err, hash) =>
            {                
                if (err || !row) 
                    return _callback(false);

                db.run(insertUser, [username, hash], (err) => 
                {                
                    err ? _callback(false) : _callback(true);
                });
            });
        },
        verifyUser: function(username, password, _callback)
        {
            db.get(selectUsers, username, (err, row) =>
            {
                if (err || !row) 
                    return _callback(false);

                bcrypt.compare(password, row.password, (err, res) =>
                {
                    err ? _callback(false) : _callback(res);
                });
            });
        },
        requestFriend: function(requester, responder, _callback)
        {
            db.get(selectFriendship, [requester, responder], (err, row) =>
            {
                if (err || row)
                    return _callback(-1); 

                db.get(selectRequest, [responder, requester], (err, row) =>
                {
                    if (err)
                        return _callback(-1); 

                    if (row)
                        db.run(insertFriendship, [requester, responder], (err) =>
                        {
                            if (err)
                                return _callback(-1); 

                            db.run(insertFriendship, [responder, requester], (err) =>
                            {
                                err ? _callback(-1) : _callback(1);
                            }); 
                        });                        
                    else
                        db.run(insertRequest, [requester, responder], (err) =>
                        {
                            err ? _callback(-1) : _callback(0);
                        });
                });
            });
        },
        cancelRequest: function(requester, responder, _callback)
        {
            db.run(deleteRequest, [requester, responder], (err) =>
            {
                if (err)
                    return _callback(false); 
                
                if (this.changes == 0)
                    db.run(deleteRequest, [responder, requester], (err) =>
                    {
                        (err || this.changes == 0) ? _callback(false) : _callback(true); 
                    });  
                else
                    _callback(true);
            });  
        },
        removeFriend: function(username, friend, _callback)
        {
            db.run(deleteFriendship, [username, friend], (err) =>
            {
                if (err)
                    return _callback(false);
                
                db.run(deleteFriendship, [friend, username], (err) =>
                {
                    err ? _callback(false) : _callback(true);
                });
            });
        },
        getFriendsList: function(username, _callback)
        {
            var friendsList = [];
            var requestsOutgoing = [];
            var requestsIncoming = [];

            db.all(selectFriendsList, username, (err, rows) =>
            {
                if (err)
                    return _callback(null);

                rows.forEach((row) => { friendsList.push(row.friend) });
                    
                db.all(selectRequestsOutgoing, username, (err, rows) =>
                {
                    if (err)
                        return _callback(null);
                    
                    rows.forEach((row) => { requestsOutgoing.push(row.responder) });

                    db.all(selectRequestsIncoming, username, (err, rows) =>
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
        },
        checkFriendship: function(username, friend, _callback)
        {
            db.get(selectFriendship, [username, friend], (err, row) =>
            {
                (err || !row) ? _callback(false) : _callback(true);
            });
        }
    }
}

module.exports = { Database };