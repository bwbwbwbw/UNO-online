(function(window, undefined)
{
    window.SocketIOReadyHandlers = [];

    if (info.logined)
    {
        var socket = null;

        $(document).ready(function()
        {
            socket = io.connect();

            socket.on('connect', function()
            {

                for (var i in SocketIOReadyHandlers)
                {
                    SocketIOReadyHandlers[i].call(socket);
                }

            });
        });
    }
})(window);