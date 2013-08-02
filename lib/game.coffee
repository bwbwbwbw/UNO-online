CardMap = []
ColorMap = ['green', 'red', 'yello', 'blue']
NumberMap = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'empty', 'forbid', 'reverse', 'plus2']

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
            for i in [1..7]
                player.cards.push CardMap[Math.floor(Math.random() * CardMap.length)]

        # Randomize start person

        room.CurrentPlus = 0
        room.CurrentPlusType = null
        room.CurrentId = Math.floor(Math.random() * room.Players.length)
        room.CurrentUid = room.Players[room.CurrentId].uid
        room.CurrentDirection = 1
        room.CurrentCard = null

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
            }

    NextTurn: (rid) ->

        room = Room.Info[rid]

        current_id = room.CurrentId + room.CurrentDirection
        current_id = room.Players.length - 1 if current_id < 0
        current_id = 0 if current_id >= room.Players.length
        current_uid = room.Players[current_id].uid

        room.CurrentId = current_id
        room.CurrentUid = current_uid

        ################################################
        # If forbid: next
        if room.CurrentCard.number is 'forbid'

            current_id = room.CurrentId + room.CurrentDirection
            current_id = room.Players.length - 1 if current_id < 0
            current_id = 0 if current_id >= room.Players.length
            current_uid = room.Players[current_id].uid

            room.CurrentId = current_id
            room.CurrentUid = current_uid
        ################################################

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
            }

    PlayCard: (rid, uid, card, cardCount, extra) ->

        room = Room.Info[rid]

        currentPlayer = null
        for _player in room.Players
            if _player.uid is uid
                currentPlayer = _player
                break

        return '参数不正确：用户不存在' if currentPlayer is null

        # 检查参数

        return '参数不正确：cardCount不能小于1' if cardCount < 1

        if card.number is 'changecolor' or card.number is 'plus4'

            return '参数不正确：未知的新花色' if extra isnt 'green' and extra isnt 'blue' and extra isnt 'red' and extra isnt 'yello'

        cardAvailable = 0

        # 是否拥有这张牌

        for _card in currentPlayer.cards
            if _card.color is card.color && _card.number is card.number
                cardAvailable++

        return '您没有足够的牌' if cardAvailable < cardCount

        # 是否可出牌

        canPlayCard = false

        if room.CurrentCard is null
            # 第一局：只有第一个出牌的人可以出牌

            if uid isnt room.CurrentUid

                canPlayCard = false

            else

                canPlayCard = true

        else

            if card.color is room.CurrentCard.color && card.number is room.CurrentCard.number
                
                # 完全一致：可抢牌
                canPlayCard = true

            else

                # 不完全一致：是否按顺序
                if room.CurrentUid isnt uid

                    # 非下一个玩家
                    canPlayCard = false

                else

                    # 判断花色

                    if room.CurrentCard.number is 'plus2' and card.number is 'plus4'

                        # 上一局是+2，本局可+4
                        canPlayCard = true

                    else if room.CurrentCard.number is 'plus2' and card.number is 'changecolor'

                        # 上一局是+2，本局不能换颜色
                        canPlayCard = false

                    else if room.CurrentCard.number is 'plus4' and card.number is 'changecolor'

                        # 上一局是+4，本局不能换颜色
                        canPlayCard = false

                    else if room.CurrentCard.number is card.number or room.CurrentCard.color is card.color

                        # 颜色或花色一致，本局可出牌
                        canPlayCard = true

                    else

                        canPlayCard = false

        return '您当前不能出这个牌' if not canPlayCard

        # 出牌阶段

        # 删除相应数量的牌

        for _card in currentPlayer.cards
            if _card.color is card.color && _card.number is card.number
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

            if not (cardCount % 2) is 0
                
                if room.CurrentDirection is 1
                    room.CurrentDirection = -1
                else
                    room.CurrentDirection = 1

        # 更新牌

        room.CurrentCard = { color: card.color, number: card.number }

        # 广播
        for player in room.Players
            player.socket.emit '/game/play', room.CurrentCard

        # 是否获胜或UNO

        for _player in room.Players
            if _player.uid is uid
                
                if _player.cards.length is 1 and not IsFunctional[_player.cards[0].number]

                    # UNO

                    Game.UNO rid, uid
                    break

                if _player.cards.length is 0 and not IsFunctional[card.number]

                    # 获胜

                    Game.Win rid, uid
                    break

                else

                    # 需要补牌 * 2
                    
                    for i in [1..2]
                        currentPlayer.cards.push CardMap[Math.floor(Math.random() * CardMap.length)]
                    
                    currentPlayer.socket.emit '/game/card/updated', {cards: currentPlayer.cards}
                    
                    break

        # 下一局~

        Game.NextTurn rid
        true



onServerReady = ->

    app = @
    app.post '/ajax/game/play', Server.RequireLogin, controller_playcard

onSocketIOReady = ->

    socket = @

controller_playcard = (req, res) ->

    result = Game.PlayCard req.body.rid, req.body.uid, req.body.card, req.body.count, req.body.extra

    res.write JSON.stringify result
    res.end()

ServerReadyHandlers.push onServerReady
SocketIOReadyHandlers.push onSocketIOReady