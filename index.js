
const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors')
const app = express()
const port = 8080
const slingShotApi = "http://127.0.0.1:4180"

app.use(cors())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use('/testnet3', createProxyMiddleware({ target: slingShotApi, changeOrigin: true }));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
