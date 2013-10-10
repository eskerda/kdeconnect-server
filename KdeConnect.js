var StringDecoder = require('string_decoder').StringDecoder
var utf8_decoder = new StringDecoder('utf-8')
var _ = require('underscore')
var express = require('express')
var crypto = require('crypto')

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
var auth    = {}

var onDataListener = function(data, device) {
    var msg = CloudNetworkMessage.deserialize(data)
    switch(msg.action) {
        case "ping":
            var authRecord = auth[msg.token]
            if (!authRecord)
                throw new Error("Invalid token")
            device.id = authRecord.id
            device.user = authRecord.user
            device.send(JSON.stringify({
                success: true,
                message: "Hello, " + device.id
            }))
            break
        case "data":
            var recipient = _.find(devices, function(device) {
                return device.id == msg.recipient
            })

            if (!recipient)
                throw new Error("Recipient not found:", msg.recipient)

            if (!device.id)
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
            onDataListener(data, device)
        } catch (error) {
            //console.log(error.stack)
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

var AuthServer = express()

AuthServer.use(express.bodyParser())

AuthServer.post('/auth', function(req, res, next) {
    var user   = req.body.user
    var passwd = req.body.password
    var device = req.body.device

    if (!user || !passwd || !device) {
        return next(new Error('Fields missing'))
    }

    var token = crypto.createHash('md5').update(device).digest('hex')

    auth[token] = {
        "id": device,
        "user": user
    }

    res.json({
        "success": true,
        "token": token
    })
})

AuthServer.get('/devices/:token', function(req, res, next) {
    var token = req.params.token
    var authRecord = auth[token]
    if (!authRecord) {
        return next(new Error('Not authed'))
    }
    var user_devices = _.where(devices, {
        user: authRecord.user
    })
    var response = _.map(user_devices, function(device) {
        return _.pick(device, 'id', 'name')
    })
    res.json(response)
})

AuthServer.use(function(err, req, res, next) {
    res.send(500, err.message)
})

module.exports = {
    'Device': Device,
    'CloudNetworkMessage': CloudNetworkMessage,
    'SocketServer': KdeConnectServerListener,
    'AuthServer': AuthServer,
    'devices': devices
}

