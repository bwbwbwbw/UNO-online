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

    var hide_timeout = null;

    var last_notice_bar;

    function noticebar_show(content)
    {
        var $b = $('<div class="notice-bar"><div class="notice-content"></div></div>');
        $b.prependTo('.page-room');

        $b.find('.notice-content').text(content);

        if (hide_timeout != null)
        {
            clearTimeout(hide_timeout);
            noticebar_hide();
        }

        setTimeout(function()
        {
            $b.addClass('show');
        });

        last_notice_bar = $b;

        hide_timeout = setTimeout(noticebar_hide, 1000);
    }

    function noticebar_hide()
    {
        var bar = last_notice_bar;
        bar.removeClass('show');
        setTimeout(function()
        {
            bar.remove();
            bar = null;
        }, 1000);
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
            cards[k].dom = $('<div class="card-wrapper hide" data-color="{color}" data-number="{number}" data-cardid="{uniqid}"><div class="card card-{color}-{number}"></div></div>'.format(cards[k])).appendTo('.stage-card-mine');
        }

        setTimeout(function()
        {
            $('.stage-card-mine .card-wrapper').removeClass('hide');
        }, 0);

        rearrange_card_dom();

        //Event handlers
        $('.stage-card-mine').on('click', '.card-wrapper', eh_on_card_click);
    }

    function eh_on_card_click()
    {
        if ($(this).hasClass('selected'))
        {
            $(this).removeClass('selected');
            return;
        }
        
        $('.stage-card-mine .selected').removeClass('selected');
            
        //Select similar
        var color = $(this).attr('data-color');
        var number = $(this).attr('data-number');

        //如果是+4、+2、禁、换色，则默认不多选
        if (number == 'plus2' || number == 'plus4' || number == 'forbid' || number == 'changecolor')
        {
            $(this).addClass('selected');
            return;
        }

        $('.stage-card-mine .card-wrapper').each(function()
        {
            if ($(this).attr('data-color') == color && $(this).attr('data-number') == number)
                $(this).addClass('selected');
        });
        
    }

    function rearrange_card_dom()
    {
        var intv = ($('.stage-card-mine').width() - 140 - 20) / (cards.length - 1);

        $('.stage-card-mine .card-wrapper').each(function(index)
        {
            var card = $(this);

            setTimeout(function()
            {
                card.css('left', index * intv + 10);
            }, 50* index);

        });
    }

    function action_playcard(extra)
    {
        if ($('.color-select').length > 0 && extra == undefined)
            return;

        var selected = $('.stage-card-mine .selected');

        if (room_state.isStarted && selected.length > 0)
        {

            var color = selected.attr('data-color');
            var number = selected.attr('data-number');
            var count = selected.length;

            //弹窗给玩家选择颜色
            if ((number == 'plus4' || number == 'changecolor') && extra == undefined)
            {

                var colors = ['red', 'green', 'yello', 'blue'];
                var $selector = $('<div class="color-select"></div>');
                
                for (var k in colors)
                {
                    $('<div class="color color-' + colors[k] + '" data-color="' + colors[k] + '"></div>')
                    .click(function()
                    {
                        action_playcard($(this).attr('data-color'));
                        $selector.removeClass('show');
                        setTimeout(function()
                        {
                            $selector.remove();
                        }, 500);
                    })
                    .appendTo($selector);
                }

                $selector.appendTo('.page-room');
                $selector.css({left: selected.position().left});

                setTimeout(function()
                {
                    $selector.addClass('show');
                }, 0);

                return;

            }

            vj.ajax({

                action: 'game/play',
                data:   {rid: room_state.rid, uid: info.uid, card: {color: color, number: number}, count: count, extra: extra},
                onSuccess: function(d)
                {
                    if (d !== true)
                    {
                        noticebar_show(d);
                        return;
                    }

                    var selected_card_id = {};

                    var stage_width = $('.stage-card-area').width();
                    var stage_height = $('.stage-card-area').height();
                    var start_x = stage_width / 2 - 30 * count; 

                    //出牌成功
                    $('.stage-card-mine .selected').each(function(index)
                    {
                        selected_card_id[$(this).attr('data-cardid')] = true;

                        var offset = $(this).position();
                        var $clone = $(this).clone().css({left: offset.left, top: stage_height + offset.top}).appendTo('.stage-card-area');

                        var t_left = start_x + index * 50;
                        var t_top = 50;

                        $(this).remove();

                        setTimeout(function()
                        {

                            $clone.css({left: t_left, top: t_top});

                        }, 50);
                    });

                    //Remove card

                    for (var k = cards.length - 1; k>=0; k--)
                    {
                        if (selected_card_id[cards[k].uniqid])
                        {
                            cards[k].dom = null;
                            cards.splice(k, 1);
                        }
                    }

                    rearrange_card_dom();

                }

            });

        }
    }

    function eh_game_turn(data)
    {
        $('.turn-indicator').remove();

        $('.module-room-users .indicator').removeClass('current next');
        $('.module-room-users [data-id="{current_uid}"] .indicator'.format(data)).addClass('current');
        $('.module-room-users [data-id="{next_uid}"] .indicator'.format(data)).addClass('next');

        if (data.current_uid == info.uid)
        {
            var $d = $('<div class="turn-indicator">Your turn!</div>').appendTo('.page-room');
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