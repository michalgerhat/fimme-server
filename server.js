var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

var clients = [];
var sockets = [];

function sendMessage(ws, channel, data)
{
    var msg = { channel: channel, data: data };
    ws.send(JSON.stringify(msg));
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
            case "request-clients":
                var msg = [];
                for (var index in clients)
                msg.push(index);
                sendMessage(ws, "clients-list", msg);
                break;

            case "request-connection":
                var requestedId = msg.data;
                if (sockets[requestedId])
                    sendMessage(sockets[requestedId], "connection-requested", msg.id);
                else
                    sendMessage(ws, "connection-unavailable", requestedId);
                break;

            case "geo-update":
                var geo = msg.data;
                clients[msg.id] = { lat: geo.lat, lon: geo.lon, alt: geo.alt };
                sockets[msg.id] = ws;
                break;
        }
    });

    ws.on('close', function()
    {
        delete clients[req.id];
        delete sockets[req.id];
    });
});

function print()
{
    console.clear();
    console.table(clients);
}

setInterval(print, 1000);
app.listen(3000);