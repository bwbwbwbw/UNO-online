mongoskin = require 'mongoskin'

Database = global.Database = 
    
    Initialize: ->

        Database.db = mongoskin.db(
            'mongo://' + 
            Config.DB.username + ':' + Config.DB.password + '@' + 
            Config.DB.host + '/' + Config.DB.db + 
            '?auto_reconnect'
        )

        Database.db.collection('user').find().toArray (err, users)->

            users.forEach (user) ->

                UID2Nick[user._id.toString()] = user.nick
