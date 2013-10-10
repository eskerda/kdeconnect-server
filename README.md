KDEConnect Server
=====
Implements a socket server to interconnect KDEConnect clients through the
Internet, to be used when there's no visibility on the local network.

Devices must authenticate and get a list of connected (and owned) devices on an
HTTP instance, and must connect to the server using a socket connection.

The workflow is as follows:

 1. Device authenticates into /auth and receives a token
 2. Device gets a list of owned devices into /devices/token
 3. Device connects to the socket server, and pings the server
 4. Device can send data to any other owned device connected to the socket
 server

## Completion status
For now this is just a **prototype** to test ideas out. No proper
authentication is being done on the auth server, nor token generation is to be
taken seriously, as it is just an md5 hash generated with the device id. So
next steps would be:

 1. Use proper auth, at least Digest Access Auth
 2. Store devices and authed devices somewhere permanent / semipermanent:
    database + redis
 3. Decide if each socket message should be tokenized, or even if it's ok to
    ask for an initial ping on the socket.
 4. ??

##Usage (testing)
###Install
    git clone <this_repo>
    cd this_repo
    npm install
###Startup
    $ node app.js
    KdeConnect server listening on 3000
    Auth server listening on 3030
###Auth
    $ curl localhost:3030/auth -d "user=foo&password=bar&device=foodevice"
    {
        "success": true,
        "token": <foo_token>
    }
###Socket connection
    $ nc localhost 3000
    {"action": "ping", "token": <foo_token>}
    {"sucess":true,"message":"Hello, foodevice"}
###Devices
    $ curl localhost:3030/devices/<foo_token>
    [
        {
            "id": "foodevice"
        }
    ]
### Data sending between devices
#### Authenticate foo and bar
    $ curl localhost:3030/auth -d "user=foo&password=bar&device=foodevice"
    {
        "success": true,
        "token": <foo_token>
    }
    $ curl localhost:3030/auth -d "user=foo&password=bar&device=bardevice"
    {
        "success": true,
        "token": <bar_token>
    }
#### Get a list of devices for foo
    $ curl localhost:3030/devices/<foo_token>
    [
        {
            "id": "foodevice"
        },
        {
            "id: "bardevice"
        }
    ]
#### Connect, and send something to bar
    $ nc localhost 3000
    {"action":"ping","token":"6071ab17ccb0c33923db1f3c3f90abfe"}
    {"success":"true","message":"Hello, foodevice"}
    {"action":"data","recipient":"bardevice","data":"bleh"}
#### Connect, and receive from foo
    $ nc localhost 3000
    {"action":"ping","token":<bar_token>}
    ...
    bleh

