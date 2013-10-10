var StringDecoder = require('string_decoder').StringDecoder

var utf8_decoder = new StringDecoder('utf-8')

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
    this.data      = data.data || false
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

DeviceArray = function(){}
DeviceArray.prototype = new Array
DeviceArray.prototype.getIndex = function( test ) {
    for (var i = 0; i < this.length; i++) {
        if (test(this[i]))
            return i
    }
    return undefined
}

DeviceArray.prototype.find = function( device_id ) {
    var idx = this.getIndex(function( device ){
        return device.id == device_id
    })

    if (idx == undefined)
        return undefined
    else
        return this[idx]
}

var devices = new DeviceArray()

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
                var recipient = devices.find(msg.recipient)
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
        var idx = devices.getIndex(function(device) {
            return device.socket == socket
        })
        devices.splice(idx, 1)
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
    'DeviceArray': DeviceArray,
    'SocketServer': KdeConnectServerListener,
    'devices': devices
}

