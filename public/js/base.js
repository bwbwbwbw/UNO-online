(function(window, undefined)
{
    if (info.logined)
    {
        var socket = null;

        $(document).ready(function()
        {
            socket = io.connect();

            socket.on('news', function (data)
            {
                console.log(data);
                socket.emit('my other event', { my: 'data' });
            });
        });
    }
})(window);