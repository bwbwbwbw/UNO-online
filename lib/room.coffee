Room = global.Room = 
    
    RoomID: 0

    Info: {}

    Initialize: ->
        null
        # for i in [1..Config.Rooms]
        #     Info[i] = 
        #         Players:    {}
        #         Started:    false
        #         Data:       {}
        #         MaxPlayer:  
        #         Owner:      
    
    Create: (name, max) ->

        Room.RoomID++
        id = Room.RoomID

        Room.Info[id] = 

            Name:       name
            Max:        max
            Players:    []
            Started:    false

        Server.io.sockets.emit '/room/open', {id: id, name: name, max: max}

        id

    Join: (socket, id, callback) ->

        if not Room.Info[id]?
            callback 'RoomId invalid'
            return

        if Room.Info[id].Started
            callback '游戏已经开始了，您不能加入这个房间'
            return

        if Room.Info[id].Players.length is Room.Info[id].Max
            callback '房间已经人满了，您不能加入这个房间'
            return

        uid = socket.handshake.session.data._id.toString()

        for rec in Room.Info[id].Players
            if rec.uid is uid
                callback '您已经加入这个房间，不能再次加入'
                return

        Server.ClientEnter socket, 'room', {id: id}
        Room.Info[id].Players.push {socket: socket, uid: uid, nick: UID2Nick[uid]}

        for rec in Room.Info[id].Players
            rec.socket.emit '/room/user/join', {uid: uid, nick: UID2Nick[uid]}

        Server.io.sockets.emit '/room/update', {id: id, current: Room.Info[id].Players.length, started: Room.Info[id].Started}

        callback null

onClientLeaveRoom = (data) ->

    socket = @

    id = data.id
    uid = socket.handshake.session.data._id.toString()
    nick = socket.handshake.session.data.nick

    for rec, index in Room.Info[id].Players
        if rec.uid is uid
            Room.Info[id].Players.splice index, 1
            # break

    for rec in Room.Info[id].Players
        rec.socket.emit '/room/user/leave', {uid: uid, nick: nick}

    # No one in the room

    if Room.Info[id].Players.length is 0

        Room.Info[id] = null
        delete Room.Info[id]

        Server.io.sockets.emit '/room/close', {id: id}

    else

        Server.io.sockets.emit '/room/update', {id: id, current: Room.Info[id].Players.length, started: Room.Info[id].Started}

onServerReady = ->

    app = @
    app.post '/ajax/room/create', controller_room_create
    app.post '/ajax/rooms', controller_rooms

controller_rooms = (req, res) ->

    ret = []
    ret.push {id: id, name: room.Name, max: room.Max, current: room.Players.length, started: room.Started} for id, room of Room.Info

    res.write JSON.stringify ret
    res.end()

controller_room_create = (req, res) ->

    max = parseInt req.body.max
    if max < 2
        res.write JSON.stringify {errorMsg: '人数至少是2个', succeeded: false}
        res.end()

    rid = Room.Create req.body.name, max

    res.write JSON.stringify {id: rid}
    res.end()

onSocketIOReady = ->

    socket = @
    socket.on '/action/go/room', controller_goroom

controller_goroom = (data) ->

    socket = @
    Room.Join socket, data.id, (err) ->
        socket.emit '/result/join', err

ClientLeaveHandlers.room = onClientLeaveRoom
ServerReadyHandlers.push onServerReady
SocketIOReadyHandlers.push onSocketIOReady