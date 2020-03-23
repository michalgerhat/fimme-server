function uuidv4() 
{
    // https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
    {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
    });
}

function connect()
{
    // https://stackoverflow.com/questions/22431751/websocket-how-to-automatically-reconnect-after-it-dies

    var ws = new WebSocket("ws://localhost:3000");
    var timer;

    function sendMessage(channel, data)
    {
        var msg = { id: id, channel: channel, data: data };
        ws.send(JSON.stringify(msg));
    }

    function tick() 
    {
        document.getElementById("client-id").innerText = id;
        document.getElementById("client-lat").innerText = lat;
        document.getElementById("client-lon").innerText = lon;
        document.getElementById("client-alt").innerText = alt;
        
        var msg = { lat: lat, lon: lon, alt: alt };
        sendMessage("geo-update", msg);

        lat += Math.floor(Math.random() * 5) - 2;
        lon += Math.floor(Math.random() * 5) - 2;
        alt += Math.floor(Math.random() * 5) - 2;
    }

    ws.onopen = function() 
    {
        console.log("Connected to server.");
        timer = setInterval(tick, 2000);
    };
  
    ws.onmessage = function(e)
    {
        var msg = JSON.parse(e.data);

        switch (msg.channel)
        {
            case "clients-list":
                clients = msg.data;
                document.getElementById("clients").innerHTML = "";
                clients.forEach(item => {
                    if (item != id)
                    {
                        var node = document.createElement("li");
                        node.innerText = item;
                        node.addEventListener("click", function()
                        {
                            sendMessage("request-connection", item);
                        });
                        document.getElementById("clients").appendChild(node);
                    }
                });
                break;
            
            case "connection-requested":
                console.log("Connection requested by " + msg.data);
                break;

            case "connection-unavailable":
                console.log("Connection unavailable: " + msg.data);
                break;
        }
    };
  
    ws.onclose = function(e)
    {
        clearInterval(timer);
        console.log("Disconnected. Trying to reconnect...", e.reason);
        setTimeout(connect, 1000);
    };

    document.getElementById("clientsButton").addEventListener("click", function()
    {
        sendMessage("request-clients", "");
    });    
}

var id = uuidv4();
var lat = Math.floor(Math.random() * 100) - 50;
var lon = Math.floor(Math.random() * 100) - 50;
var alt = Math.floor(Math.random() * 100) - 50;
var clients = [];
connect();