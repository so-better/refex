/**
 * 虚拟节点
 */
class VNode {
	
	constructor(tag, attrs, cls, directives, events, text, id, nodeType) {
		//标签名称
		this.tag = tag
		//属性集合
		this.attrs = attrs
		//样式类集合
		this.cls = cls
		//指令集合
		this.directives = directives
		//事件集合
		this.events = events
		//节点文字
		this.text = text
		//节点id
		this.id = id
		//节点类型
		this.nodeType = nodeType
		//父虚拟节点
		this.parent = undefined
		//子虚拟节点列表
		this.children = []
		//是否克隆节点
		this.isCloned = false
		//对应的真实dom
		this.elm = undefined
		//是否渲染
		this.if = true
		//for指令遍历数据
		this.forData = {}
		//for指令遍历数据的解析结果
		this.forRes = {}
		//是否使用了if指令
		this.useIf = false
		//是否使用了else-if指令
		this.useElseIf = false
		//是否使用了else指令
		this.useElse = false
	}

	/**
	 * 处理for指令克隆节点
	 * @param {State} state State实例
	 */
	dealFor(state) {
		//该节点含有for指令，即需要进行克隆处理
		if (this.directives['for']) {
			//设置作用域
			let scope = state._getOriginalData(state.$data)
			Object.assign(scope, this.getForData())
			//解析for指令表达式
			const res = this.parseFor(scope, this.directives['for'].exp)
			//表达式不合法
			if (!res) {
				throw new Error(`Invalid @for expression: ${this.directives['for'].exp}`)
			}
			//原directives集合中去除for
			delete this.directives['for']
			//获取当前虚拟节点在父节点中的位置
			const dex = this.getIndex()
			//创建一个空数组存放克隆的节点
			let cloneVnodes = []
			//如果循环的是数组
			if (Array.isArray(res.for)) {
				let length = res.for.length
				//遍历数组
				for(let i = 0;i<length;i++){
					//克隆节点
					let copyVn = this.clone(i, res, i)
					//设置父节点
					copyVn.parent = this.parent
					//加入数组中
					cloneVnodes.push(copyVn)
					//递归处理子节点的for指令
					copyVn.children.forEach(childVnode => {
						childVnode.dealFor(state)
					})
				}
			}
			//如果循环的是对象
			else if (typeof res.for == 'object' && res.for) {
				//遍历对象
				Object.keys(res.for).forEach((key, index) => {
					//克隆节点
					let copyVn = this.clone(index, res, index, key)
					//设置父节点
					copyVn.parent = this.parent
					//加入数组
					cloneVnodes.push(copyVn)
					//递归处理子节点的for指令
					copyVn.children.forEach(childVnode => {
						childVnode.dealFor(state)
					})
				})
			}
			//删除该节点，添加克隆的节点
			this.parent.children.splice(dex, 1, ...cloneVnodes)
		}
		//该节点无需进行克隆处理，进行递归遍历子节点
		else {
			this.children.forEach(childVnode => {
				childVnode.dealFor(state)
			})
		}
	}

	/**
	 * 虚拟节点的数据初始化：将一个未初始化的虚拟节点转为含有真实数据的虚拟节点
	 * @param {State} state State实例
	 */
	init(state) {
		//设置作用域
		let scope = state._getOriginalData(state.$data)
		Object.assign(scope, this.getForData())
		//元素节点进行初始化
		if(this.nodeType == 1){
			//if指令提取出来，单独作为if属性
			if (this.directives['if']) {
				//使用if时同时存在else-if、else则报错
				if(this.directives['else-if'] || this.directives['else']){
					throw new Error('"@if" and "@else-if" and "@else" cannot be used on the same node')
				}
				//解析指令的表达式值
				this.if = this.parseExpression(scope, this.directives['if'].exp)
				//进行标记
				this.useIf = true
				//从指令集合移除
				delete this.directives['if']
			}
			
			//else-if指令提取出来，单独作为if属性
			if(this.directives['else-if']){
				//使用else-if时同时存在else则报错
				if(this.directives['else']){
					throw new Error('"@else-if" and "@else" cannot be used on the same node')
				}
				//获取上一个兄弟节点
				let brotherNode = this.getPrevBrotherNode()
				//上一个兄弟节点不存在或者没有使用@if则直接报错
				if(!brotherNode || !brotherNode.useIf){
					throw new Error('"@else-if" cannot be used alone')
				}
				//上一个兄弟节点的if为true则不渲染
				if(brotherNode.if){
					this.if = false
				}else {
					//解析指令的表达式值
					this.if = this.parseExpression(scope, this.directives['else-if'].exp)
				}
				//进行标记
				this.useElseIf = true
				//从指令集合移除
				delete this.directives['else-if']
			}
			
			//else指令提取出来，单独作为if属性
			if(this.directives['else']){
				//获取上一个兄弟节点
				let brotherNode = this.getPrevBrotherNode()
				//上一个兄弟节点不存在或者没有使用@if和@else-if，则直接报错
				if(!brotherNode || (!brotherNode.useIf && !brotherNode.useElseIf)){
					throw new Error('"@else" cannot be used alone')
				}
				//上一个兄弟节点使用的是@if
				if(brotherNode.useIf){
					if(brotherNode.if){
						this.if = false
					}else {
						this.if = true
					}
				}
				//上一个兄弟节点使用的是@else-if
				else if(brotherNode.useElseIf){
					//获取该节点的上一个兄弟节点
					let brotherNode2 = brotherNode.getPrevBrotherNode()
					//该节点的上一个兄弟节点没有使用@if直接报错
					if(!brotherNode2 || !brotherNode2.useIf){
						throw new Error('"@else" cannot be used alone')
					}
					if(brotherNode.if || brotherNode2.if){
						this.if = false
					}else {
						this.if = true
					}
				}
				//进行标记
				this.useElse = true
				//从指令集合移除
				delete this.directives['else']
			}
			
			//解析其他指令
			for (let name in this.directives) {
				//指令未定义报错
				if (!state.$directives[name]) {
					throw new Error(`The @${name} directive is undefined`)
				}
				//存储表达式对应的真实的值
				this.directives[name] = {
					exp:this.directives[name].exp,
					modifier:this.directives[name].modifier,
					value:this.parseExpression(scope, this.directives[name].exp)
				}
			}
			
			//初始化属性
			let attrs = {}
			for (let attr in this.attrs) {
				let realAttrName = ''
				let realAttrValue = null
				//真实属性名称解析
				realAttrName = this.parseText(scope, attr)
				//判断属性值是否只是一对{{}}
				let matchArray = this.attrs[attr].match(/^\{\{(.*?)\}\}$/g)
				//一对{{}}
				if (matchArray) {
					const endIndex = this.attrs[attr].trim().length - 2
					const exp = this.attrs[attr].trim().substring(2, endIndex)
					//解析成数据
					realAttrValue = this.parseExpression(scope, exp)
				}
				else {
					//直接解析为字符串
					realAttrValue = this.parseText(scope, this.attrs[attr])
				}
				//属性为空字符串的话，直接设为true
				if(realAttrValue === ''){
					realAttrValue = true
				}
				attrs[realAttrName] = realAttrValue
			}
			this.attrs = attrs
			
			//初始化样式，此时this.cls为字符串
			if(this.cls){
				//判断样式值是否只是一对{{}}
				let clsMatchArray = this.cls.match(/^\{\{(.*?)\}\}$/g)
				let cls = {}
				//一对{{}}
				if (clsMatchArray) {
					const endIndex = this.cls.trim().length - 2
					const exp = this.cls.trim().substring(2, endIndex)
					//解析成数据
					let data = this.parseExpression(scope, exp)
					//如果是数组，转为对象
					if(Array.isArray(data)){
						data.forEach(item=>{
							cls[item] = true
						})
					}
					//如果是对象直接存储
					else if(typeof data == 'object' && data){
						cls = Object.assign({},data)
					}
					//如果是字符串
					else if(typeof data == 'string' && data){
						cls[data] = true
					}
				}
				//其他情况
				else {
					//直接解析为字符串后以空格划分为数组，然后转为对象
					this.parseText(scope, this.cls).split(/\s+/g).forEach(item=>{
						cls[item] = true
					})
				}
				this.cls = cls
			}else {
				this.cls = {}
			}
			
			//初始化事件
			for (let eventName in this.events) {
				this.events[eventName] = this.eventHandler(scope, eventName)
			}
		}
		//文本节点初始化
		else if(this.nodeType == 3){
			this.text = this.parseText(scope, this.text)
		}
		//递归对子节点进行初始化
		this.children.forEach(childVnode => {
			childVnode.init(state)
		})
	}
	
	/**
	 * 事件数据初始化，返回事件方法、修饰符和回调参数
	 * @param {Object} scope 
	 * @param {String} eventName
	 */
	eventHandler(scope, eventName) {
		//定义处理函数
		let handler = null
		//定义回调参数
		let params = []
		//获取修饰符
		let modifier = this.events[eventName].modifier
		if(!this.events[eventName].handler){
			throw new TypeError('The value of #' + eventName + ' shoud not be undefined')
		}
		//判断是否有参数
		let res = /(.*)+\((.*)\)/g.exec(this.events[eventName].handler)
		//有参数
		if (res) {
			//解析函数
			handler = this.parseExpression(scope, res[1])
			//获取参数
			if (res[2]) {
				params = res[2].split(',').map(value => {
					return this.parseExpression(scope, value)
				})
			}
		}
		//无参数
		else {
			//解析函数
			handler = this.parseExpression(scope, this.events[eventName].handler)
			//如果解析结果不是函数，则直接作为字符串带过去
			if(typeof handler != 'function'){
				handler = this.events[eventName].handler
			}
		}
		return {
			handler,
			params,
			modifier
		}
	}

	/**
	 * 处理组件渲染
	 * @param {State} state state实例
	 */
	dealComponent(state) {
		//获取组件的名称
		let name = this.tag.toLocaleLowerCase()
		//如果该组件名称为自定义组件
		if (state.$components[name]) {
			//获取自定义属性
			let props = {}
			for(let key in this.attrs){
				if(state.$components[name].props.includes(key)){
					props[key] = this.attrs[key]
					delete this.attrs[key]
				}
			}
			//获取自定义组件的注册函数的返回值
			let template = state.$components[name].render.apply(state.$data,[props])
			//如果不返回任何值直接报错
			if (!template) {
				throw new Error('The template for component "' + name + '" is invalid')
			}
			let vnode = null
			//如果返回值是字符串，则表示通过模板渲染组件
			if (typeof template == 'string') {
				let div = document.createElement('div')
				div.innerHTML = template.trim()
				//只取第一个节点作为组件根元素
				let el = div.childNodes[0]
				//只能创建元素节点
				if (el.nodeType != 1) {
					throw new TypeError('The template for component "' + name + '" is invalid')
				}
				//调用state的_compile方法构建该元素的虚拟节点树
				vnode = state._compile(this.id, el)
				//虚拟节点树的for循环处理
				vnode.dealFor(state)
				//初始化虚拟节点树
				vnode.init(state)
			}
			//如果是对象，则表示通过h函数创建组件
			else if (typeof template == 'object') {
				//创建一个虚拟节点，此时虚拟节点的数据都是初始化后的，无需再次初始化
				vnode = new VNode(template.tag, template.attrs, template.cls, template.directives, template.events,
					undefined, this.id, 1)
				//创建其子节点
				vnode.createChildrenVnodes(template)
				//设置虚拟节点是否渲染
				vnode.if = template._if
			}
			//当虚拟节点创建完毕
			if (vnode) {
				//递归进行组件渲染
				vnode.dealComponent(state)
				//设置父节点
				vnode.parent = this.parent
				//合并原节点和新建节点的事件集
				vnode.events = Object.assign(vnode.events, this.events)
				//合并原节点和新建节点的指令集
				vnode.directives = Object.assign(vnode.directives, this.directives)
				//合并原节点和新建节点的样式类集
				vnode.cls = Object.assign(vnode.cls, this.cls)
				//合并非自定义属性的属性集
				vnode.attrs = Object.assign(vnode.attrs,this.attrs)
				//插入当前节点的位置，并删除当前节点
				let index = this.getIndex()
				this.parent.children.splice(index, 1, vnode)
			}
		}
		//非自定义组件则递归遍历子节点，进行相同的处理
		else {
			this.children.forEach(childVnode => {
				childVnode.dealComponent(state)
			})
		}
	}
	
	/**
	 * 根据template对象创建子节点
	 * @param {Object} template
	 */
	createChildrenVnodes(template) {
		//text属性明确不存在时，根据slots来创建子节点
		if (template.text === undefined || template.text === null) {
			template.slots.forEach((slot, i) => {
				//创建一个已经初始化完毕的虚拟节点
				let vnode = new VNode(slot.tag, slot.attrs, slot.cls, slot.directives, slot.events,
					undefined, this.id + '_' + i, 1)
				this.children.push(vnode)
				vnode.createChildrenVnodes(slot)
			})
		}
		//根据text创建子节点
		else {
			const textNode = document.createTextNode(template.text)
			let vnode = new VNode(textNode.nodeName, {}, {}, {}, {}, template.text, this.id + '_0', textNode
				.nodeType)
			this.children = [vnode]
		}
	}

	/**
	 * 触发自定义指令的钩子函数(只有旧节点执行)
	 * @param {State} state State实例
	 * @param {String} hook 钩子名称 
	 * @param {Boolean} handlerChildren 是否处理子节点指令，默认为true
	 */
	dealDirectives(state, hook, handlerChildren = true) {
		//如果该节点为不渲染节点，直接返回
		if (!this.if) {
			return
		}
		//该节点非元素节点，直接返回
		if (this.nodeType != 1) {
			return
		}
		//遍历指令集合
		for (let name in this.directives) {
			//获取指令的钩子函数集合
			let handler = state.$directives[name]
			//回调参数设置
			let data = []
			//获取表达式
			let exp = this.directives[name].exp
			//获取修饰符
			let modifier = this.directives[name].modifier
			//获取值
			let value = this.directives[name].value
			//beforeMount和unmounted钩子函数的回调参数无el元素
			if (hook == 'beforeMount' || hook == 'unmounted') {
				//回调参数为value,modifier,exp,vnode
				data = [value, modifier, exp, this]
			} else {
				//回调参数为el,value,modifier,exp,vnode
				data = [this.elm, value, modifier, exp, this]
			}
			//如果该钩子函数存在直接调用
			if (handler[hook]) {
				handler[hook].apply(state.$data, data)
			}
		}
		//递归调用进行子节点指令处理
		if (handlerChildren) {
			this.children.forEach(childVnode => {
				childVnode.dealDirectives(state, hook)
			})
		}
	}

	/**
	 * 生成真实dom(只有旧节点执行)
	 * @param {State} state State实例对象
	 */
	render(state) {
		let el = null
		//如果不渲染此节点，则直接创建一个注释节点
		if (!this.if) {
			this.elm = document.createComment('@if')
			return
		}
		// 元素节点
		if (this.nodeType == 1) {
			//创建元素
			el = document.createElement(this.tag)
			//设置样式
			let cls = []
			for (let item in this.cls) {
				if(this.cls[item]){
					cls.push(item)
				}
			}
			if(cls.length){
				el.setAttribute('class', cls.join(' '))
			}
			//设置属性
			for (let attr in this.attrs) {
				//获取属性值
				let val = this.attrs[attr]
				//val只要不是false、null、undefined则设置属性
				if (!(val === false || val === null || val === undefined)) {
					//属性值明确为true时，则直接设置属性而不设置值
					if (val === true) {
						val = ''
					}
					//属性值为对象，则转为字符串
					if (typeof val === 'object') {
						val = JSON.stringify(val)
					}
					//其他情况直接转字符串
					val = String(val)
					//设置属性
					el.setAttribute(attr, val)
				}
			}
			//设置事件
			for (let eventName in this.events) {
				el.addEventListener(eventName, e=>{
					//self修饰符
					if(this.events[eventName].modifier && this.events[eventName].modifier.includes('self')){
						if(e.currentTarget != e.target){
							return
						}
					}
					//stop修饰符
					if(this.events[eventName].modifier && this.events[eventName].modifier.includes('stop')){
						e.stopPropagation()
					}
					//prevent修饰符
					if(this.events[eventName].modifier && this.events[eventName].modifier.includes('prevent') && e.cancelable){
						e.preventDefault()
					}
					if(typeof this.events[eventName].handler == 'function'){
						//事件回调参数第一个永远固定为event，后面则是定义的参数
						this.events[eventName].handler.apply(state.$data, [e, ...this.events[eventName].params])
					}else {
						let h = this.executeExpression(state.$data,this.events[eventName].handler)
						h(state.$data)
					}
				},{
					once:this.events[eventName].modifier && this.events[eventName].modifier.includes('once'),
					capture:this.events[eventName].modifier && this.events[eventName].modifier.includes('capture'),
					passive:this.events[eventName].modifier && this.events[eventName].modifier.includes('passive')
				})
			}
			//遍历子节点
			this.children.forEach(childVNode => {
				//对子节点进行render处理
				childVNode.render(state)
				//子节点元素加入父节点
				el.appendChild(childVNode.elm)
			})
		}
		//文本节点
		else if (this.nodeType == 3) {
			el = document.createTextNode(this.text);
		}
		//注释节点
		else if (this.nodeType == 8) {
			el = document.createComment(this.text)
		}
		this.elm = el
	}

	/**
	 * 判断身为新旧节点的两个节点是否值得比较
	 * @param {VNode} oldVNode
	 */
	isSame(oldVnode) {
		return this.tag === oldVnode.tag && this.nodeType === oldVnode.nodeType && this.if === oldVnode.if && this.useIf === oldVnode.useIf
		&& this.useElseIf === oldVnode.useElseIf && this.useElse === oldVnode.useElse
	}

	/**
	 * 跟旧节点相比，获取指定字段新增、修改和移除的值
	 * @param {VNode} oldVnode 旧虚拟节点
	 * @param {String} key 指定字段，如attrs
	 * @param {Number} type 0表示获取修改的，1表示新增的，2表示获取移除的 
	 */
	compare(oldVnode, key, type) {
		let res = {}
		if (type == 0) {
			for (let item in this[key]) {
				if (oldVnode[key].hasOwnProperty(item) && JSON.stringify(oldVnode[key][item]) !== JSON.stringify(this[key][item])) {
					res[item] = this[key][item]
				}
			}
		} else if (type == 1) {
			for (let item in this[key]) {
				if (!oldVnode[key].hasOwnProperty(item)) {
					res[item] = this[key][item]
				}
			}
		} else if (type == 2) {
			for (let item in oldVnode[key]) {
				//如果新节点没有
				if (!this[key].hasOwnProperty(item)) {
					res[item] = oldVnode[key][item]
				}
			}
		}
		return res
	}

	/**
	 * 获取当前节点及父/祖先节点的forData
	 */
	getForData(){
		let data = {}
		Object.assign(data,this.forData)
		if(this.parent){
			Object.assign(data,this.parent.getForData())
		}
		return data
	}

	/**
	 * 获取当前节点及父/祖先节点的forRes
	 */
	getForRes(){
		let data = []
		let obj = this
		while(obj){
			if(JSON.stringify(obj.forRes) != '{}'){
				let res = Object.assign({},obj.forRes)
				data.unshift(res)
			}
			obj = obj.parent
		}
		return data
	}

	/**
	 * 复制该节点(只有新节点执行，且该新节点是已经初始化的节点)
	 */
	copy() {
		let id = this.id
		let tag = this.tag
		let directives = Object.assign({}, this.directives)
		let attrs = Object.assign({}, this.attrs)
		let cls = Object.assign({},this.cls)
		let events = Object.assign({}, this.events)
		let text = this.text
		let nodeType = this.nodeType
		let vnode = new VNode(tag, attrs, cls, directives, events, text, id, nodeType)
		vnode.if = this.if
		vnode.isCloned = this.isCloned
		vnode.forData = Object.assign({},this.forData)
		vnode.forRes = Object.assign({},this.forRes)
		vnode.useIf = this.useIf
		vnode.useElseIf = this.useElseIf
		vnode.useElse = this.useElse
		let children = []
		//遍历子节点进行复制
		for (let child of this.children) {
			let newChild = child.copy()
			//子节点的父节点设为新复制的节点
			newChild.parent = vnode
			children.push(newChild)
		}
		vnode.children = children
		return vnode
	}

	/**
	 * 克隆一个节点(节点尚未初始化)
	 * @param {Number} i 节点在父节点中的序列
	 * @param {Object} res for循环的数据
	 * @param {Number} index for循环克隆时的序列
	 * @param {String} key for循环的key
	 */
	clone(i, res, index, key) {
		let id = this.id + '_copy_' + i
		let tag = this.tag
		let directives = Object.assign({}, this.directives)
		let attrs = Object.assign({}, this.attrs)
		let cls = this.cls
		let events = Object.assign({}, this.events)
		let text = this.text
		let nodeType = this.nodeType
		//创建新节点
		let vnode = new VNode(tag, attrs, cls, directives, events, text, id, nodeType)
		//设置克隆属性
		vnode.isCloned = true
		//forData赋值
		if (key) {
			vnode.forData[res.item] = res.for[key]
			vnode.forData[res.index] = index
			vnode.forData[res.key] = key
		} else {
			vnode.forData[res.item] = res.for[index]
			vnode.forData[res.index] = index
		}
		//forRes赋值
		vnode.forRes = Object.assign({},res)
		//克隆其子节点
		let children = []
		for (let k in this.children) {
			let newChild = this.children[k].clone(k, res, index, key)
			newChild.parent = vnode
			children.push(newChild)
		}
		vnode.children = children
		return vnode
	}

	/**
	 * 判断当前节点与旧节点是否相等(只有新节点执行，且新旧节点都已经初始化)
	 * @param {Object} oldVnode
	 */
	equal(oldVnode) {
		if (this.id != oldVnode.id || this.tag != oldVnode.tag || this.nodeType != oldVnode.nodeType || this.if !=
			oldVnode.if || this.isCloned != oldVnode.isCloned || this.useIf != oldVnode.useIf || this.useElseIf != oldVnode.useElseIf
			|| this.useElse != oldVnode.useElse) {
			return false
		}
		if (this.nodeType == 1) {
			if (JSON.stringify(this.attrs) != JSON.stringify(oldVnode.attrs)) {
				return false
			}
			if (JSON.stringify(this.cls) != JSON.stringify(oldVnode.cls)) {
				return false
			}
			if (JSON.stringify(this.directives) != JSON.stringify(oldVnode.directives)) {
				return false
			}
			if (JSON.stringify(this.events) != JSON.stringify(oldVnode.events)) {
				return false
			}
			if (this.children.length != oldVnode.children.length) {
				return false
			}
			return this.children.every((child, index) => {
				return child.equal(oldVnode.children[index])
			})
		} else {
			if (this.text != oldVnode.text) {
				return false
			}
		}
		return true
	}

	/**
	 * 获取上一个兄弟元素节点
	 */
	getPrevBrotherNode(){
		//获取当前节点在父节点的位置
		let index = this.getIndex()
		if(index <= 0){
			return null
		}
		let brotherNode = this.parent.children[index-1]
		if(brotherNode.nodeType != 1){
			brotherNode = brotherNode.getPrevBrotherNode()
		}
		return brotherNode
	}

	/**
	 * 获取虚拟节点在父节点中的序列
	 */
	getIndex() {
		let index = -1
		if(this.parent){
			let length = this.parent.children.length
			for (let i = 0; i < length; i++) {
				if (this.parent.children[i] === this) {
					index = i
					break
				}
			}
		}
		return index
	}

	/**
	 * 解析for指令数据
	 * @param {Object} scope
	 * @param {String} expression
	 */
	parseFor(scope, expression) {
		let match = expression.match(/([^]*?)\s+(?:in|of)\s+([^]*)/)
		if (!match) {
			return
		}
		const forObj = this.parseExpression(scope, match[2].trim())
		let alias = match[1].trim().replace(/[\(\)]/g, '').trim().split(',')
		let res = {
			for: forObj,
			item: alias[0].trim(),
			exp:match[2].trim()
		}
		//遍历的是数组
		if (Array.isArray(forObj)) {
			if (alias.length > 1) {
				res.index = alias[1].trim()
			}else {
				res.index = 'index'
			}
		}
		//遍历对象
		else if (typeof forObj == 'object' && forObj) {
			if (alias.length > 1) {
				res.key = alias[1].trim()
			}else {
				res.key = 'key'
			}
			if (alias.length > 2) {
				res.index = alias[2].trim()
			}else {
				res.index = 'index'
			}
		}
		return res
	}

	/**
	 * 解析含{{}}字符串
	 * @param {Object} scope
	 * @param {String} text
	 */
	parseText(scope, text) {
		return text.replace(/\{\{(.*?)\}\}/g, (match, expression) => {
			let res = this.parseExpression(scope, expression.trim())
			if (typeof res === 'object') {
				return JSON.stringify(res)
			}
			return String(res)
		})
	}

	/**
	 * 解析字符串表达式，计算结果
	 * @param {Object} scope 作用域对象
	 * @param {String} expression 表达式字符串
	 */
	parseExpression(scope, expression) {
		let code = ''
		//动态生成变量声明代码
		for (let key in scope) {
			code += `let ${key} = scope['${key}'];`
		}
		code += `return ${expression}`
		//在代码块的前后追加代码声明
		let nf = new Function("scope", code)
		//执行代码块并且返回结果
		return nf(scope)
	}
	
	/**
	 * 返回事件指向的表达式字符串封装函数，用于事件值为表达式的情况
	 * @param {Object} scope
	 * @param {Object} expression
	 */
	executeExpression(scope, expression) {
		let code = ''
		//动态生成变量声明代码
		for (let key in scope) {
			code += `let ${key} = scope['${key}'];`
		}
		code += `${expression};`
		for (let key in scope){
			code += `scope['${key}'] = ${key};`
		}
		//在代码块的前后追加代码声明
		let nf = new Function("scope", code)
		//执行代码块并且返回结果
		return nf
	}
}

module.exports = VNode
