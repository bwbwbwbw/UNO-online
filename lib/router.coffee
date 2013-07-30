site = require BaseDir + '/controllers/site.coffee'

module.exports = (app) ->
    
    app.get '/',        site.index
    app.get '/login',   site.login
    app.post '/login',  site.action_login
    app.post '/reg',    site.action_reg