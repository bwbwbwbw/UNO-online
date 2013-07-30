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

            res.write JSON.stringify {errorMsg: err, succeeded: false}
            res.end()

        else

            res.write JSON.stringify {user: user}
            res.end()

exports.action_reg = (req, res) ->

    User.Reg req.body.user, req.body.nick, req.body.pass, req, (err, _) ->

        if err

            res.write JSON.stringify {errorMsg: err, succeeded: false}
            res.end()

        else

            res.write JSON.stringify {}
            res.end()