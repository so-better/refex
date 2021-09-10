const util = require('./util')
/**
 * 虚拟节点
 */
class VNode {
	constructor(uid, tag, nodeType, attrs, classes, directives, events, text) {
		//节点id
		this.uid = uid
		//标签名称
		this.tag = tag
		//节点类型
		this.nodeType = nodeType
		//属性集合
		this.attrs = attrs
		//样式类集合
		this.classes = classes
		//指令集合
		this.directives = directives
		//事件集合
		this.events = events
		//节点文字
		this.text = text
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
		//0示使用了if指令，1表示使用了else-if指令，2表示使用了else指令，-1表示以上皆未使用
		this.ifType = -1
	}

	/**
	 * 处理for指令克隆节点
	 * @param {State} state State实例
	 */
	dealFor(state) {
		//该节点含有for指令，即需要进行克隆处理
		if (this.directives['for']) {
			let exp = this.directives['for'].exp
			//原directives集合中去除for
			delete this.directives['for']
			//设置作用域
			let scope = util.getOriginalData(state.$data)
			Object.assign(scope, this.getForData())
			//解析for指令表达式
			const res = util.parseFor(state.$data, scope, exp)
			//表达式不合法
			if (!res) {
				throw new Error(`Invalid @for expression: ${exp}`)
			}
			//获取当前虚拟节点在父节点中的位置
			const dex = this.getIndex()
			//创建一个空数组存放克隆的节点
			let cloneVNodes = []
			//如果循环的是数组
			if (Array.isArray(res.for)) {
				let length = res.for.length
				//遍历数组
				for (let i = 0; i < length; i++) {
					//克隆节点
					let copyVn = this.clone(i)
					//设置父节点
					copyVn.parent = this.parent
					//设置forData的值
					copyVn.forData[res.item] = res.for[i]
					copyVn.forData[res.index] = i
					//加入数组中
					cloneVNodes.push(copyVn)
					//递归处理子节点的for指令
					copyVn.children.forEach(childVNode => {
						childVNode.dealFor(state)
					})
				}
			}
			//如果循环的是对象
			else if (typeof res.for == 'object' && res.for) {
				//遍历对象
				Object.keys(res.for).forEach((key, index) => {
					//克隆节点
					let copyVn = this.clone(index)
					//设置父节点
					copyVn.parent = this.parent
					//设置forData的值
					copyVn.forData[res.item] = res.for[key]
					copyVn.forData[res.index] = index
					copyVn.forData[res.key] = key
					//加入数组
					cloneVNodes.push(copyVn)
					//递归处理子节点的for指令
					copyVn.children.forEach(childVNode => {
						childVNode.dealFor(state)
					})
				})
			}
			//删除该节点，添加克隆的节点
			this.parent.children.splice(dex, 1, ...cloneVNodes)
		}
		//该节点无需进行克隆处理，进行递归遍历子节点
		else {
			this.children.forEach(childVNode => {
				childVNode.dealFor(state)
			})
		}
	}

	/**
	 * 虚拟节点的数据初始化：将一个未初始化的虚拟节点转为含有真实数据的虚拟节点
	 * @param {State} state State实例
	 */
	init(state) {
		//设置作用域
		let scope = util.getOriginalData(state.$data)
		Object.assign(scope, this.getForData())
		//元素节点进行初始化
		if (this.nodeType == 1) {
			//if指令提取出来，单独作为if属性
			if (this.directives['if']) {
				//使用if时同时存在else-if、else则报错
				if (this.directives['else-if'] || this.directives['else']) {
					throw new Error('"@if" and "@else-if" and "@else" cannot be used on the same node')
				}
				//解析指令的表达式值
				this.if = util.parseExp2(state.$data, scope, this.directives['if'].exp)
				//进行标记
				this.ifType = 0
				//从指令集合移除
				delete this.directives['if']
			}

			//else-if指令提取出来，单独作为if属性
			if (this.directives['else-if']) {
				//使用else-if时同时存在else则报错
				if (this.directives['else']) {
					throw new Error('"@else-if" and "@else" cannot be used on the same node')
				}
				//获取上一个兄弟节点
				let brotherNode = this.getPrevBrotherNode()
				//上一个兄弟节点不存在或者没有使用@if则直接报错
				if (!brotherNode || brotherNode.ifType != 0) {
					throw new Error('"@else-if" cannot be used alone')
				}
				//上一个兄弟节点的if为true则不渲染
				if (brotherNode.if) {
					this.if = false
				} else {
					//解析指令的表达式值
					this.if = util.parseExp2(state.$data, scope, this.directives['else-if'].exp)
				}
				//进行标记
				this.ifType = 1
				//从指令集合移除
				delete this.directives['else-if']
			}

			//else指令提取出来，单独作为if属性
			if (this.directives['else']) {
				//获取上一个兄弟节点
				let brotherNode = this.getPrevBrotherNode()
				//上一个兄弟节点不存在或者没有使用@if和@else-if，则直接报错
				if (!brotherNode || (brotherNode.ifType != 0 && brotherNode.ifType != 1)) {
					throw new Error('"@else" cannot be used alone')
				}
				//上一个兄弟节点使用的是@if
				if (brotherNode.ifType == 0) {
					if (brotherNode.if) {
						this.if = false
					} else {
						this.if = true
					}
				}
				//上一个兄弟节点使用的是@else-if
				else if (brotherNode.ifType == 1) {
					//获取该节点的上一个兄弟节点
					let brotherNode2 = brotherNode.getPrevBrotherNode()
					//该节点的上一个兄弟节点没有使用@if直接报错
					if (!brotherNode2 || brotherNode2.ifType != 0) {
						throw new Error('"@else" cannot be used alone')
					}
					if (brotherNode.if || brotherNode2.if) {
						this.if = false
					} else {
						this.if = true
					}
				}
				//进行标记
				this.ifType = 2
				//从指令集合移除
				delete this.directives['else']
			}

			//解析其他指令
			let directives = {}
			for (let name in this.directives) {
				//真实指令名称解析
				let realName = util.parseText(state.$data, scope, name)
				//指令未定义报错
				if (!state.$directives[realName]) {
					throw new Error(`The @${realName} directive is undefined`)
				}
				let modifier = {}
				this.directives[name].modifier.forEach(mod=>{
					modifier[mod] = true
				})
				//存储表达式对应的真实的值
				directives[realName] = {
					exp: this.directives[name].exp,
					modifier: modifier,
					value: util.parseExp2(state.$data, scope, this.directives[name].exp)
				}
			}
			this.directives = directives

			//初始化属性
			let attrs = {}
			for (let attr in this.attrs) {
				let realAttrName = ''
				let realAttrValue = null
				//真实属性名称解析
				realAttrName = util.parseText(state.$data, scope, attr)
				//获取{{}}解析结果的个数
				let matchArray = this.attrs[attr].match(/\{\{(.*?)\}\}/g)
				//属性值是否都是在{{}}内
				let matchArray2 = this.attrs[attr].match(/^\{\{(.*?)\}\}$/g)
				//一对{{}}
				if (matchArray && matchArray2 && matchArray.length == 1) {
					const endIndex = this.attrs[attr].trim().length - 2
					const exp = this.attrs[attr].trim().substring(2, endIndex)
					//解析成数据
					realAttrValue = util.parseExp2(state.$data, scope, exp)
				} else {
					//直接解析为字符串
					realAttrValue = util.parseText(state.$data, scope, this.attrs[attr])
				}
				//属性为空字符串的话，直接设为true
				if (realAttrValue === '') {
					realAttrValue = true
				}
				attrs[realAttrName] = realAttrValue
			}
			this.attrs = attrs

			//初始化样式，此时this.classes为字符串
			if (this.classes) {
				let classes = {}
				//判断样式值是否只是一对{{}}
				let matchArray = this.classes.match(/\{\{(.*?)\}\}/g)
				let matchArray2 = this.classes.match(/^\{\{(.*?)\}\}$/g)
				if (matchArray && matchArray2 && matchArray.length == 1) {
					const endIndex = this.classes.trim().length - 2
					const exp = this.classes.trim().substring(2, endIndex)
					//解析成数据
					let data = util.parseExp2(state.$data, scope, exp)
					//如果是数组，转为对象
					if (Array.isArray(data)) {
						data.forEach(item => {
							classes[item] = true
						})
					}
					//如果是对象直接存储
					else if (typeof data == 'object' && data) {
						classes = Object.assign({}, data)
					}
					//其他
					else {
						data = util.string(data)
						classes[data] = true
					}
				}
				//其他情况
				else {
					//直接解析为字符串后以空格划分为数组，然后转为对象
					util.parseText(state.$data, scope, this.classes).split(/\s+/g).forEach(item => {
						classes[item] = true
					})
				}
				this.classes = classes
			} else {
				this.classes = {}
			}

			//初始化事件
			let events = {}
			for (let eventName in this.events) {
				//真实事件名称解析
				let realEventName = util.parseText(state.$data, scope, eventName)
				events[realEventName] = this.eventHandler(scope, realEventName, this.events[eventName].handler, this.events[eventName].modifier)
			}
			this.events = events
		}
		//文本节点初始化
		else if (this.nodeType == 3) {
			this.text = util.parseText(state.$data, scope, this.text)
		}
		//递归对子节点进行初始化
		this.children.forEach(childVNode => {
			childVNode.init(state)
		})
	}

	/**
	 * 事件数据初始化，返回事件方法、修饰符和回调参数
	 * @param {Object} scope
	 * @param {String} eventName
	 * @param {Function} handler 
	 * @param {Array} modifier 
	 */
	eventHandler(scope, eventName, handler, modifier) {
		//定义回调参数
		let params = []
		let newHandler = null
		if (!handler) {
			throw new TypeError('The value of #' + eventName + ' shoud not be undefined')
		}
		//判断是否有参数
		let res = /(.*)+\((.*)\)/g.exec(handler)
		//有参数
		if (res) {
			//解析函数
			newHandler = util.parseExp(scope, res[1])
			//获取参数
			if (res[2]) {
				params = res[2].split(',').map(value => {
					return util.parseExp(scope, value)
				})
			}
		}
		//无参数
		else {
			//解析函数
			newHandler = util.parseExp(scope, handler)
			//如果解析结果不是函数，则直接作为字符串带过去
			if (typeof newHandler != 'function') {
				newHandler = handler
			}
		}
		//转换修饰符
		let newModifier = {}
		modifier.forEach(mod=>{
			newModifier[mod] = true
		})
		return {
			handler: newHandler,
			params,
			modifier:newModifier
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
			for (let key in this.attrs) {
				if (state.$components[name].props.includes(key)) {
					props[key] = this.attrs[key]
					delete this.attrs[key]
				}
			}
			//获取自定义组件的注册函数的返回值
			let template = state.$components[name].render.apply(state.$data, [props])
			//如果不返回任何值直接报错
			if (!template) {
				throw new Error('The template for component "' + name + '" is invalid')
			}
			let vnode = null
			//如果返回值是字符串，则表示通过模板渲染组件
			if (typeof template == 'string') {
				let div = document.createElement('div')
				div.innerHTML = template.trim()
				//取第一个元素节点作为组件根元素
				let el = util.getFirstElement(div)
				//调用state的_compile方法构建该元素的虚拟节点树
				vnode = state._compile(this.uid, el)
				//虚拟节点树的for循环处理
				vnode.dealFor(state)
				//初始化虚拟节点树
				vnode.init(state)
			}
			//如果是对象，则表示通过h函数创建组件
			else if (typeof template == 'object') {
				//创建一个虚拟节点，此时虚拟节点的数据都是初始化后的，无需再次初始化
				vnode = new VNode(this.uid, template.tag, 1, template.attrs, template.classes, template.directives,
					template.events, undefined)
				//创建其子节点
				vnode.createChildrenVNodes(template)
				//设置虚拟节点是否渲染
				vnode.if = template._if
			}
			//当虚拟节点创建完毕
			if (vnode) {
				//设置父节点
				vnode.parent = this.parent
				//合并原节点和新建节点的事件集
				vnode.events = Object.assign(vnode.events, this.events)
				//合并原节点和新建节点的指令集
				vnode.directives = Object.assign(vnode.directives, this.directives)
				//合并原节点和新建节点的样式类集
				vnode.classes = Object.assign(vnode.classes, this.classes)
				//合并非自定义属性的属性集
				vnode.attrs = Object.assign(vnode.attrs, this.attrs)
				//插入当前节点的位置，并删除当前节点
				let index = this.getIndex()
				this.parent.children.splice(index, 1, vnode)
				//递归进行组件渲染
				vnode.dealComponent(state)
			}
		}
		//非自定义组件则递归遍历子节点，进行相同的处理
		else {
			this.children.forEach(childVNode => {
				childVNode.dealComponent(state)
			})
		}
	}

	/**
	 * 根据template对象创建子节点
	 * @param {Object} template
	 */
	createChildrenVNodes(template) {
		//text属性明确不存在时，根据slots来创建子节点
		if (template.text === undefined || template.text === null) {
			template.slots.forEach((slot, i) => {
				//创建一个已经初始化完毕的虚拟节点
				let vnode = new VNode(this.uid + '_' + i, slot.tag, 1, slot.attrs, slot.classes, slot
					.directives, slot.events, undefined)
				this.children.push(vnode)
				vnode.createChildrenVNodes(slot)
			})
		}
		//根据text创建子节点
		else {
			let vnode = new VNode(this.uid + '_0', '#text', 3, {}, {}, {}, {}, util.string(template.text))
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
		//如果该节点为不渲染的节点，直接返回
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
			let modifier = util.deepCopy(this.directives[name].modifier)
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
			this.children.forEach(childVNode => {
				childVNode.dealDirectives(state, hook)
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
			let classes = []
			for (let item in this.classes) {
				if (this.classes[item]) {
					classes.push(item)
				}
			}
			if (classes.length) {
				el.setAttribute('class', classes.join(' '))
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
				const fun = e => {
					//self修饰符
					if (this.events[eventName].modifier['self']) {
						if (e.currentTarget != e.target) {
							return
						}
					}
					//stop修饰符
					if (this.events[eventName].modifier['stop']) {
						e.stopPropagation()
					}
					//prevent修饰符
					if (this.events[eventName].modifier['prevent'] && e.cancelable) {
						e.preventDefault()
					}
					if (typeof this.events[eventName].handler == 'function') {
						//事件回调参数第一个永远固定为event，后面则是定义的参数
						this.events[eventName].handler.apply(state.$data, [e, ...this.events[eventName].params])
					} else {
						let h = util.executeExp(state.$data, this.events[eventName].handler)
						h(state.$data)
					}
				}
				this.events[eventName].fun = fun
				el.addEventListener(eventName, fun, {
					once: this.events[eventName].modifier['once'] ? true :false,
					capture: this.events[eventName].modifier['capture'] ? true :false,
					passive: this.events[eventName].modifier['passive'] ? true :false
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
	 * 获取当前节点及父/祖先节点的forData
	 */
	getForData() {
		let data = util.deepCopy(this.forData)
		if (this.parent) {
			Object.assign(data, this.parent.getForData())
		}
		return data
	}

	/**
	 * 复制该节点(只有新节点执行，且该新节点是已经初始化的节点)
	 */
	copy() {
		let uid = this.uid
		let tag = this.tag
		let nodeType = this.nodeType
		let attrs = util.deepCopy(this.attrs)
		let classes = util.deepCopy(this.classes)
		let directives = util.deepCopy(this.directives)
		let events = util.deepCopy(this.events)
		let text = this.text
		let vnode = new VNode(uid, tag, nodeType, attrs, classes, directives, events, text)
		vnode.if = this.if
		vnode.isCloned = this.isCloned
		vnode.forData = Object.assign({}, this.forData)
		vnode.ifType = this.ifType
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
	 * @param {Number} index for循环克隆时的序列
	 */
	clone(index) {
		let uid = this.uid + '_copy_' + index
		let tag = this.tag
		let nodeType = this.nodeType
		let attrs = util.deepCopy(this.attrs)
		let classes = util.deepCopy(this.classes)
		let directives = util.deepCopy(this.directives)
		let events = util.deepCopy(this.events)
		let text = this.text
		//创建新节点
		let vnode = new VNode(uid, tag, nodeType, attrs, classes, directives, events, text)
		//设置克隆属性
		vnode.isCloned = true
		//克隆其子节点
		let children = []
		this.children.forEach((childVNode, i) => {
			let newChild = childVNode.clone(i)
			newChild.parent = vnode
			children.push(newChild)
		})
		vnode.children = children
		return vnode
	}

	/**
	 * 获取上一个兄弟元素节点
	 */
	getPrevBrotherNode() {
		//获取当前节点在父节点的位置
		let index = this.getIndex()
		if (index <= 0) {
			return null
		}
		let brotherNode = this.parent.children[index - 1]
		if (brotherNode.nodeType != 1) {
			brotherNode = brotherNode.getPrevBrotherNode()
		}
		return brotherNode
	}

	/**
	 * 获取虚拟节点在父节点中的序列
	 */
	getIndex() {
		let index = -1
		if (this.parent) {
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
}

module.exports = VNode
