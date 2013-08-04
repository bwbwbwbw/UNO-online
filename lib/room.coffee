Room = global.Room = 
    
    RoomID: 0

    Info: {}

    Initialize: ->

        null 
    
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
            callback '游戏已经开始了，您不能加入这个房间 ㄟ( ▔, ▔ )ㄏ'
            return

        if Room.Info[id].Players.length is Room.Info[id].Max
            callback '房间已经人满了，您不能加入这个房间 (￣▽￣)'
            return

        uid = socket.handshake.session.data._id.toString()

        for rec in Room.Info[id].Players
            if rec.uid is uid
                callback '您已经加入这个房间，不能再次加入 ╮(╯▽╰)╭'
                return

        # Broadcast join message
        for rec in Room.Info[id].Players
            rec.socket.emit '/room/user/join', {uid: uid, nick: UID2Nick[uid]}

        # Client join
        Server.ClientEnter socket, 'room', {id: id}
        Room.Info[id].Players.push {socket: socket, uid: uid, nick: UID2Nick[uid]}

        Server.io.sockets.emit '/room/update', {id: id, current: Room.Info[id].Players.length, max: Room.Info[id].Max, started: Room.Info[id].Started}

        callback null

    Start: (id) ->

        return if Room.Info[id].Started

        Room.Info[id].Started = true
        Server.io.sockets.emit '/room/update', {id: id, current: Room.Info[id].Players.length, max: Room.Info[id].Max, started: Room.Info[id].Started}

        Game.Start id

onClientLeaveRoom = (data) ->

    socket = @

    id = data.id
    uid = socket.handshake.session.data._id.toString()
    nick = socket.handshake.session.data.nick

    for rec, index in Room.Info[id].Players by -1
        if rec.uid is uid
            Room.Info[id].Players.splice index, 1
            # break

    for rec in Room.Info[id].Players
        rec.socket.emit '/room/user/leave', {uid: uid, nick: nick}

    if Room.Info[id].Players.length is 0

        # No one in the room

        Room.Info[id] = null
        delete Room.Info[id]

        Server.io.sockets.emit '/room/close', {id: id}

    else

        Server.io.sockets.emit '/room/update', {id: id, current: Room.Info[id].Players.length, max: Room.Info[id].Max, started: Room.Info[id].Started}

onServerReady = ->

    app = @
    app.post '/ajax/room/create', Server.RequireLogin, controller_room_create
    app.post '/ajax/room/detail', Server.RequireLogin, controller_room_detail
    app.post '/ajax/room/start', Server.RequireLogin, controller_room_start
    app.post '/ajax/room/chat', Server.RequireLogin, controller_room_chat
    app.post '/ajax/rooms', controller_rooms

controller_room_chat = (req, res) ->

    if req.body.text > 1000
        res.write JSON.stringify {}
        res.end()
        return

    for _player in Room.Info[req.body.rid].Players
        _player.socket.emit '/room/chat', {nick: req.session.nick, text: req.body.text}

    res.write JSON.stringify {}
    res.end()


controller_rooms = (req, res) ->

    ret = []
    ret.push {id: id, name: room.Name, max: room.Max, current: room.Players.length, started: room.Started} for id, room of Room.Info

    res.write JSON.stringify ret
    res.end()

controller_room_start = (req, res) ->

    rid = req.body.id
    uid = req.session.uid

    if Room.Info[rid].Players[0].uid isnt uid
        res.write JSON.stringify {errorMsg: '喂喂你不是OP啊！', succeeded: false}
        res.end()
        return

    if Room.Info[rid].Players.length < 2
        res.write JSON.stringify {errorMsg: '2人或以上才可以开始 >_<', succeeded: false}
        res.end()
        return

    if Room.Info[rid].Started
        res.write JSON.stringify {errorMsg: '游戏已经开始了 0.0 乃在做什么', succeeded: false}
        res.end()
        return

    Room.Start rid
    res.write JSON.stringify {}
    res.end()

controller_room_detail = (req, res) ->

    id = req.body.id

    players = []
    for player in Room.Info[id].Players
        players.push {uid: player.uid, nick: player.nick}

    ret = 
        id: id
        name: Room.Info[id].Name
        max: Room.Info[id].Max
        current: Room.Info[id].Players.length
        started: Room.Info[id].Started
        players: players

    res.write JSON.stringify ret
    res.end()

controller_room_create = (req, res) ->

    max = parseInt req.body.max
    if max < 2
        res.write JSON.stringify {errorMsg: '人数至少是2个', succeeded: false}
        res.end()
        return

    rid = Room.Create req.body.name, max

    res.write JSON.stringify {id: rid}
    res.end()

onSocketIOReady = ->

    socket = @
    socket.on '/action/go/room', controller_goroom

controller_goroom = (data) ->

    socket = @
    Room.Join socket, data.id, (err) ->
        socket.emit '/result/join', {err: err, rid: data.id}

ClientLeaveHandlers.room = onClientLeaveRoom
ServerReadyHandlers.push onServerReady
SocketIOReadyHandlers.push onSocketIOReady