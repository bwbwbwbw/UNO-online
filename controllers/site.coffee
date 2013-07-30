exports.index = (req, res) ->

    if (!req.session.logined)

        res.redirect '/login'

    else

        res.render 'index', {title: 'Hello'}

exports.login = (req, res) ->

    res.render 'login', {title: '登录/注册'}

exports.action_login = (req, res) ->

    User.Login req.body.user, req.body.pass, req, (err, user) ->

        if err

            res.send JSON.stringify {errMsg: err, succeeded: false}

        else

            res.send JSON.stringify {user: user}

exports.action_reg = (req, res) ->

    User.Reg req.body.user, req.body.nick, req.body.pass, req, (err, _) ->

        if err

            res.send JSON.stringify {errMsg: err, succeeded: false}

        else

            res.send JSON.stringify {}