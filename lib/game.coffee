CardMap = []
ColorMap = ['green', 'red', 'yello', 'blue']
NumberMap = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'empty', 'forbid', 'reverse', 'plus2']

extend = require('util')._extend

IsFunctional = {}

Game = global.Game = 
    
    Initialize: ->

        for num, index in NumberMap
            if index <= 9
                IsFunctional[num] = false
            else
                IsFunctional[num] = true

        IsFunctional['changecolor'] = true
        IsFunctional['plus4'] = true

        for color in ColorMap
            for num in NumberMap
                CardMap.push
                    color:  color
                    number: num

        for i in [1..4]
            CardMap.push
                color:  'null'
                number: 'changecolor'

            CardMap.push
                color:  'null'
                number: 'plus4'

    Start: (rid) ->

        room = Room.Info[rid]

        # Randomize card

        for player in room.Players
            
            player.cards = []
            Game.DrawCards rid, player, 7
            
        # Randomize start person

        room.CurrentPlus = 0
        room.CurrentPlusType = null
        room.CurrentId = Math.floor(Math.random() * room.Players.length)
        room.CurrentUid = room.Players[room.CurrentId].uid
        room.CurrentDirection = 1
        room.CurrentCard = null
        room.CurrentLocked = false   # 如果已摸牌，则锁定
        Game.SetRoundCounter rid

        next_id = room.CurrentId + room.CurrentDirection
        next_id = room.Players.length - 1 if next_id < 0
        next_id = 0 if next_id >= room.Players.length
        next_uid = room.Players[next_id].uid

        for player in room.Players
            player.socket.emit '/game/start', {cards: player.cards}
            player.socket.emit '/game/turn', {
                current:        room.CurrentId
                current_uid:    room.CurrentUid
                next:           next_id
                next_uid:       next_uid
                plus:           room.CurrentPlus
                playerstatus:   Game.GetPlayerStatus(rid)
            }

    SetRoundCounter: (rid) ->

        _rid = rid
        room = Room.Info[rid]

        if room.RoundCounter?

            clearTimeout room.RoundCounter
            room.RoundCounter = null

        kickUid = Room.Info[_rid].CurrentUid

        room.RoundCounter = setTimeout ->

            Game.KickPlayer _rid, kickUid
            room.RoundCounter = null

        , 60*1000

    RepeatCurrentTurn: (rid) ->

        room = Room.Info[rid]
        
        Game.SetRoundCounter rid

        next_id = room.CurrentId + room.CurrentDirection
        next_id = room.Players.length - 1 if next_id < 0
        next_id = 0 if next_id >= room.Players.length
        next_uid = room.Players[next_id].uid

        for player in room.Players
            player.socket.emit '/game/turn', {
                current:        room.CurrentId
                current_uid:    room.CurrentUid
                next:           next_id
                next_uid:       next_uid
                plus:           room.CurrentPlus
                playerstatus:   Game.GetPlayerStatus(rid)
            }

    NextTurn: (rid) ->

        #TODO Locking
        
        room = Room.Info[rid]

        clearTimeout room.RoundCounter
        room.RoundCounter = null

        current_id = room.CurrentId + room.CurrentDirection
        current_id = room.Players.length - 1 if current_id < 0
        current_id = 0 if current_id >= room.Players.length
        current_uid = room.Players[current_id].uid

        room.CurrentId = current_id
        room.CurrentUid = current_uid

        room.CurrentLocked = false  # clear locks

        ################################################
        # If forbid: next
        if room.CurrentCard? && room.CurrentCard.number is 'forbid'

            current_id = room.CurrentId + room.CurrentDirection
            current_id = room.Players.length - 1 if current_id < 0
            current_id = 0 if current_id >= room.Players.length
            current_uid = room.Players[current_id].uid

            room.CurrentId = current_id
            room.CurrentUid = current_uid
        ################################################

        Game.SetRoundCounter rid

        next_id = room.CurrentId + room.CurrentDirection
        next_id = room.Players.length - 1 if next_id < 0
        next_id = 0 if next_id >= room.Players.length
        next_uid = room.Players[next_id].uid

        for player in room.Players
            player.socket.emit '/game/turn', {
                current:        room.CurrentId
                current_uid:    room.CurrentUid
                next:           next_id
                next_uid:       next_uid
                plus:           room.CurrentPlus
                playerstatus:   Game.GetPlayerStatus(rid)
            }

    GetPlayerByUid: (rid, uid) ->

        player = null
        room = Room.Info[rid]

        for _player in room.Players
            if _player.uid is uid
                player = _player
                break

        player

    GetPlayerStatus: (rid) ->

        # Return players' surplus card count

        room = Room.Info[rid]
        ret = []

        for _player in room.Players
            ret.push { uid: _player.uid, count: _player.cards.length }

        ret

    DrawCards: (rid, player, count) ->

        # count = (Integer): 增加指定数量的牌
        # count = undefined: 增加直到玩家可以出牌

        if not count?

            canPlayCard = false

            while not canPlayCard

                # new card

                card = extend {}, CardMap[Math.floor(Math.random() * CardMap.length)]
                player.cards.push card

                canPlayCard = Game.CanPlayCard rid, player.uid, card

        else

            for i in [1..count]

                card = extend {}, CardMap[Math.floor(Math.random() * CardMap.length)]
                player.cards.push card


    CanPlayCard: (rid, uid, card) ->

        room = Room.Info[rid]

        canPlayCard = false

        if room.CurrentCard is null
            # 第一局：只有第一个出牌的人可以出牌

            if uid isnt room.CurrentUid

                canPlayCard = false

            else

                canPlayCard = true

        else

            if card.color is room.CurrentCard.color && card.number is room.CurrentCard.number && not room.CurrentLocked
                
                # 完全一致且没有锁定：可抢牌
                canPlayCard = true

            else

                # 不完全一致：是否按顺序
                if room.CurrentUid isnt uid

                    # 非下一个玩家
                    canPlayCard = false

                else

                    if room.CurrentPlus > 0

                        if card.number isnt 'plus2' && card.number isnt 'plus4'

                            canPlayCard = false

                        else

                            if room.CurrentCard.number is 'plus4' && card.number is 'plus2'

                                canPlayCard = false

                            else

                                canPlayCard = true

                    else

                        # 判断花色

                        if card.number is 'plus4'

                            # 永远可+4
                            canPlayCard = true

                        else if room.CurrentCard.number is 'plus2' and card.number is 'changecolor'

                            # 上一局是+2，本局不能换颜色
                            canPlayCard = false

                        else if room.CurrentCard.number is 'plus4' and card.number is 'changecolor'

                            # 上一局是+4，本局不能换颜色
                            canPlayCard = false

                        else if card.number is 'changecolor'

                            # 可换色
                            canPlayCard = true

                        else if room.CurrentCard.number is card.number or room.CurrentCard.color is card.color

                            # 颜色或花色一致，本局可出牌
                            canPlayCard = true

                        else

                            canPlayCard = false

        canPlayCard


    PlayCard: (rid, uid, card, cardCount, extra) ->

        room = Room.Info[rid]
        currentPlayer = Game.GetPlayerByUid rid, uid

        return '参数不正确：用户不存在' if currentPlayer is null

        # 检查参数

        return '参数不正确：cardCount不能小于1' if cardCount < 1

        if card.number is 'changecolor' or card.number is 'plus4'

            return '参数不正确：未知的新花色' if extra isnt 'green' && extra isnt 'blue' && extra isnt 'red' && extra isnt 'yello'

        cardAvailable = 0

        # 是否拥有这张牌

        for _card in currentPlayer.cards
            if _card.color is card.color && _card.number is card.number
                cardAvailable++

        return '您没有足够的牌' if cardAvailable < cardCount

        return '您当前不能出这个牌' if not Game.CanPlayCard rid, uid, card

        # 出牌阶段

        # 删除相应数量的牌

        cardAvailable = cardCount

        for _card, i in currentPlayer.cards by -1
            if _card.color is card.color && _card.number is card.number
                currentPlayer.cards.splice i, 1
                cardAvailable--
                break if cardAvailable is 0

        # 可换色
        
        if card.number is 'changecolor' or card.number is 'plus4'

            card.color = extra

        # 有加牌

        if card.number is 'plus4'

            room.CurrentPlus += 4 * cardCount
            room.CurrentPlusType = 'plus4'

        else if card.number is 'plus2'

            room.CurrentPlus += 2 * cardCount
            room.CurrentPlusType = 'plus2'

        # 有倒转

        if card.number is 'reverse'
            
            if (cardCount % 2) is 1
                
                if room.CurrentDirection is 1
                    room.CurrentDirection = -1
                else
                    room.CurrentDirection = 1

        # 有抢牌，则更新index

        if room.CurrentUid isnt uid

            for _player, i in room.Players
                
                if _player.uid is uid

                    room.CurrentId = i
                    break

            room.CurrentUid = uid

        # 更新牌

        room.CurrentCard = extend {}, card

        # 广播出牌信息
        for player in room.Players
            player.socket.emit '/game/play', {card: room.CurrentCard, count: cardCount, extra: extra, uid: uid}

        # 是否获胜或UNO

        for _player in room.Players
            if _player.uid is uid
                
                if _player.cards.length is 1 and not IsFunctional[_player.cards[0].number]

                    # UNO

                    for player in room.Players
                        player.socket.emit '/game/status/uno', {uid: _player.uid}

                    break

                if _player.cards.length is 0

                    if not IsFunctional[card.number]

                        # 获胜

                        for player in room.Players
                            player.socket.emit '/game/status/win', {uid: _player.uid, nick: _player.nick}

                        room.Started = false
                        return

                    else

                        # 需要补牌 * 2
                        
                        Game.DrawCards rid, currentPlayer, 2
                        currentPlayer.socket.emit '/game/card/updated', {cards: currentPlayer.cards}

                        ps = Game.GetPlayerStatus(rid)
                        for _player in room.Players
                            _player.socket.emit '/game/playerstatus/update', { playerstatus: ps }
                        
                        break

        # 下一局~

        Game.NextTurn rid
        true

    OnPlayerLeave: (rid, uid) ->

        room = Room.Info[rid]

        if room.CurrentUid is uid

            # 当前那只家伙走了
            Game.NextTurn rid

        for rec, index in room.Players by -1
            if rec.uid is uid
                room.Players.splice index, 1
                break

    KickPlayer: (rid, uid) ->

        room = Room.Info[rid]
        socket = Game.GetPlayerByUid(rid, uid).socket
        
        Server.ClientEnter socket, 'index'
        socket.emit '/room/kicked'

        true

onServerReady = ->

    app = @
    app.post '/ajax/game/play', Server.RequireLogin, controller_playcard
    app.post '/ajax/game/draw', Server.RequireLogin, controller_drawcard

onSocketIOReady = ->

    socket = @

controller_playcard = (req, res) ->

    if not Room.Info[req.body.rid].Started
        res.write JSON.stringify { errorMsg: '游戏还没开始 0.0', succeeded: false}
        res.end()
        return

    result = Game.PlayCard req.body.rid, req.session.uid, req.body.card, req.body.count, req.body.extra

    res.write JSON.stringify result
    res.end()

controller_drawcard = (req, res) ->

    uid = req.session.uid
    rid = req.body.rid

    room = Room.Info[rid]
    
    if not room.Started
        res.write JSON.stringify { errorMsg: '游戏还没开始 0.0', succeeded: false }
        res.end()
        return

    if room.CurrentUid isnt uid

        res.write JSON.stringify { errorMsg: '您当前不能摸牌', succeeded: false }
        res.end()
        return

    player = Game.GetPlayerByUid rid, uid

    if room.CurrentPlus > 0

        plusType = room.CurrentPlusType

        Game.DrawCards rid, player, room.CurrentPlus
        room.CurrentPlus = 0
        room.CurrentPlusType = null
        player.socket.emit '/game/card/updated', {cards: player.cards}
        
        ps = Game.GetPlayerStatus(rid)
        for _player in room.Players
            _player.socket.emit '/game/playerstatus/update', { playerstatus: ps }

        if plusType is 'plus2'

            # 如果是+2，则先摸n张牌，然后继续当前玩家
            Game.RepeatCurrentTurn rid

        else

            # 如果是+4，则摸n张牌，然后下一轮
            Game.NextTurn rid

    else
        
        # 否则，一直摸牌直到可以出牌
        Game.DrawCards rid, player
        player.socket.emit '/game/card/updated', {cards: player.cards}

        ps = Game.GetPlayerStatus(rid)
        for _player in room.Players
            _player.socket.emit '/game/playerstatus/update', { playerstatus: ps }

    res.write JSON.stringify {}
    res.end()

ServerReadyHandlers.push onServerReady
SocketIOReadyHandlers.push onSocketIOReady