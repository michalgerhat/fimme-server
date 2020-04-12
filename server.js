var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
const fs = require('fs');
const bcrypt = require('bcrypt');
const saltRounds = 10;

var sockets = [];
var clients = [];
var requests = [];
var connections = [];

function print()
{
    console.clear();
    console.log("Connected clients");
    console.table(clients);
    console.log("Connection requests");
    console.table(requests);
    console.log("Active connections");
    console.table(connections);
}

function sendMessage(ws, channel, data)
{
    if (ws)
    {
        var msg = { channel: channel, data: data };
        ws.send(JSON.stringify(msg));
    }
}

function serveConnections()
{
    for (var index in connections)
    {
        var client1 = clients[index];
        var client2 = clients[connections[index]];
        var socket1 = sockets[index];
        var socket2 = sockets[connections[index]];

        if (client1 && client2 && socket1 && socket2)
        {  
            var geo1 = {id: index, lat: client1.lat, lon: client1.lon, alt: client1.alt};
            var geo2 = {id: connections[index], lat: client2.lat, lon: client2.lon, alt: client2.alt};

            sendMessage(socket1, "connection-update", geo2);
            sendMessage(socket2, "connection-update", geo1);
        }
    }
}
 
app.use(function(req, res, next)
{
    return next();
});
 
app.get('/', function(req, res, next)
{
    res.end();
});
 
app.ws('/', function(ws, req)
{
    ws.on('message', function(msg)
    {
        msg = JSON.parse(msg);
        req.id = msg.id;

        switch (msg.channel)
        {
            case "request-login":
                fs.readFile("./users.json", (err, data) =>
                {
                    if (err)
                        return console.error(err);
                    
                    var username = msg.data.username;
                    var password = msg.data.password;
                    var users = JSON.parse(data);
                    bcrypt.compare(password, users[username], (err, result) =>
                    {
                        if (err) 
                            return console.error(err);
                        
                        if (result)
                            sendMessage(ws, "login-accepted", username);
                        else
                            sendMessage(ws, "login-denied", username);
                    });
                });
                break;

            case "request-register":
                fs.readFile("./users.json", (err, data) =>
                {
                    if (err) 
                        return console.error(err);
                    
                    var username = msg.data.username;
                    var password = msg.data.password;
                    var users = JSON.parse(data);
                    if (!users[username])
                    {
                        bcrypt.hash(password, saltRounds, (err, hash) =>
                        {
                            if (err)
                                return console.error(err);

                            users[username] = hash;
                            var usersData = JSON.stringify(users);
                            fs.writeFile("./users.json", usersData, (err) =>
                            {
                                if (err)
                                    return console.error(err);
                                
                                sendMessage(ws, "register-accepted", username);
                            });
                        });
                    }
                    else
                        sendMessage(ws, "register-denied", username);
                });
                break;

            case "request-friend":
                fs.readFile("./friends.json", (err, data) =>
                {
                    if (err) 
                        return console.error(err);
                    
                    var friends = JSON.parse(data);
                    if (!friends[msg.id].includes(msg.data))
                    {
                        fs.readFile("./friend-requests.json", (err, data) =>
                        {
                            if (err) 
                                return console.error(err);
                            
                            var alreadyRequested = false;
                            var index = -1;
                            var friendRequests = JSON.parse(data);
                            for (var i = 0; i < friendRequests.length; i++)
                            {
                                if (friendRequests[i].requester == msg.id && friendRequests[i].responder == msg.data)
                                {
                                    alreadyRequested = true;
                                    break;
                                }
                                else if (friendRequests[i].requester == msg.data && friendRequests[i].responder == msg.id)
                                {
                                    index = i;
                                    break;
                                }
                            }

                            if (!alreadyRequested)
                            {
                                if (index > -1)
                                {
                                    friends[msg.id].push(msg.data);
                                    friends[msg.data].push(msg.id);
                                    friendRequests.splice(index, 1);
    
                                    fs.writeFile("./friends.json", JSON.stringify(friends), (err) =>
                                    {
                                        if (err) 
                                            return console.error(err);
                                        
                                        fs.writeFile("./friend-requests.json", JSON.stringify(friendRequests), (err) =>
                                        {
                                            if (err) 
                                                return console.error(err);
    
                                            sendMessage(ws, "friends-accepted", msg.data);
                                            sendMessage(sockets[msg.data], "friends-accepted", msg.id);
                                        }); 
                                    });
                                }
                                else
                                {
                                    friendRequests.push({ requester: msg.id, responder: msg.data });

                                    fs.writeFile("./friend-requests.json", JSON.stringify(friendRequests), (err) =>
                                    {
                                        if (err) 
                                            return console.error(err);
                                        
                                        sendMessage(ws, "friends-requested", msg.data);
                                        sendMessage(sockets[msg.data], "friends-requested", msg.id);
                                    }); 
                                }
                            }
                        });
                    }
                });
                break;

            case "cancel-friend-request":
                fs.readFile("./friend-requests.json", (err, data) =>
                {
                    if (err) 
                        return console.error(err);
                    
                    var index = -1;
                    var friendRequests = JSON.parse(data);
                    for (var i = 0; i < friendRequests.length; i++)
                    {
                        if ((friendRequests[i].requester == msg.id && friendRequests[i].responder == msg.data) ||
                            (friendRequests[i].requester == msg.data && friendRequests[i].responder == msg.id))
                        {
                            index = i;
                            break;
                        }
                    }

                    if (index > -1)
                    {
                        friendRequests.splice(index, 1);

                        fs.writeFile("./friend-requests.json", JSON.stringify(friendRequests), (err) =>
                        {
                            if (err) 
                                return console.error(err);
                            
                            sendMessage(ws, "friend-request-cancelled", msg.data);
                            sendMessage(sockets[msg.data], "friend-request-cancelled", msg.id);
                        }); 
                    }
                });
                break;
            
            case "remove-friend":
                fs.readFile("./friends.json", (err, data) =>
                {
                    if (err) 
                        return console.error(err);
                    
                    var friends = JSON.parse(data);

                    var index = friends[msg.id].indexOf(msg.data);
                    if (index > -1)
                        friends[msg.id].splice(index, 1);

                    index = friends[msg.data].indexOf(msg.id);
                    if (index > -1)
                        friends[msg.data].splice(index, 1);

                    fs.writeFile("./friends.json", JSON.stringify(friends), (err) =>
                    {
                        if (err) 
                            return console.error(err);
                        
                        sendMessage(ws, "friends-removed", msg.data);
                        sendMessage(sockets[msg.data], "friends-removed", msg.id);
                    });
                });
                break;

            case "get-friends-list":
                var friendsList = [];
                var requestsOutgoing = [];
                var requestsIncoming = [];

                fs.readFile("./friends.json", (err, data) =>
                {
                    if (err) 
                        return console.error(err);
                    
                    var friends = JSON.parse(data);
                    friends[msg.id].forEach((friend) =>
                    {
                        if (clients[friend] && clients[friend].connected == false)
                            friendsList.push({ id: friend, available: true });
                        else
                            friendsList.push({ id: friend, available: false });
                    });

                    fs.readFile("./friend-requests.json", (err, data) => 
                    {
                        if (err) 
                            return console.error(err);

                        var friendRequests = JSON.parse(data);
                        friendRequests.forEach((request) =>
                        {
                            if (request.requester == msg.id)
                                requestsOutgoing.push(request.responder);
                            else if (request.responder == msg.id)
                                requestsIncoming.push(request.requester);
                        });

                        var res = { 
                            friendsList: friendsList, 
                            requestsOutgoing: requestsOutgoing, 
                            requestsIncoming: requestsIncoming
                        };
                        sendMessage(ws, "friends-list", res);
                    });
                });
                break;

            case "get-friend-requests-Outgoing":
                fs.readFile("./friend-requests.json", (err, data) =>
                {
                    if (err) 
                        return console.error(err);
                    
                    var friendRequests = JSON.parse(data);
                    sendMessage(ws, "friends-list", friends[msg.id]);
                });
                break;

            case "request-connection":
                var requester = msg.id;
                var responder = msg.data;

                fs.readFile("./friends.json", (err, data) =>
                {
                    if (err) 
                        return console.error(err);

                    var friends = JSON.parse(data);
                    if (friends[requester].includes(responder) &&
                        sockets[responder] && clients[responder] && 
                        clients[responder].connected == false)
                    {
                        if (requests[requester])
                        {
                            sendMessage(ws, "connection-request-cancelled", requests[requester]);
                            sendMessage(sockets[requests[requester]], "connection-request-cancelled", requester);
                        }
                        sendMessage(sockets[responder], "connection-requested", requester);
                        requests[requester] = responder;
                    }
                    else
                        sendMessage(ws, "connection-unavailable", responder);
                });
                break;

            case "allow-connection":
                var requester = msg.data;
                var responder = msg.id;

                if (requests[requester] == responder)
                {
                    if (sockets[requester])
                    {
                        connections[requester] = responder;
                        clients[requester].connected = true;
                        clients[responder].connected = true;
                        delete requests[requester];
                        sendMessage(ws, "connection-allowed", requester);
                        sendMessage(sockets[requester], "connection-allowed", responder);
                    }
                }
                else
                {
                    sendMessage(ws, "connection-denied", requester);
                    sendMessage(sockets[requester], "connection-denied", responder);
                }
                break;
                
            case "deny-connection":
                var requester = msg.data;
                var responder = msg.id;
                if (requests[requester] == responder)
                {
                    sendMessage(ws, "connection-denied", requester);
                    sendMessage(sockets[requester], "connection-denied", responder);
                    delete requests[requester];
                }
                break;

            case "close-connection":
                if (connections[msg.id] == msg.data)
                {
                    sendMessage(ws, "connection-closed", msg.data);
                    clients[msg.id].connected = false;
                    delete connections[msg.id];
                    sendMessage(sockets[msg.data], "connection-closed", msg.id);
                    clients[msg.data].connected = false;
                }
                else if (connections[msg.data] == msg.id)
                {
                    sendMessage(ws, "connection-closed", msg.data);
                    clients[msg.id].connected = false;
                    delete connections[msg.data];
                    sendMessage(sockets[msg.data], "connection-closed", msg.id);
                    clients[msg.data].connected = false;
                }
                break;

            case "geo-update":
                var geo = msg.data;
                var connected = false;
                if (clients[msg.id])
                    connected = clients[msg.id].connected;
                clients[msg.id] = { lat: geo.lat, lon: geo.lon, alt: geo.alt, connected: connected };
                sockets[msg.id] = ws;
                break;
        }
    });

    ws.on('close', function()
    {
        delete sockets[req.id];
        delete clients[req.id];

        if (requests[req.id])
        {
            sendMessage(sockets[requests[req.id]], "connection-request-cancelled", req.id);
            delete requests[req.id];
        }
        else
            for (index in requests)
                if (requests[index] == req.id)
                {
                    sendMessage(sockets[index], "connection-unavailable", req.id);
                    delete requests[index];
                }

        if (connections[req.id])
        {
            sendMessage(sockets[connections[req.id]], "connection-closed", req.id);
            clients[connections[req.id]].connected = false;
            delete connections[req.id];
        }
        else
            for (index in connections)
                if (connections[index] == req.id)
                {
                    sendMessage(sockets[index], "connection-closed", req.id);
                    clients[index].connected = false;
                    delete connections[index];
                }
    });
});

setInterval(print, 1000);
setInterval(serveConnections, 2000);
app.listen(3000);