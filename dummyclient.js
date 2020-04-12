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

function addListItem(idList, item)
{
    var itemNode = document.createElement("li");

    switch(idList)
    {
        case "friends-list":
            itemNode.innerText = item.id;
            itemNode.setAttribute("id", item.id);

            if (item.id == requested)
                itemNode.innerText += " - connection requested";
            else
            {
                var connectButton = document.createElement("button");
                connectButton.innerText = "Connect";
                if (item.available)
                    connectButton.addEventListener("click", requestConnection.bind(this, item.id));
                else
                    connectButton.disabled = true;
                
                var removeButton = document.createElement("button");
                removeButton.innerText = "Remove";
                removeButton.addEventListener("click", removeFriend.bind(this, item.id));
    
                itemNode.appendChild(connectButton);
                itemNode.appendChild(removeButton);
            }
            break;

        case "friends-outgoing":
            itemNode.innerText = item;
            itemNode.innerText += " - click to cancel";
            itemNode.addEventListener("click", cancelFriendRequest.bind(this, item));
            break;

        case "friends-incoming":
            itemNode.innerText = item;

            var acceptButton = document.createElement("button");
            acceptButton.innerText = "Accept";
            acceptButton.addEventListener("click", requestFriend.bind(this, item));
            
            var declineButton = document.createElement("button");
            declineButton.innerText = "Decline";
            declineButton.addEventListener("click", cancelFriendRequest.bind(this, item));

            itemNode.appendChild(acceptButton);
            itemNode.appendChild(declineButton);
            break;
    }
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

function getFriendsList()
{
    sendMessage("get-friends-list", "");
}

function addFriend()
{
    var responder = document.getElementById("friends-new").value;
    sendMessage("request-friend", responder);
}

function requestFriend(responder)
{
    sendMessage("request-friend", responder);
}

function cancelFriendRequest(responder)
{
    sendMessage("cancel-friend-request", responder);
}

function removeFriend(responder)
{
    sendMessage("remove-friend", responder);
}

function requestConnection(responder)
{
    requested = responder;
    sendMessage("request-connection", responder);
    setText(responder, responder + " - connection requested");
}

function allowConnection()
{
    sendMessage("allow-connection", requester);
}

function denyConnection()
{
    sendMessage("deny-connection", requester);
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
        setText("friends-list", "");
        setText("friends-outgoing", "");
        setText("friends-incoming", "");
        hide("status");
        show("form");
    };
  
    ws.onmessage = function(e)
    {
        var msg = JSON.parse(e.data);

        switch (msg.channel)
        {
            case "login-accepted":
                id = msg.data;
                timer = setInterval(sendGeo, 2000);
                getFriendsList();
                setText("client-id", id);
                hide("form");
                show("status");
                show("friends");
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

            case "friends-list":
                setText("friends-list", "");
                setText("friends-outgoing", "");
                setText("friends-incoming", "");

                friendsList = msg.data.friendsList;
                friendsList.forEach(friend => 
                {
                    addListItem("friends-list", friend);
                });

                requestsOutgoing = msg.data.requestsOutgoing;
                requestsOutgoing.forEach(request => 
                {
                    addListItem("friends-outgoing", request);
                });

                requestsIncoming = msg.data.requestsIncoming;
                requestsIncoming.forEach(request => 
                {
                    addListItem("friends-incoming", request);
                });
                break;

            case "friends-requested":
            case "friend-request-cancelled":
            case "friends-accepted":
            case "friends-removed":
                sendMessage("get-friends-list", "");
                break;
            
            case "connection-requested":
                requester = msg.data;
                setText("request-id", requester);
                show("request");
                break;

            case "connection-request-cancelled":
                if (msg.data == requester)
                {
                    requester = null;
                    hide("request");
                }
                else
                    setText(msg.data, msg.data);
                sendMessage("get-friends-list", "");
                break;

            case "connection-allowed":
                connectedClient = msg.data;
                requester = null;
                requested = null;
                setText("connection-id", connectedClient);
                hide("friends");
                hide("request");
                show("connection");
                break;

            case "connection-denied":
                if (msg.data == requester)
                {   
                    requester = null;    
                    hide("request");
                }
                else if (msg.data == requested)
                {   
                    requested = null;
                    setText(msg.data, msg.data + " - request denied");
                }
                break;

            case "connection-unavailable":
                setText(msg.data, msg.data + " - client no longer available");
                break;

            case "connection-closed":
                if (msg.data == connectedClient)
                {
                    connectedClient = null;
                    setText("friends-list", "");
                    setText("friends-outgoing", "");
                    setText("friends-incoming", "");
                    getFriendsList();
                    show("friends");
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
        hide("status");
        hide("friends");
        hide("request");
        hide("connection");
        setTimeout(connect, 1000);
    };
}

var ws = null;

var requester = null;
var requested = null;
var connectedClient = null;

var id = uuidv4();

var lat = Math.floor(Math.random() * 100) - 50;
var lon = Math.floor(Math.random() * 100) - 50;
var alt = Math.floor(Math.random() * 100) - 50;
setInterval(refreshGeo, 2000);
    
clickListener("login", requestLogin); 
clickListener("register", requestRegister);
clickListener("friends-add", addFriend);
clickListener("friends-update", getFriendsList); 
clickListener("request-allow", allowConnection);
clickListener("request-deny", denyConnection);
clickListener("connection-close", closeConnection);

connect();