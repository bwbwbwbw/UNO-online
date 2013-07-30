express = require('express')
mongostore = require('connect-mongo')(express)
app = express()

Server = global.Server = 
    
    Initialize: ->

        server = require('http').createServer app
        io = require('socket.io').listen server

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

        app.use express.session
            secret:     Config.CookieSecret
            store:      new mongostore Config.DB
            cookie:     { maxAge: Config.SessionMaxAge }
        
        app.use express.compress()
        app.use require('express-minify')({cache: BaseDir + '/cache'})
        app.use express.static(BaseDir + '/public', {maxAge: Config.Expire})

        app.use express.errorHandler({ dumpExceptions: true, showStack: true })
        require(BaseDir + '/lib/router.coffee')(app)
        
        server.app = app
        server.listen Config.ListenPort

        console.log 'Server listening at port ' + Config.ListenPort