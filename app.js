var net = require('net')

var KdeConnect = require('./KdeConnect')

var socketPort = process.env.SOCKET_PORT || 3000

var server = net.createServer(KdeConnect.SocketServer)

server.listen(socketPort, function() {
    console.log("KdeConnect server listening to", socketPort)
})

