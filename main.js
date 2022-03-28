import {HttpServer} from "./HttpServer.js"


const HOST='localhost'
const PORT=9000


let app = new HttpServer()

app.onGET('/{view}.html', async function(req, view){
	return new Response('Hello ${view}')
})


await app.listen(HOST,PORT)


