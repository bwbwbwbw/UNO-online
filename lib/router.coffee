site = require BaseDir + '/controllers/site.coffee'

module.exports = (app) ->
    
    app.get '/',                site.index
    app.get '/login',           site.login
    app.post '/ajax/login',     site.action_login
    app.post '/ajax/reg',       site.action_reg