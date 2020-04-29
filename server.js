const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const Database = require('./db');
const db = new Database();

const Authenticator = require('./auth');
const auth = new Authenticator();

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

wss.on("connection", (ws) => 
{
    ws.on("message", (msg) =>
    {
        msg = JSON.parse(msg);

        auth.check(msg.token, (data) => 
        {
            if (data)
            {
                ws.id = data.name;

                switch (msg.channel)
                {
                    case "request-friend":
                        var requester = ws.id;
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
                        var requester = ws.id;
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
                        var username = ws.id;
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
                        var username = ws.id;
                        
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
                        var requester = ws.id;
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
                        var responder = ws.id;
    
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
                        var responder = ws.id;
                        if (requests[requester] == responder)
                        {
                            sendMessage(ws, "connection-denied", requester);
                            sendMessage(sockets[requester], "connection-denied", responder);
                            delete requests[requester];
                        }
                        break;
    
                    case "close-connection":
                        if (connections[ws.id] == msg.data)
                        {
                            sendMessage(ws, "connection-closed", msg.data);
                            clients[ws.id].connected = false;
                            delete connections[ws.id];
                            sendMessage(sockets[msg.data], "connection-closed", ws.id);
                            clients[msg.data].connected = false;
                        }
                        else if (connections[msg.data] == ws.id)
                        {
                            sendMessage(ws, "connection-closed", msg.data);
                            clients[ws.id].connected = false;
                            delete connections[msg.data];
                            sendMessage(sockets[msg.data], "connection-closed", ws.id);
                            clients[msg.data].connected = false;
                        }
                        break;
    
                    case "geo-update":
                        var geo = msg.data;
                        var connected = false;
                        if (clients[ws.id])
                            connected = clients[ws.id].connected;
                        clients[ws.id] = { lat: geo.lat, lon: geo.lon, alt: geo.alt, connected: connected };
                        sockets[ws.id] = ws;
                        break;
                }
            }
            else
            {
                switch (msg.channel)
                {
                    case "request-register":
                        var username = msg.data.username;
                        var password = msg.data.password;

                        db.registerUser(username, password, (res) => 
                        {
                            if (res)
                                sendMessage(ws, "register-accepted", username);
                            else
                                sendMessage(ws, "register-denied", username);
                        });
                        break;
                        
                    case "request-login":
                        var username = msg.data.username;
                        var password = msg.data.password;

                        db.verifyUser(username, password, (res) =>
                        {
                            if (res)
                            {
                                auth.authenticate({ name: username }, (tokens) =>
                                {
                                    sendMessage(ws, "login-accepted", tokens);
                                });
                            }
                            else
                                sendMessage(ws, "login-denied", username);
                        });
                        break;
                    
                    case "authenticate":
                        auth.refresh(msg.data, (res) =>
                        {
                            if (res)
                                sendMessage(ws, "authenticated", res);
                            else
                            {
                                sendMessage(ws, "unauthenticated", "");
                                ws.close();
                            }
                        });
                        break;

                    default:
                        sendMessage(ws, "unauthenticated", "");
                        break;
                }
            }
        });
    });

    ws.on('close', () =>
    {
        delete sockets[ws.id];
        delete clients[ws.id];

        if (requests[ws.id])
        {
            sendMessage(sockets[requests[ws.id]], "connection-request-cancelled", ws.id);
            delete requests[ws.id];
        }
        else
            for (index in requests)
                if (requests[index] == ws.id)
                {
                    sendMessage(sockets[index], "connection-unavailable", ws.id);
                    delete requests[index];
                }

        if (connections[ws.id])
        {
            sendMessage(sockets[connections[ws.id]], "connection-closed", ws.id);
            clients[connections[ws.id]].connected = false;
            delete connections[ws.id];
        }
        else
            for (index in connections)
                if (connections[index] == ws.id)
                {
                    sendMessage(sockets[index], "connection-closed", ws.id);
                    clients[index].connected = false;
                    delete connections[index];
                }
    });
});

setInterval(print, 1000);
setInterval(serveConnections, 2000);