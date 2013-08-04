net = require 'net'
repl = require 'repl'

repl.start(
    prompt: 'UNO> '
    input:  process.stdin
    output: process.stdout
)

p = net.createServer (socket) ->

    repl.start(
        prompt: 'UNO> '
        input:  socket
        output: socket
    ).on 'exit', ->
        socket.end()

p.listen 8089