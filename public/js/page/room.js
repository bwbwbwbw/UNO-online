(function(window, undefined)
{

    var room_state;

    //OP =======================================
    window.onRoomEnter = function(rid)
    {
        room_state =
        {
            rid: rid,
            isOP: false,
            isStarted: false
        };
    }

    window.onRoomGetDetail = function(data)
    {
        if (room_state.isOP)
            return;

        if (data.players[0].uid == info.uid)
        {
            room_state.isOP = true;
            append_start_button();
        }
    }

    window.onRoomUserLeave = function()
    {
        if (room_state.isOP)
            return;
        
        if ($('.module-room-users .li:eq(0)').attr('data-id') == info.uid)
        {
            room_state.isOP = true;
            append_start_button();
        }
    }

    //==========================================

    function append_start_button()
    {
        var $button = $('<input type="button" class="button button-def" value="开始游戏 （*＾ワ＾*）">');

        $button.click(function()
        {
            if ($('.module-room-users .li').length < 2)
            {
                alert('2人或以上才可以开始游戏 ( ´ ▽ ` )ﾉ ');
                return;
            }

            action_start_game();
        });

        $button.appendTo('.page-room .role-room-title')
        $('.module-stage').text('快开始游戏吧 >_<');
    }

    function action_start_game()
    {
        vj.ajax({

            action: 'room/start',
            data:   {id: room_state.rid}

        });
    }

    //==========================================

})(window);