global.BaseDir = __dirname
global.moment = require 'moment'

require './config.coffee'

require './lib/database.coffee'
require './lib/server.coffee'

require './lib/user.coffee'

global.logs = []
global.log = (msg) ->
    dt = moment().format 'MMMM Do YYYY, hh:mm:ss'
    
    console.log "[#{dt}] #{msg}"
    logs.push "[#{dt}] #{msg}"


global.dumpError = (err) ->
    
    log 'ERROR: ' + err.message
    log err.stack

process.on 'uncaughtException', global.dumpError

Database.Initialize()
Server.Initialize()