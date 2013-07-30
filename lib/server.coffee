express = require('express')
mongostore = require('connect-mongo')(express)
ioSession = require('socket.io-session')
app = express()

onlineUsers = {}

Server = global.Server = 
    
    Initialize: ->

        server = require('http').createServer app
        io = require('socket.io').listen server

        io.enable 'browser client minification'
        io.enable 'browser client etag'
        io.enable 'browser client gzip'
        #io.set 'log level', 1
        #io.set 'transports', ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']

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
            cookie:     { maxAge: Config.SessionMaxAge }
        
        io.set 'authorization', ioSession(express.cookieParser(Config.CookieSecret), memoryStore)
        io.sockets.on 'connection', io_socket_connect

        app.use middleware_request
        app.use express.compress()
        app.use require('express-minify')({cache: BaseDir + '/cache'})
        app.use express.static(BaseDir + '/public', {maxAge: Config.Expire})

        app.use express.errorHandler({ dumpExceptions: true, showStack: true })
        require(BaseDir + '/lib/router.coffee')(app)
        
        server.app = app
        server.listen Config.ListenPort

        console.log 'Server listening at port ' + Config.ListenPort

middleware_request = (req, res, next) ->

    res.locals.request = req
    res.locals.logined = if req.session? and req.session.logined? then req.session.logined else false
    
    next()

io_socket_connect = (socket) ->

    socket.on 'disconnect', io_socket_disconnect

    # 在线用户统计

    if typeof socket.handshake is 'undefined'
        return

    if typeof socket.handshake.session is 'undefined'
        return

    uid = socket.handshake.session.data._id

    if not onlineUsers[uid]?
        onlineUsers[uid] = 0

    onlineUsers[uid]++

io_socket_disconnect = ->

    socket = this

    if typeof socket.handshake is 'undefined'
        return

    if typeof socket.handshake.session is 'undefined'
        return

    uid = socket.handshake.session.data._id
    onlineUsers[uid]--

    if onlineUsers[uid] is 0
        delete onlineUsers[uid]
