(function(window, undefined)
{

    function user_join(uid, nick)
    {
        user_leave(uid);
        
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
        $('.module-online-users .li[data-id="' + uid + '"]').fadeOut(200, function()
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
        socket.on('/user/join', function(uid, nick)
        {
            user_join(uid, nick);
        });

        socket.on('/user/leave', function(uid)
        {
            user_leave(uid);
        });
    }

    SocketIOReadyHandlers.push(queryOnlineUsers);
    SocketIOReadyHandlers.push(joinLeaveUpdater);

    $(document).ready(function()
    {
        
    });

})(window);