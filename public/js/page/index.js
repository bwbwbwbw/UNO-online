(function(window, undefined)
{

    function user_join(uid, nick)
    {
        var $user = $('.module-online-users .li[data-id="' + uid + '"]');

        if ($user.length > 0)
            return;

        var $li = $('<div class="li" data-id="' + uid + '"></div>');
        $li.text(nick).hide();

        $('.module-online-users .module-content').append($li);

        setTimeout(function()
        {
            $li.fadeIn(200);
        }, 0);
    }

    function user_leave(uid)
    {
        var $user = $('.module-online-users .li[data-id="' + uid + '"]');

        if ($user.length == 0)
            return;

        $user.fadeOut(200, function()
        {
            $(this).remove();
        });
    }

    function queryOnlineUsers()
    {

        vj.ajax({

            action: 'online_users',

            onSuccess: function(d)
            {
                for (var i in d)
                {
                    user_join(d[i].uid, d[i].nick);
                }
            }

        });

    }

    function joinLeaveUpdater()
    {
        var socket = this;
        socket.on('/user/join', function(data)
        {
            user_join(data.uid, data.nick);
        });

        socket.on('/user/leave', function(data)
        {
            user_leave(data.uid);
        });
    }

    SocketIOReadyHandlers.push(queryOnlineUsers);
    SocketIOReadyHandlers.push(joinLeaveUpdater);

    $(document).ready(function()
    {
        
    });

})(window);