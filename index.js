
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors')
const app = express()
require('express-ws')(app);
const port = 8081
const slingShotApi = "http://127.0.0.1:4180"
let matchQueue = []
const userMap = {}
const gameStates = {}

app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.ws('/ws', (ws, req) => {
    let publicAddress = "";
    ws.on('message', (msg) => {
        try{
            let msgData = JSON.parse(msg)
            if(publicAddress===""){
              if(msgData.type === "init" && msgData.publicAddress){
                  publicAddress = msgData.publicAddress
                  userMap[publicAddress] =  ws
                  if(matchQueue.length>0){
                      let opponenet = matchQueue.shift()
                      gameStates[opponenet].p2 = publicAddress
                      ws.send(JSON.stringify(
                          {
                              type: "join",
                              publicAddress: publicAddress,
                              gameCreator: opponenet,
                              gameId: gameStates[opponenet].id,
                              character: gameStates[opponenet].character === 0 ? 1 : 0
                          }
                      ))
                      userMap[opponenet].send(JSON.stringify(
                        {
                            type: "opponent_join",
                            opponent: publicAddress
                        }
                      ))
                  }else{
                      matchQueue.push(publicAddress)
                      gameStates[publicAddress] = {
                          id: msgData.gameId, 
                          p1: publicAddress,
                          character: Math.floor(Math.random() * 2)
                      }
                      ws.send(JSON.stringify({type:'game_created', ...gameStates[publicAddress]}))
                  }
              }
            }else{
                let msgType = msgData.type
                if(msgType==="game_issued" || msgType==="initiate_move" || msgType==="finalize_move"){
                    if(gameStates.hasOwnProperty(publicAddress)){
                        let p2 = gameStates[publicAddress].p2
                        userMap[p2].send(JSON.stringify({
                            type: msgType,
                            txid: msgData.txid,
                            move_id: msgData.move_id,
                            winner_id: msgData.winner_id 
                        }))
                    }
                }else if (msgType==="game_accepted" || msgType==="challenge_move"){
                    if(gameStates.hasOwnProperty(msgData.gameCreator) && gameStates[msgData.gameCreator].p2===publicAddress){
                        userMap[gameStates[msgData.gameCreator].p1].send(JSON.stringify({
                            type: msgType,
                            txid: msgData.txid
                        }))
                    }
                }
            }
        }catch(e){
            console.error(e)
        }
    })

    ws.on('close',  ()=> {
        if(publicAddress!==""){
            if(userMap.hasOwnProperty(publicAddress)){
                delete userMap[publicAddress]
            }
            let matchQueue_ = []
            for(let i=0; i< matchQueue.length; i++){
                if(matchQueue[i]!==publicAddress){
                    matchQueue_.push(matchQueue[i])
                }
            }
            matchQueue = matchQueue_
        }
    })
})

const TIMEOUT =  1000 * 60 * 1000

app.use('/testnet3', createProxyMiddleware({ target: slingShotApi, changeOrigin: true,   proxyTimeout: TIMEOUT, timeout: TIMEOUT }))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
