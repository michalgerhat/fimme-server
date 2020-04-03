function uuidv4() 
{
    // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
    {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
    });
}

function show(id)
{
    document.getElementById(id).style.display = "block";
}

function hide(id)
{
    document.getElementById(id).style.display = "none";
}

function setText(id, text)
{
    document.getElementById(id).innerHTML = text;
}

function addListItem(idList, idItem, fun)
{
    var itemNode = document.createElement("li");
    itemNode.setAttribute("id", idItem);
    itemNode.innerText = idItem;
    itemNode.addEventListener("click", fun);
    document.getElementById(idList).appendChild(itemNode);
    itemNode = null;
}

function clickListener(id, fun)
{
    document.getElementById(id).addEventListener("click", fun);
}

function refreshGeo() 
{
    lat += Math.floor(Math.random() * 5) - 2;
    lon += Math.floor(Math.random() * 5) - 2;
    alt += Math.floor(Math.random() * 5) - 2;
    
    setText("client-lat", lat);
    setText("client-lon", lon);
    setText("client-alt", alt);
}

function sendMessage(channel, data)
{
    var msg = { id: id, channel: channel, data: data };
    ws.send(JSON.stringify(msg));
}

function requestLogin()
{
    setText("form-prompt", "");
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
    var msg = { username: username, password: password };
    sendMessage("request-login", msg);
}

function requestRegister()
{
    setText("form-prompt", "");
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;
    var msg = { username: username, password: password };
    sendMessage("request-register", msg);
}

function sendGeo()
{ 
    var msg = { lat: lat, lon: lon, alt: alt };
    sendMessage("geo-update", msg);
}

function requestClients()
{
    sendMessage("request-clients", "");
}

function requestConnection(responder)
{
    sendMessage("request-connection", responder);
    setText(responder, responder + " - connection requested");
}

function allowConnection()
{
    sendMessage("allow-connection", requester);
    connectedClient = requester;
    requester = null;
    setText("connection-id", connectedClient);
    show("connection");
    hide("request");
    hide("clients");
}

function denyConnection()
{
    sendMessage("deny-connection", requester);
    requester = null;
    hide("connection");
}

function closeConnection()
{
    sendMessage("close-connection", connectedClient);
}

function connect()
{
    // https://stackoverflow.com/questions/22431751/websocket-how-to-automatically-reconnect-after-it-dies

    ws = new WebSocket("ws://localhost:3000");
    var timer = null;

    ws.onopen = function() 
    {
        setText("server", "connected");
        setText("clients-list", "");
    };
  
    ws.onmessage = function(e)
    {
        var msg = JSON.parse(e.data);

        switch (msg.channel)
        {
            case "login-accepted":
                id = msg.data;
                timer = setInterval(sendGeo, 2000);
                setText("client-id", id);
                hide("form");
                show("status");
                show("clients");
                break;

            case "login-denied":
                setText("form-prompt", "Wrong credentials!");
                break;

            case "register-accepted":
                setText("form-prompt", "Account " + msg.data + " created! You may now log in.");
                break;

            case "register-denied":
                setText("form-prompt", "Username " + msg.data + " already taken.");
                break;

            case "clients-list":
                setText("clients-list", "");
                clients = msg.data;
                clients.forEach(client => {
                    if (client != id)
                        addListItem("clients-list", client, requestConnection.bind(this, client));
                });
                break;
            
            case "connection-requested":
                requester = msg.data;
                setText("request-id", requester);
                show("request");
                break;

            case "connection-request-cancelled":
                requester = null;
                hide("request");
                break;

            case "connection-allowed":
                connectedClient = msg.data;
                setText("connection-id", connectedClient);
                hide("clients");
                hide("request");
                show("connection");
                break;

            case "connection-denied":
                setText(msg.data, msg.data + " - request denied");
                break;

            case "connection-unavailable":
                setText(msg.data, msg.data + " - client no longer available");
                break;

            case "connection-closed":
                if (msg.data == connectedClient)
                {
                    connectedClient = null;
                    setText("clients-list", "");
                    show("clients");
                    hide("connection");
                }
                break;

            case "connection-update":
                if (msg.data.id == connectedClient)
                {
                    setText("connection-lat", msg.data.lat);
                    setText("connection-lon", msg.data.lon);
                    setText("connection-alt", msg.data.alt);
                }
                break;
        }
    };
  
    ws.onclose = function(e)
    {
        ws = null;
        clearInterval(timer);
        setText("server", "disconnected, trying to reconnect");
        hide("clients");
        hide("request");
        hide("connection");
        setTimeout(connect, 1000);
    };
}

var ws = null;

var clients = [];
var requester = null;
var connectedClient = null;

var id = uuidv4();

var lat = Math.floor(Math.random() * 100) - 50;
var lon = Math.floor(Math.random() * 100) - 50;
var alt = Math.floor(Math.random() * 100) - 50;
setInterval(refreshGeo, 2000);
    
clickListener("login", requestLogin); 
clickListener("register", requestRegister);
clickListener("clients-update", requestClients); 
clickListener("request-allow", allowConnection);
clickListener("request-deny", denyConnection);
clickListener("connection-close", closeConnection);

connect();