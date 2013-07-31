crypto = require 'crypto'

User = global.User = 
    
    _idx: 0

    Login:  (user, pass, req, callback) ->

        Database.db.collection('user').findOne {user:user}, (err, u) ->

            if u is null

                callback '该用户未找到'
                return

            if (u.pass is User.MakeHash(pass, u.salt))

                req.session.uid = u._id
                req.session.user = u.user
                req.session.nick = u.nick
                req.session.data = u
                req.session.logined = true

                callback null, u

            else

                callback '用户名或密码错误'

    Reg:    (user, nick, pass, req, callback) ->

        User._idx++

        salt = crypto
            .createHash('sha256')
            .update((new Date().getTime() + Math.random() * 10000 + User._idx).toString())
            .digest('hex')

        pass2 = User.MakeHash pass, salt

        Database.db.collection('user').findOne {user:user}, (err, u) ->

            if u

                callback '该用户名已存在'

            Database.db.collection('user').insert {

                user:   user
                pass:   pass2
                salt:   salt
                nick:   nick
                win:    0
                lost:   0
                regtime:new Date().getTime()

            }, (err, result) ->

                UID2Nick[result._id.toString()] = nick

                User.Login user, pass, req, ->

                    callback null

    MakeHash: (pass, salt) ->

        pass = pass.toString()
        salt = salt.toString()

        s = crypto.createHash('sha256').update(pass).digest('hex')
        s = crypto.createHash('sha256').update(s + salt).digest('hex')
        crypto.createHash('sha256').update(s).digest('hex')

##########################################################################

onServerReady = ->

    app = @
    app.get '/login',           controller_login
    app.post '/ajax/login',     controller_action_login
    app.post '/ajax/reg',       controller_action_reg

controller_login = (req, res) ->

    res.render 'login', {title: '登录/注册'}

controller_action_login = (req, res) ->

    User.Login req.body.user, req.body.pass, req, (err, user) ->

        if err

            res.write JSON.stringify {errorMsg: err, succeeded: false}
            res.end()

        else

            res.write JSON.stringify {}
            res.end()

controller_action_reg = (req, res) ->

    User.Reg req.body.user, req.body.nick, req.body.pass, req, (err, _) ->

        if err

            res.write JSON.stringify {errorMsg: err, succeeded: false}
            res.end()

        else

            res.write JSON.stringify {}
            res.end()

ServerReadyHandlers.push onServerReady
