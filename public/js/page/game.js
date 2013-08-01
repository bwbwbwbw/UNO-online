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
        var $button = $('<input type="button" class="button button-def role-start-game" value="开始游戏 （*＾ワ＾*）">');

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

    var cards = [];

    function gameHandler()
    {
        var socket = this;
        socket.on('/game/start', eh_game_start);
        socket.on('/game/turn', eh_game_turn);
    }

    function eh_game_start(data)
    {
        $('.module-stage').html('<div class="stage-card-area"></div><div class="stage-card-mine"></div>');
        $('.role-start-game').remove();

        for (var k in data.cards)
        {
            var card = data.cards[k];
            cards.push(card);
        }

        cards.sort(function(a, b)
        {
            if (a.color < b.color)
                return -1
            else if (a.color > b.color)
                return 1
            else
                if (a.number < b.number)
                    return -1
                else if (a.number > b.number)
                    return 1
                else
                    return 0
        });

        for (var k in cards)
        {

            $('<div class="card card-' + cards[k].color + '-' + cards[k].number + '"></div>')
                .css('opacity', 0)
                .appendTo('.stage-card-mine');
        }

        var intv = ($('.stage-card-mine').width() - 140 - 20) / (data.cards.length - 1);

        $('.stage-card-mine .card').each(function(index)
        {
            var card = $(this);

            setTimeout(function()
            {
                card.css('left', index * intv + 10);
                card.css('opacity', 1);
            }, 100* index);

        });
    }

    function eh_game_turn(data)
    {
        $('.module-room-users .indicator').removeClass('current next');
        $('.module-room-users [data-id="' + data.current_uid + '"] .indicator').addClass('current');
        $('.module-room-users [data-id="' + data.next_uid + '"] .indicator').addClass('next');

        if (data.current_uid == info.uid)
        {
            var $d = $('<div class="turn-indicator">Your turn!</div>').appendTo('body');
            setTimeout(function()
            {
                $d.addClass('show');
            }, 0);
        }
    }

    SocketIOReadyHandlers.push(gameHandler);

})(window);