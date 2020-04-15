var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

const { Database } = require('./db');
const dbSchema = require('./db-create');
const dbPath = './fimme.db';
var db = new Database(dbPath, dbSchema);

var sockets = {};
var clients = {};
var requests = {};
var connections = {};

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
            case "request-register":
                var username = msg.data.username;
                var password = msg.data.password;

                db.registerUser(username, password, (res) => 
                {
                    res ?
                        sendMessage(ws, "register-accepted", username)
                    :
                        sendMessage(ws, "register-denied", username);
                });
                break;
                
            case "request-login":
                var username = msg.data.username;
                var password = msg.data.password;

                db.verifyUser(username, password, (res) =>
                {
                    res ?
                        sendMessage(ws, "login-accepted", username)
                    :
                        sendMessage(ws, "login-denied", username);
                });
                break;

            case "request-friend":
                var requester = msg.id;
                var responder = msg.data;

                db.requestFriend(requester, responder, (res) => 
                {
                    switch (res)
                    {
                        case 0:
                            sendMessage(ws, "friends-requested", responder);
                            sendMessage(sockets[responder], "friends-requested", requester);
                            break;
                        case 1:
                            sendMessage(ws, "friends-accepted", responder.data);
                            sendMessage(sockets[responder], "friends-accepted", requester);
                            break;
                    }
                });
                break;

            case "cancel-friend-request":
                var requester = msg.id;
                var responder = msg.data;
                
                db.cancelRequest(requester, responder, (res) => 
                {
                    if (res)
                    {
                        sendMessage(ws, "friend-request-cancelled", responder);
                        sendMessage(sockets[responder], "friend-request-cancelled", requester);
                    }
                });

                break;
            
            case "remove-friend":
                var username = msg.id;
                var friend = msg.data;

                db.removeFriend(username, friend, (res) => 
                {
                    if (res)
                    {
                        sendMessage(ws, "friends-removed", responder);
                        sendMessage(sockets[responder], "friends-removed", requester);
                    }
                });
                break;

            case "get-friends-list":
                var username = msg.id;
                
                db.getFriendsList(username, (res) => 
                {
                    if (res)
                    {
                        var friendsList = [];
                        res.friendsList.forEach((friend) => 
                        {
                            if (clients[friend] && clients[friend].connected == false)
                                friendsList.push({ id: friend, available: true });
                            else
                                friendsList.push({ id: friend, available: false });
                        });
    
                        var completeList = { 
                            friendsList: friendsList, 
                            requestsOutgoing: res.requestsOutgoing, 
                            requestsIncoming: res.requestsIncoming
                        };
                        sendMessage(ws, "friends-list", completeList);
                    }
                });
                break;

            case "request-connection":
                var requester = msg.id;
                var responder = msg.data;

                db.checkFriendship(requester, responder, (res) =>
                {
                    if (res && sockets[responder] && clients[responder] && clients[responder].connected == false)
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