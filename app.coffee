global.BaseDir = __dirname

require './config.coffee'

require './lib/database.coffee'
require './lib/server.coffee'

Database.Initialize()
Server.Initialize()