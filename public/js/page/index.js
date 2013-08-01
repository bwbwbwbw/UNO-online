(function(window, undefined)
{

    var TEMPLATE_SPLASH = '<div id="jSplash"><div id="ball"></div><div id="ball-0"></div><div id="ball-1"></div></div>';
    var TEMPLATE_PAGE_ROOM = '';
    
    function action_go_home()
    {
        $('.home-page-item').hide();
        $('.page-index').fadeIn(300);

        _socket.emit('/action/go/home', {id: rid});
    }

    var join_splash;

    function action_join_room(rid)
    {
        var $splash = $(TEMPLATE_SPLASH);
        $splash.appendTo('body');

        join_splash = $splash;

        _socket.emit('/action/go/room', {id: rid});
    }

    function action_join_room_callback(data)
    {
        
        if (data.err)
        {
            alert(data.err);

            join_splash.fadeOut(500, function()
            {
                $(this).remove();
                join_splash = null;
            });

            return;
        }

        rid = data.rid
        window.onRoomEnter(rid);        
        //==================================================
        //Clear and initialize

        var $room = $('.page-room');
        $room.html(TEMPLATE_PAGE_ROOM);

        vj.ajax({

            action: 'room/detail',
            data:   {id: rid},

            onSuccess: function(d)
            {
                $room.find('.role-room-title').text(d.name);

                $('<input class="button" type="button" value="退出房间">')
                    .click(function()
                    {
                        if (confirm('您确定要退出房间吗? Ψ(｀▽´)Ψ'))
                            action_go_home();
                    })
                    .appendTo('.role-room-title', $room);

                document.title = d.name + ' - UNOOnline'

                for (var i in d.players)
                    room_join(d.players[i].uid, d.players[i].nick);

                $('.module-room-users .li').eq(0).addClass('highlight');

                window.onRoomGetDetail(d);
            }

        });

        //==================================================

        $('.page-index').hide();

        $('.page-room').fadeIn(500);
        join_splash.fadeOut(500, function()
        {
            $(this).remove();
            join_splash = null;
        });
    }

    function room_join(uid, nick)
    {
        var $user = $('.module-room-users .li[data-id="' + uid + '"]');

        if ($user.length > 0)
            return;

        var $li = $('<div class="li" data-id="' + uid + '"></div>');
        $li.text(nick).hide().appendTo('.module-room-users .module-content');

        setTimeout(function()
        {
            $li.fadeIn(200);
        }, 0);
    }

    function room_leave(uid)
    {
        var $user = $('.module-room-users .li[data-id="' + uid + '"]');

        if ($user.length == 0)
            return;

        $user.fadeOut(200, function()
        {
            $(this).remove();
            $('.module-room-users .li').removeClass('highlight').eq(0).addClass('highlight');
            window.onRoomUserLeave();
        });
    }

    function room_update(rid, current, max, started)
    {
        var $room = $('.module-rooms .li[data-id="' + rid + '"]');

        if ($room.length == 0)
            return;

        $room.find('.max').text(current + ' / ' + max);

        if (started)
            $room.addClass('disabled');
    }

    function room_open(rid, name, max, current, started)
    {
        var $room = $('.module-rooms .li[data-id="' + rid + '"]');

        if ($room.length > 0)
            return;

        var $li = $('<div class="li" data-id="' + rid + '"><div class="name"></div><div class="max"></div><div class="clear"></div></div>');
        $li.find('.name').text(name);
        $li.find('.max').text(current + ' / ' + max);

        if (started)
            $li.addClass('disabled');

        $li.click(function()
        {
            if ($(this).hasClass('disabled'))
                return;
            
            action_join_room(rid);
        });
        $li.hide().appendTo('.module-rooms .module-content');

        setTimeout(function()
        {
            $li.fadeIn(200);
        }, 0);
    }

    function room_close(rid)
    {
        var $room = $('.module-rooms .li[data-id="' + rid + '"]');

        if ($room.length == 0)
            return;

        $room.fadeOut(200, function()
        {
            $(this).remove();
        });
    }

    function user_join(uid, nick)
    {
        var $user = $('.module-online-users .li[data-id="' + uid + '"]');

        if ($user.length > 0)
            return;

        var $li = $('<div class="li" data-id="' + uid + '"></div>');
        $li.text(nick).hide().appendTo('.module-online-users .module-content');

        if (uid == info.uid)
            $li.addClass('highlight');

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

    function onlineUserUpdater()
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

    function roomUpdater()
    {
        var socket = this;
        socket.on('/room/open', function(data)
        {
            room_open(data.id, data.name, data.max, 1, false);
        });

        socket.on('/room/update', function(data)
        {
            room_update(data.id, data.current, data.max, data.started);
        });

        socket.on('/room/close', function(data)
        {
            room_close(data.id);
        });

        socket.on('/room/user/join', function(data)
        {
            room_join(data.uid, data.nick);
        });

        socket.on('/room/user/leave', function(data)
        {
            room_leave(data.uid);
        });

        socket.on('/result/join', action_join_room_callback);

        vj.ajax({

            action: 'rooms',

            onSuccess: function(d)
            {
                for (var i in d)
                {
                    room_open(d[i].id, d[i].name, d[i].max, d[i].current, d[i].started)
                }
            }

        });
    }

    function contentPrepare()
    {
        $('.page-index').fadeIn(500);
    }

    SocketIOReadyHandlers.push(onlineUserUpdater);
    SocketIOReadyHandlers.push(roomUpdater);
    SocketIOReadyHandlers.push(contentPrepare);

    $(document).ready(function()
    {
        TEMPLATE_PAGE_ROOM = $('.page-room').html();

        $('.role-show-create-room').click(function()
        {
            $('.role-create-room-wrapper').fadeIn(200);
            $('.role-create-room-name').focus();
        });

        $('.role-create-room-button').click(function()
        {
            var max = parseInt($('.role-create-room-max').val());
            $('.role-create-room-max').val( max );

            if (max < 2)
            {
                alert('人数至少为2人');
                return;
            }

            vj.ajax({

                action:     'room/create',
                data:       {

                    name:   $('.role-create-room-name').val(),
                    max:    max

                },

                onSuccess:  function(data)
                {
                    $('.role-create-room-name').val('');
                    $('.role-create-room-max').val('10');
                    $('.role-create-room-wrapper').fadeOut(100);

                    action_join_room(data.id);
                },

                onFailure: function(d)
                {
                    alert(d.errorMsg);
                },

                onError: function(d)
                {
                    alert('网络错误');
                }

            })
        });
    
    /*
    var colors = 'green red yello blue'.split(' ');
    var numbers = '1 2 3 4 5 6 7 8 9 0 empty forbid reverse plus2'.split(' ');

    for (var c in colors)
    {
        for (var n in numbers)
        {
            $('body').append('<div class="card card-' + colors[c] + '-' + numbers[n] + '">' + colors[c] + '-' + numbers[n] + '</div>');
        }
    }
    */
    
    });

})(window);