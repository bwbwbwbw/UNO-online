express = require('express')
mongostore = require('connect-mongo')(express)
ioSession = require('socket.io-session')
app = express()
io = null

onlineUsers = {}

Server = global.Server = 
    
    SocketID: 0

    Initialize: ->

        server = require('http').createServer app
        io = require('socket.io').listen server


        # expose to global
        Server.app = app
        Server.onlineUsers = onlineUsers
        Server.io = io


        # Initialize express
        app.set 'views', BaseDir + '/views'
        app.set 'view engine', 'ejs'
        app.locals Config.LocalVariables
        app.locals
            open:   '<%'
            close:  '%>'
            layout: true
        
        app.use require('express-partials')()
        app.use express.bodyParser()
        app.use express.cookieParser()

        memoryStore = new mongostore Config.DB

        app.use express.session
            secret:     Config.CookieSecret
            store:      memoryStore
        
        app.use middleware_request
        app.use express.compress()
        app.use require('express-minify')({cache: BaseDir + '/cache'})
        app.use express.static(BaseDir + '/public', {maxAge: Config.Expire})


        # Initialize socket.io
        #io.enable 'browser client minification'
        #io.enable 'browser client etag'
        #io.enable 'browser client gzip'
        #io.set 'log level', 1
        io.set 'transports', ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']
        io.set 'authorization', ioSession(express.cookieParser(Config.CookieSecret), memoryStore)
        io.sockets.on 'connection', io_socket_connect


        app.use express.errorHandler({ dumpExceptions: true, showStack: true })
        ServerReadyHandlers.forEach (func) ->
            func.call app
        

        server.listen Config.ListenPort

        console.log 'Server listening at port ' + Config.ListenPort

    RequireLogin: (req, res, next) ->

        if req.session? and req.session.logined?
            next()
            return
        
        res.write JSON.stringify {errorMsg: 'Login required', succeeded: false}
        res.end()

    ClientEnter: (socket, action, data) ->

        if socket._action? && ClientLeaveHandlers[socket._action]?
            ClientLeaveHandlers[socket._action].call socket, socket._data

        socket._action = action
        socket._data = data

middleware_request = (req, res, next) ->

    if req.session? and req.session.logined?
        res.locals.uid = req.session.uid
        res.locals.user = req.session.user
        res.locals.nick = req.session.nick
        res.locals.data = req.session.data
        res.locals.logined = true

    res.locals.request = req

    next()

io_socket_connect = (socket) ->

    Server.SocketID++
    socket._id = Server.SocketID

    # Bind event handlers
    socket.on 'disconnect', io_socket_disconnect
    SocketIOReadyHandlers.forEach (func) ->
        func.call socket

    # Socket status
    Server.ClientEnter socket, 'index'

    # Online users
    if typeof socket.handshake is 'undefined'
        return

    if typeof socket.handshake.session is 'undefined'
        return

    uid = socket.handshake.session.data._id.toString()

    # First time
    if not onlineUsers[uid]?
        onlineUsers[uid] = 0
        io.sockets.emit '/user/join', {uid: uid, nick: UID2Nick[uid]}

    onlineUsers[uid]++

io_socket_disconnect = ->

    socket = this

    # Change status
    Server.ClientEnter socket, 'offline'

    # Online users
    if typeof socket.handshake is 'undefined'
        return

    if typeof socket.handshake.session is 'undefined'
        return

    uid = socket.handshake.session.data._id.toString()
    onlineUsers[uid]--

    if onlineUsers[uid] is 0
        delete onlineUsers[uid]
        Server.io.sockets.emit '/user/leave', {uid: uid, nick: UID2Nick[uid]}

##########################################################################

onServerReady = ->

    app = @
    app.get '/', controller_index
    app.post '/ajax/online_users', controller_onlines

onSocketIOReady = ->

    socket = @
    socket.on '/action/go/home', controller_gohome

controller_gohome = (data) ->

    socket = @
    Server.ClientEnter socket, 'index'

controller_index = (req, res) ->

    if not req.session.logined
        res.redirect '/login'
    else
        res.render 'index', {title: 'Hello'}

controller_onlines = (req, res) ->

    ret = []
    ret.push {uid: uid, nick: UID2Nick[uid]} for uid, _ of onlineUsers

    res.write JSON.stringify ret
    res.end()

ServerReadyHandlers.push onServerReady
SocketIOReadyHandlers.push onSocketIOReady