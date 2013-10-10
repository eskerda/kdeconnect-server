var net        = require('net')
var http       = require('http')
var KdeConnect = require('./KdeConnect')

var socketPort = process.env.SOCKET_PORT || 3000
var authPort   = process.env.AUTH_PORT || 3030

var socketServer = net.createServer(KdeConnect.SocketServer)
var authServer   = http.createServer(KdeConnect.AuthServer)


socketServer.listen(socketPort, function() {
    console.log("KdeConnect server listening on", socketPort)
})

authServer.listen(authPort, function() {
    console.log("Auth server listening on", authPort)
})

