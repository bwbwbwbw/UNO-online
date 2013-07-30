mongoskin = require 'mongoskin'

Database = global.Database = 
    
    Initialize: ->

        Database.db = mongoskin.db(
            'mongo://' + 
            Config.DB.username + ':' + Config.DB.password + '@' + 
            Config.DB.host + '/' + Config.DB.db + 
            '?auto_reconnect'
        )