var StringDecoder = require('string_decoder').StringDecoder
var utf8_decoder = new StringDecoder('utf-8')
var _ = require('underscore')

function Device (data) {
    data = data || {}

    this.id     = data.id
    this.name   = data.name
    this.socket = data.socket
}

Device.prototype.send = function( msg ) {
    this.socket.write(msg)
}

Device.prototype.error = function( error ) {
    this.send(JSON.stringify({
        "success": false,
        "message": error
    }))
}

function CloudNetworkMessage ( data ) {
    var data = data || {}

    this.recipient = data.recipient || false
    this.data      = data.data || ""
    this.action    = data.action || false
    this.token     = data.token || false
}

CloudNetworkMessage.deserialize = function ( buffered_data ) {
    var data = utf8_decoder.write(buffered_data)
    return new CloudNetworkMessage(JSON.parse(data))
}

CloudNetworkMessage.prototype.serialize = function () {
    return JSON.stringify(this)
}

var devices = []

var onDataListener = function(data) {
    var msg = CloudNetworkMessage.deserialize(data)
    switch(msg.action) {
        case "ping":
            this.id = msg.token
            break
        case "data":
            var recipient = _.find(devices, function(device) {
                return device.id == msg.recipient
            })

            if (!recipient)
                throw new Error("Recipient not found:", msg.recipient)

            if (!this.id)
                throw new Error("Who are you?")

            recipient.send(msg.data)
            break
        default:
            throw new Error("Unrecognized action", msg.action)
    }
}

var onEndListener = function(socket) {
    return function() {
        var device = _.find(devices, function(device) {
            return device.socket == socket
        })
        devices = _.without(devices, device)
        socket.destroy()
        console.log("Client", device.id, "disconnected")
    }
}


KdeConnectServerListener = function( socket ) {
    var device = new Device({"socket": socket})
    devices.push(device)
    socket.on('data', function( data ) {
        try {
            onDataListener(data).bind(device)
        } catch (error) {
            // Send device an error message
            device.error(error.message)
        }
    })
    socket.on('end', onEndListener(socket).bind(device))

    setTimeout(function() {
        // Set an AUTH timeout of 120s
        if (device.id == undefined) {
            device.error("Closing connection, not a valid token")
            socket.emit('end')
        }
    }, 1000 * 120)
}

module.exports = {
    'Device': Device,
    'CloudNetworkMessage': CloudNetworkMessage,
    'SocketServer': KdeConnectServerListener,
    'devices': devices
}

