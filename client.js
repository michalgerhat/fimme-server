class Client
{
    constructor(username, socket, friends, friendRequestsIncoming, friendRequestsOutgoing)
    {
        this.username = username;
        this.socket = socket;
        this.friends = friends;
        this.friendRequestsOutgoing = friendRequestsOutgoing;
        this.friendRequestsIncoming = friendRequestsIncoming;
        this.connection = null;
        this.connectionRequestOutgoing = null;
        this.connectionRequestsIncoming = [];
    }

    requestFriend(request)
    {
        this.requestsOutgoing.push(request);
    }

    getFriendRequest(request)
    {
        this.friendRequestsIncoming.push(request);
    }

    acceptFriend(friend)
    {
        this.friends.push(friend);
        this.friendRequestsIncoming = this.friendRequestsIncoming.filter(request => request != friend);
        this.friendRequestsOutgoing = this.friendRequestsOutgoing.filter(request => request != friend);
    }

    removeFriend(unfriend)
    {
        this.friends = this.friends.filter(friend => friend != unfriend);
    }

    sendMessage(channel, data)
    {
        var msg = { channel: channel, data: data };
        this.socket.send(JSON.stringify(msg));
    }
}

module.exports = Client;