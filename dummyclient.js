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

    function tick() 
    {
        document.getElementById("client-id").innerText = "ID: " + id;
        document.getElementById("client-gps").innerText = "LAT: " + lat + " LON: " + lon + " ALT: " + alt;
        
        var message = {id: id, lat: lat, lon: lon, alt: alt};
        ws.send(JSON.stringify(message));

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
        console.log('Message:', e.data);
    };
  
    ws.onclose = function(e)
    {
        clearInterval(timer);
        console.log("Disconnected. Trying to reconnect...", e.reason);
        setTimeout(connect, 1000);
    };
}

var id = uuidv4();
var lat = Math.floor(Math.random() * 100) - 50;
var lon = Math.floor(Math.random() * 100) - 50;
var alt = Math.floor(Math.random() * 100) - 50;
connect();