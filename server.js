var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);

var clients = [];
 
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
        clients[msg.id] = { lat: msg.lat, lon: msg.lon, alt: msg.alt };
    });

    ws.on('close', function()
    {
        delete clients[req.id];
    });
});

function print()
{
    console.clear();
    console.table(clients);
}

setInterval(print, 1000);
app.listen(3000);