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
            isStarted: false,
            myTurn: false,
            currentCard: null,
            plus: 0,
            locked: false
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
        if (room_state.isStarted)
            return;

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

    var noticebar_hide_timeout = null;
    var last_notice_bar;

    function noticebar_show(content, delay)
    {
        if (delay == undefined)
            delay = 1000;

        var $b = $('<div class="notice-bar"><div class="notice-content"></div></div>');
        $b.prependTo('.page-room');

        $b.find('.notice-content').text(content);

        if (noticebar_hide_timeout != null)
        {
            clearTimeout(noticebar_hide_timeout);
            noticebar_hide();
        }

        setTimeout(function()
        {
            $b.addClass('show');
        }, 0);

        last_notice_bar = $b;

        noticebar_hide_timeout = setTimeout(noticebar_hide, delay);
    }

    function noticebar_hide()
    {
        if (last_notice_bar == null)
            return;

        var bar = last_notice_bar;
        bar.removeClass('show')

        setTimeout(function()
        {
            bar.remove();
            bar = null;
        }, 1000);

        noticebar_hide_timeout = null;
    }

    //==========================================

    //==========================================

    var last_plus_bar = null;

    function plusbar_show(content)
    {
        if (last_plus_bar !== null)
            plusbar_hide();

        var $b = $('<div class="plus-bar"></div>');
        $b.prependTo('.page-room');

        $b.text(content);

        setTimeout(function()
        {
            $b.addClass('show');
        }, 0);

        last_plus_bar = $b;
    }

    function plusbar_hide()
    {
        if (last_plus_bar == null)
            return;

        var bar = last_plus_bar;
        bar.removeClass('show');

        setTimeout(function()
        {
            bar.remove();
            bar = null;
        }, 1000);

        last_plus_bar = null;
    }

    //==========================================
    
    var cards;

    function gameHandler()
    {
        var socket = this;
        socket.on('/game/start', eh_game_start);
        socket.on('/game/turn', eh_game_turn);
        socket.on('/game/play', eh_game_play);
        socket.on('/game/card/updated', eh_game_card_update);
        socket.on('/game/playerstatus/update', eh_playestatus_update);
        socket.on('/game/status/uno', eh_game_status_uno);
        socket.on('/game/status/win', eh_game_status_win);
    }

    function eh_playestatus_update(data)
    {
        for (var k in data.playerstatus)
        {
            var p = data.playerstatus[k];
            $('.module-room-users [data-id="{uid}"] .card-counter'.format(p)).text(p.count);
        }
    }

    function eh_game_status_uno(data)
    {
        var $user = $('.module-room-users [data-id="{uid}"]'.format(data));
        $user.addClass('highlight');

        setTimeout(function()
        {
            $user.removeClass('highlight');
        }, 2000);
    }

    function eh_game_status_win(data)
    {
        var p = $('.turn-indicator').removeClass('show');
        setTimeout(function()
        {
            p.remove();
        }, 1000);

        if (data.uid == info.uid)
        {
            //I'm win
            var $d = $('<div class="turn-indicator">You win!</div>').appendTo('.page-room');
        }
        else
        {
            var $d = $('<div class="turn-indicator">You lost :(</div>').appendTo('.page-room');
        }

        $('.module-stage').empty().text('Winner is ' + data.nick);

        setTimeout(function()
        {
            $d.addClass('show');
        }, 0);

        setTimeout(function()
        {
            action_go_home();
        }, 3000);
    }

    function eh_game_card_update(newcards)
    {
        newcards = newcards.cards;

        //1. 对比哪些牌是新的
        for (var k in cards)
        {
            cards[k].used = false;
        }

        for (var i in newcards)
        {
            for (var j in cards)
            {

                if (cards[j].used == false)
                {

                    if (newcards[i].number == cards[j].number && newcards[i].color == cards[j].color)
                    {

                        cards[j].used = true;
                        newcards[i].existed = true;
                        break;

                    }

                }

            }
        }

        for (var k in cards)
        {
            delete cards[k].used;
        }

        for (var k in newcards)
        {
            if (!newcards[k].existed)
            {
                // this is a new card
                card_uniqid++;
                cards.push({number: newcards[k].number, color: newcards[k].color, uniqid: card_uniqid});
            }
        }

        //2. Re-sort

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
            if (cards[k].dom == undefined)
            {
                //is a new card
                var dom = $('<div class="card-wrapper hide" data-color="{color}" data-number="{number}" data-cardid="{uniqid}"><div class="card card-{color}-{number}"></div></div>'.format(cards[k]));
                cards[k].dom = dom;

                if (k == 0)
                {
                    dom.prependTo('.stage-card-mine');
                }
                else
                {
                    dom.insertAfter(cards[k-1].dom);
                }
            }
        }

        setTimeout(function()
        {
            $('.stage-card-mine .card-wrapper').removeClass('hide');
        }, 0);

        rearrange_card_dom();
        update_card_style(false);

    }

    //清理牌区
    function card_area_clear()
    {

        var rmList = [];

        $('.stage-card-area .card-wrapper').css({left: 0, opacity: 0}).each(function()
        {
            var s = $(this);
            rmList.push(s);
        });

        setTimeout(function()
        {
            for (var i in rmList)
            {
                rmList[i].remove();
            }

            rmList = null;

        }, 1000);

    }

    function eh_game_play(data)
    {
        // Update
        room_state.currentCard = {color: data.card.color, number: data.card.number};

        //忽略自己的出牌
        if (data.uid == info.uid)
            return;

        card_area_clear();

        var stage_width = $('.stage-card-area').width();
        var start_x = stage_width / 2 - 30 * data.count; 

        for (var i = 0; i < data.count; i++)
        {
            (function(i)
            {

                var card = $('<div class="card-wrapper" data-color="{color}" data-number="{number}"><div class="card card-{color}-{number}"></div></div>'.format(data.card));
                card.css({left: stage_width, opacity: 0, top: 50});
                card.appendTo('.stage-card-area');

                setTimeout(function()
                {
                    card.css({left: start_x + i * 50, opacity: 1});
                }, i * 50);

            })(i);
        }
    }

    function eh_game_start(data)
    {
        cards = [];

        $('.module-stage').html('<div class="stage-card-area"></div><div class="stage-card-mine"></div>');
        $('.role-start-game').remove();

        $('.module-room-users .card-counter').show();

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
        
        //Select similar
        var color = $(this).attr('data-color');
        var number = $(this).attr('data-number');

        //如果是+4、+2、禁、换色，则默认不多选
        if (number == 'plus2' || number == 'plus4' || number == 'forbid' || number == 'changecolor')
        {
            //清楚互斥状态的牌

            $('.stage-card-mine .selected').each(function()
            {
                if ($(this).attr('data-number') !== number || $(this).attr('data-color') !== color)
                    $(this).removeClass('selected');
            });

            $(this).addClass('selected');

            return;
        }

        $('.stage-card-mine .selected').removeClass('selected');
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

    function action_drawcard()
    {

        if (!room_state.myTurn)
        {
            noticebar_show('当前您还不能摸牌。');
            return;
        }

        //如果有可以出的牌 则跳过
        var valid = false;

        $('.stage-card-mine .card-wrapper').each(function()
        {
            var color = $(this).attr('data-color');
            var number = $(this).attr('data-number');

            if (card_can_play(color, number))
            {
                valid = true;
                return false;
            }
        });

        if (valid)
        {
            noticebar_show('当前您不需要摸牌。');
            return;
        }

        noticebar_hide();

        vj.ajax({

            action: 'game/draw',
            data:   {rid: room_state.rid},

            onFailure: function(d)
            {
                noticebar_show(d.errorMsg);
            },

            onError: function(d)
            {
                noticebar_show('网络错误');
            }

        });

    }

    function action_playcard(extra)
    {
        if ($('.color-select').length > 0 && extra == undefined)
            return;

        var selected = $('.stage-card-mine .selected');

        if (selected.hasClass('invalid'))
        {
            noticebar_show('您不能出这张牌');
            return;
        }

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
                        selected.find('.card').attr('class', 'card card-' + $(this).attr('data-color') + '-' + number);

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
                data:   {rid: room_state.rid, card: {color: color, number: number}, count: count, extra: extra},
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
                    card_area_clear();

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
        noticebar_hide();

        $('.turn-indicator').remove();

        $('.module-room-users .indicator').removeClass('current next');
        $('.module-room-users [data-id="{current_uid}"] .indicator'.format(data)).addClass('current');
        $('.module-room-users [data-id="{next_uid}"] .indicator'.format(data)).addClass('next');
        $('.module-room-users .progress').remove();

        console.log(data);

        var $pg = $('<div class="progress"></div>');
        $pg.appendTo('.module-room-users [data-id="{current_uid}"]'.format(data));

        setTimeout(function()
        {
            $pg.addClass('begin');
        }, 0);

        eh_playestatus_update(data);

        if (room_state.plus != data.plus)
        {
            if (data.plus > 0)
            {
                plusbar_show('+' + data.plus);
            }
            else
            {
                plusbar_hide();
            }

            room_state.plus = data.plus;
        }

        room_state.locked = false;

        if (data.current_uid == info.uid)
        {
            room_state.myTurn = true;

            var $d = $('<div class="turn-indicator">Your turn!</div>').appendTo('.page-room');
            setTimeout(function()
            {
                $d.addClass('show');
            }, 0);
        }
        else
        {
            room_state.myTurn = false;
        }

        update_card_style();
    }

    function update_card_style(showTip)
    {
        if (showTip == undefined)
            showTip = true;

        var validCount = 0;

        $('.stage-card-mine .card-wrapper').each(function()
        {
            var color = $(this).attr('data-color');
            var number = $(this).attr('data-number');

            if (!card_can_play(color, number))
            {
                $(this).addClass('invalid').removeClass('valid');
            }
            else
            {
                $(this).removeClass('invalid').addClass('valid');
                validCount++;
            }
        });

        if (showTip && validCount == 0 && room_state.myTurn)
        {
            noticebar_show('您已经无牌可出了。请等待其他玩家抢牌（如果存在），或按R来摸牌。', 5000);
        }
    }

    function card_can_play(color, number)
    {
        var canPlayCard = false;

        if (room_state.currentCard == null)
        {
            // 第一局：只有第一个出牌的人可以出牌

            if (!room_state.myTurn)
            {
                canPlayCard = false;
            }
            else
            {
                canPlayCard = true;
            }
        }
        else
        {
            if (color == room_state.currentCard.color && number == room_state.currentCard.number && !room_state.locked)
            {                
                // 完全一致：可抢牌
                canPlayCard = true;
            }
            else
            {
                if (!room_state.myTurn)
                {
                    // 非下一个玩家
                    canPlayCard = false;
                }
                else
                {
                    if (room_state.plus > 0)
                    {
                        if (number != 'plus2' && number != 'plus4')
                        {
                            canPlayCard = false
                        }
                        else
                        {
                            if (room_state.currentCard.number == 'plus4' && number == 'plus2')
                            {
                                canPlayCard = false
                            }
                            else
                            {
                                canPlayCard = true
                            }
                        }
                    }
                    else
                    {
                        // 判断花色
                        if (number == 'plus4')
                        {
                            // 永远可+4
                            canPlayCard = true;
                        }
                        else if (room_state.currentCard.number == 'plus2' && number == 'changecolor')
                        {
                            // 上一局是+2，本局不能换颜色
                            canPlayCard = false;
                        }
                        else if (room_state.currentCard.number == 'plus4' && number == 'changecolor')
                        {
                            // 上一局是+4，本局不能换颜色
                            canPlayCard = false;
                        }
                        else if (number == 'changecolor')
                        {
                            // 可换色
                            canPlayCard = true;
                        }
                        else if (room_state.currentCard.number == number || room_state.currentCard.color == color)
                        {
                            // 颜色或花色一致，本局可出牌
                            canPlayCard = true;
                        }
                        else
                        {
                            canPlayCard = false;
                        }
                    }
                }
            }
        }

        return canPlayCard;
    }

    $(document).ready(function()
    {
        $(document).keypress(function(e)
        {
            var tag = e.target.tagName.toLowerCase();
            if ( tag != 'input' && tag != 'textarea') 
            {

                if (e.which === 32)
                {
                    //Space
                    action_playcard();
                    return false;
                }
                else if (e.which === 114)
                {
                    //R
                    action_drawcard();
                    return false;
                }

            }
        });
    });

    SocketIOReadyHandlers.push(gameHandler);

})(window);