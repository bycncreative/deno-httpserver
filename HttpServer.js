import {MediaType} from "./MediaTypes.js"
/** 
 * 
 *@Author		Bing
 *@license		MIT
 *@version		1.0
 */
class HttpServer {
	
	_HTTPMETHOD = {
		GET: {},  GET_REGEX:{},
		POST:{},  POST_REGEX:{},
		PUT:{},   PUT_REGEX:{},
		DELETE: {},DELETE_REGEX:{}
	}

	_parsePath(method, path){		
		let n = this._HTTPMETHOD[method][path]
		if(n)
			return {afn:n.afn}
		n = this._HTTPMETHOD[`${method}_REGEX`]
		for(let k in n){
			let m =n[k].regex.exec(path)
			if(m){
				let ret = {afn:n[k].afn}
				ret.vars = m
				return ret;
			}
		}
		return null;
	}
	
	_pathMapping(method, path, afn){
		let restr='^'
		let lasti=0
		let vars = []
		let re = /\{([^\/]+)\}/g
		let m
		while((m = re.exec(path))){
		  //console.log(m[0],m[1], m.index, p.length)  
		  restr += path.substring(lasti,m.index)  + '(\\w+)'
		  lasti=m.index+m[0].length
		  vars.push(m[1])
		}
		if(lasti<path.length){
			restr += path.substring(lasti)
		}
		restr += '$'
		if(lasti==0){
			this._HTTPMETHOD[method][path] = {afn:afn,vars:vars}
		}else{
			this._HTTPMETHOD[`${method}_REGEX`][restr] = {afn:afn, vars:vars, regex: new RegExp(restr)}
		}				
	}
	
	onGET(path, afn) {
		this._pathMapping('GET',path,afn)
	}
	onPOST(path, afn) {
		this._pathMapping('POST',path,afn)
	}
	onPUT(path, afn) {
		this._pathMapping('PUT',path,afn)
	}
	onDELETE(path, afn) {
		this._pathMapping('DELETE',path,afn)
	}
	
	async _handlStatic(contentType, path){
		let f = await Deno.open(this.getServerPath()+path,{read: true})
		let buf = await Deno.readAll(f)
		Deno.close(f.rid)
		return new Response(buf, {headers:{'Conent-Type':contentType}})
	}
	
	getServerPath(){
		return Deno.cwd() + '/WebContent"
	}

	/**
	 *@param  {Request} req
	 *@return Response
	 */
	handle = async function(req) {
		let url = req.url
		let p = url.indexOf('/',req.url.indexOf('//')+3)
		let path = req.url.substring(p)
		let ct = MediaType.getContentType(url)
		if(ct){
			return this._handlStatic(ct,path)
		}
		let found = this._parsePath(req.method,path)
		if(found){
			found.vars[0] = req
			return found.afn.apply(null, found.vars)
		}
		return new Response('not support')
	}
	
	async _onHttpConn(httpConn){
		let lcounter = 0;
		let reqEvt;
		while((reqEvt = await httpConn.nextRequest())){
			console.log('got http request event:', reqEvt)
			let res;
			try{			
				res = await this.handle(reqEvt.request)						
			}catch(err){
				res= new Response(`${err}`, {headers: { 'Content-Type': 'text/plain;charset=UTF-8'}})
			}
			console.log('response',res)		
			await reqEvt.respondWith(res)
			console.log('try to get next request in this connection... ' , ++lcounter)
		}
	}
	
	async listen(host,port){
		console.log('server started!')
		let conn = await Deno.listen({hostname:host, port: port })
		let counter = 0
		for(;;){
			console.log('wait for connection... ', ++counter)
			const httpConn = Deno.serveHttp(await conn.accept())
			
			console.log('http connect got, to handle http requst ... ',counter)	
			try{
				this._onHttpConn(httpConn).then(()=>{console.log('end of handle httpConn')})
			}catch(err){
				console.error(err)
			}
		}
	}
}

export { HttpServer }
