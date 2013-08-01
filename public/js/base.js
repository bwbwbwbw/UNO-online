(function(window, undefined)
{
    window.SocketIOReadyHandlers = [];

    if (info.logined)
    {
        var socket = window._socket = null;

        $(document).ready(function()
        {
            socket = window._socket = io.connect();

            socket.on('connect', function()
            {

                for (var i in SocketIOReadyHandlers)
                {
                    SocketIOReadyHandlers[i].call(socket);
                }

                var splash = $('#jSplash');

                if (splash.length > 0)
                {
                    splash.fadeOut(1000, function()
                    {
                        $(this).remove();
                    });
                }

            });
        });
    }
})(window);