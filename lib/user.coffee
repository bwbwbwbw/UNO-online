User = global.User = 
    
    _idx: 0

    Login:  (user, pass, req, callback) ->

        Database.db.collection('user').findOne {user:user}, (err, u) ->

            if err

                callback '该用户未找到'
                return

            if (u.pass is User.MakeHash(pass, u.salt))

                req.session.uid = u._id
                req.session.user = u.user
                req.session.nick = u.nick
                req.session.data = u

                callback null, u

            else

                callback '用户名或密码错误'

    Reg:    (user, nick, pass, req, callback) ->

        User._idx++

        salt = require 'crypto'
            .createHash 'sha256'
            .update new Date().getTime() + Math.random() * 10000 + User._idx
            .digest 'hex'

        pass2 = User.MakeHash pass, salt

        Database.db.collection('user').findOne {user:user}, (err, u) ->

            if not err
                
                callback '该用户名已存在'

            Database.db.collection('user').insert {

                user:   user,
                pass:   pass2,
                salt:   salt,
                nick:   nick

            }, ->

                User.Login user, pass, req, ->

                    callback null

    MakeHash: (pass, salt) ->

        crypto = require 'crypto'
        shasum = crypto.createHash 'sha256'
        shasum.update pass
        shasum.update shasum.digest('hex') + salt
        shasum.update shasum.digest('hex')
        shasum.digest 'hex'