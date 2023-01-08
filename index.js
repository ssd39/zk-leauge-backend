
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors')
const app = express()
require('express-ws')(app);
const port = 8080
const slingShotApi = "http://127.0.0.1:4180"
const matchQueue = []
const userMap = {}
const gameStates = {}

app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.ws('/ws', function(ws, req) {
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
                              character: gameStates[opponenet].c1 === 0 ? 1 : 0
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
                  }
              }
            }else{
                let msgType = msgData.type
                if(msgType==="gameRecord"){
                    if(gameStates.hasOwnProperty(publicAddress)){
                        let p2 = gameStates[publicAddress].p2
                        userMap[p2].send(JSON.stringify({
                            type: msgType,
                            record: msgData.record
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

app.use('/testnet3', createProxyMiddleware({ target: slingShotApi, changeOrigin: true }))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
