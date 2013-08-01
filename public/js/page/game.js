(function(window, undefined)
{
    var card_uniqid = 0;

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

    window.onRoomLeave = function()
    {
        $('.turn-indicator').remove();
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

    var cards;

    function gameHandler()
    {
        var socket = this;
        socket.on('/game/start', eh_game_start);
        socket.on('/game/turn', eh_game_turn);
    }

    function eh_game_start(data)
    {
        cards = [];

        $('.module-stage').html('<div class="stage-card-area"></div><div class="stage-card-mine"></div>');
        $('.role-start-game').remove();

        room_state.isStarted = true;

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
            card_uniqid++;

            cards[k].uniqid = card_uniqid;
            cards[k].dom = $('<div class="card card-' + cards[k].color + '-' + cards[k].number + '" data-color="' + cards[k].color + '" data-number="' + cards[k].number + '" data-cardid="' + card_uniqid + '"></div>')
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
                card.css('opacity', 0.9);
            }, 100* index);

        });

        //Event handlers
        $('.stage-card-mine').on('click', '.card', function()
        {
            if ($(this).hasClass('selected'))
            {
                $(this).removeClass('selected');
                $(this).css('opacity', 0.9);
                return;
            }
            
            $('.stage-card-mine .selected').removeClass('selected');
                
            //Select similar
            var color = $(this).attr('data-color');
            var number = $(this).attr('data-number');

            $('.stage-card-mine .card').each(function()
            {
                if ($(this).attr('data-color') == color && $(this).attr('data-number') == number)
                    $(this).addClass('selected').css('opacity', 1);
            });
            
        });
    }

    function action_playcard()
    {
        var selected = $('.stage-card-mine .selected');

        if (room_state.isStarted && selected.length > 0)
        {

            var color = selected.attr('data-color');
            var number = selected.attr('data-number');
            var count = selected.length;

            vj.ajax({

                action: 'game/play',
                data:   {rid: room_state.rid, uid: info.uid, card: {color: color, number: number}, count: count, extea: null},
                onSuccess: function(d)
                {
                    if (d !== true)
                    {
                        alert(d);
                        return;
                    }

                    var selected_card_id = {};

                    //出牌成功
                    $('.stage-card-mine .selected').each(function()
                    {
                        selected_card_id[$(this).attr('data-cardid')] = true;
                        $(this).css('opacity', 0);
                    });

                    setTimeout(function()
                    {

                        //Remove card

                        for (var k = cards.length - 1; k>=0; k--)
                        {
                            if (selected_card_id[cards[k].uniqid])
                            {
                                cards[k].dom.remove();
                                cards[k].dom = null;
                                cards.splice(k, 1);
                            }
                        }

                        //Re-arrange
                        var intv = ($('.stage-card-mine').width() - 140 - 20) / (cards.length - 1);

                        $('.stage-card-mine .card').each(function(index)
                        {
                            var card = $(this);

                            setTimeout(function()
                            {
                                card.css('left', index * intv + 10);
                            }, 50* index);

                        });


                    }, 500);

                }

            });

        }
    }

    function eh_game_turn(data)
    {
        $('.turn-indicator').remove();

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

    $(document).ready(function()
    {
        $(document).keypress(function(e)
        {
            var tag = e.target.tagName.toLowerCase();
            if ( e.which === 32 && tag != 'input' && tag != 'textarea') 
            {

                action_playcard();
                
            }
        });
    });

    SocketIOReadyHandlers.push(gameHandler);

})(window);