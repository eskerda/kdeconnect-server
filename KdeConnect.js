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

KdeConnectServerListener = function( socket ) {
    var device = new Device({"socket": socket})
    devices.push(device)
    socket.on('data', function(data) {
        var msg
        try {
            msg = CloudNetworkMessage.deserialize(data)
        } catch (e) {
            console.log("Invalid message")
            return
        }
        switch(msg.action) {
            case "ping":
                this.id = msg.token
                break
            case "data":
                var recipient = _.find(devices, function(device) {
                    return device.id == msg.recipient
                })

                if (!recipient) {
                    console.log("Recipient not found")
                    return
                }
                if (!this.id) {
                    console.log("Who are you?")
                    return
                }
                recipient.send(msg.data)
                break
            default:
                console.log("Unrecognized action")
                return

        }
    }.bind(device)) //bind 'device' into 'this' for future accessing

    socket.on('end', function() {
        var device = _.find(devices, function(device) {
            return device.socket == socket
        })
        devices = _.without(devices, device)
        socket.destroy()
    }.bind(device))

    setTimeout(function() {
        // Set an AUTH timeout of 120s
        if (device.id == undefined) {
            device.send("Byez!")
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

