const VNode = require('./vnode')
/**
 * 数据状态管理
 */
class State {
	constructor(data) {
		//响应数据
		this.$data = this._toProxy([], data || {})
		//监听器数组
		this.$watchers = {}
		//挂载相关的虚拟节点
		this.$vnode = null
		//旧的虚拟节点
		this._vnode = null
		//保存的初始未渲染元素
		this.$template = null
		//指令集合
		this.$directives = {}
		//组件集合
		this.$components = {}
		//生命周期钩子函数
		this.onBeforeMount = function() {}
		this.onMounted = function() {}
		this.onBeforeUpdate = function() {}
		this.onUpdated = function() {}
	}

	/**
	 * 自定义组件
	 * @param {Object} name 组件名称
	 * @param {Function} handler 组件注册函数
	 */
	component(name, handler) {
		//组件名不存在报错
		if (!name) {
			throw new TypeError('You need to give the component a name')
		}
		//组件重复定义报错
		if (this.$components[name]) {
			throw new Error('The component named "' + name + '" is already defined')
		}
		//组件注册函数不存在报错
		if (typeof handler != 'function') {
			throw new TypeError('The component named "' + name + '" need to define a handling method')
		}
		//注册该组件
		this.$components[name] = handler
	}

	/**
	 * 自定义指令
	 * @param {String} name 指令名称
	 * @param {Object} handler 指令注册参数
	 */
	directive(name, handler) {
		//指令名称不存在报错
		if (!name) {
			throw new TypeError('You need to give the directive a name')
		}
		//指令重复定义报错
		if (this.$directives[name]) {
			throw new Error('The directive named "' + name + '" is already defined')
		}
		//指令钩子函数
		let beforeMount = function() {}
		let mounted = function() {}
		let beforeUpdate = function() {}
		let updated = function() {}
		let beforeUnmount = function() {}
		let unmounted = function() {}
		//如果指令注册参数是一个函数，表示mounted函数
		if (typeof handler == 'function') {
			mounted = handler
		}
		//如果指令注册参数是一个对象，进行相对的赋值
		else if (typeof handler == 'object' && handler) {
			beforeMount = handler.beforeMount || function() {}
			mounted = handler.mounted || function() {}
			beforeUpdate = handler.beforeUpdate || function() {}
			updated = handler.updated || function() {}
			beforeUnmount = handler.beforeUnmount || function() {}
			unmounted = handler.unmounted || function() {}
		}
		//注册指令
		this.$directives[name] = {
			beforeMount,
			mounted,
			beforeUpdate,
			updated,
			beforeUnmount,
			unmounted
		}
	}


	//----------------------------------------------------------------------
	//以下方法是实现vnode相关的
	//----------------------------------------------------------------------

	/**
	 * 实现挂载
	 * @param {Element} el 挂载元素
	 */
	mount(el) {
		//beforeMount生命周期函数触发
		if (typeof this.onBeforeMount == 'function') {
			this.onBeforeMount.apply(this.$data)
		}
		//校验参数
		if (!el) {
			throw new Error('You must specify an element to mount')
		}
		if (typeof el == 'string') {
			el = document.body.querySelector(el)
		}
		if (!(el instanceof Node && el.nodeType === 1)) {
			throw new TypeError('The mount element is undefined')
		}
		//保存最早的el元素
		this.$template = el.cloneNode(true)
		//生成未初始化的虚拟节点
		this.$vnode = this._compile('vnode', el)
		this._vnode = this._compile('vnode', el)
		//处理for指令进行节点克隆
		this.$vnode.dealFor(this)
		this._vnode.dealFor(this)
		//初始化虚拟节点，进行数据绑定赋值
		this.$vnode.init(this)
		this._vnode.init(this)
		//处理自定义组件的渲染
		this.$vnode.dealComponent(this)
		this._vnode.dealComponent(this)
		//触发自定义指令的beforeMount钩子函数
		this._vnode.dealDirectives(this, 'beforeMount')
		//进行dom渲染，生成新的dom
		this._vnode.render(this)
		//将新的dom插入同时删除旧的dom
		el.parentNode.insertBefore(this._vnode.elm, el)
		el.remove()
		//触发自定义指令的mounted
		this._vnode.dealDirectives(this, 'mounted')
		//mounted生命周期函数触发
		if (typeof this.onMounted == 'function') {
			this.onMounted.apply(this.$data)
		}
		//返回state对象
		return this
	}

	/**
	 * 将一个指定的元素及其子孙节点构造成一个虚拟dom树(此时虚拟dom未初始化数据)
	 * @param {String} id id
	 * @param {Node} el 目标元素
	 */
	_compile(id, el) {
		let vnode = null
		//元素节点
		if (el.nodeType == 1) {
			//定义属性的集合
			let attrs = {}
			//定义指令的集合
			let directives = {}
			//定义事件的集合
			let events = {}
			//定义样式类字段
			let cls = ''
			//遍历该元素的所有属性
			for (let item of el.attributes) {
				//@开头解析为指令
				if (item.nodeName.startsWith('@')) {
					//查找修饰符的位置
					let index = item.nodeName.indexOf(':')
					//存在修饰符
					if (index > 0) {
						//指令名称
						let directiveName = item.nodeName.substr(1, index - 1)
						//修饰符字段
						let modifier = item.nodeName.substr(index + 1)
						//加入指令集合
						if(directiveName){
							directives[directiveName] = {
								modifier: modifier || undefined,
								exp:item.nodeValue
							}
						}
					}
					//不存在修饰符
					else {
						//指令名称
						let directiveName = item.nodeName.substr(1)
						if(directiveName){
							//加入指令集合
							directives[directiveName] = {
								modifier: undefined,
								exp:item.nodeValue
							}
						}
					}
				}
				//#开头解析为事件
				else if (item.nodeName.startsWith('#')) {
					//事件解析，可能存在修饰符
					let res = item.nodeName.substr(1).split('.')
					//获取事件名称
					let eventName = res[0]
					//加入事件集合
					events[eventName] = {
						handler:item.nodeValue,
						modifier:res.filter((item,index)=>{
							return index > 0
						})
					}
				}
				//样式class单独提取出来
				else if (item.nodeName == 'class') {
					cls = item.nodeValue.trim()
				}
				//普通属性，忽略refx-cloak属性
				else if (item.nodeName != 'refex-cloak') {
					attrs[item.nodeName] = item.nodeValue
				}
			}
			//创建虚拟节点
			vnode = new VNode(el.nodeName, attrs, cls, directives, events, undefined, id, el.nodeType)
			//获取目标元素子节点
			let nodes = el.childNodes
			//子节点长度
			let length = nodes.length
			//遍历子节点
			for (let i = 0; i < length; i++) {
				//递归调用本方法进行子节点的创建
				let vn = this._compile(id + '_' + i, nodes[i])
				//如果创建成功
				if (vn) {
					//设置父节点
					vn.parent = vnode
					//加入到父节点下
					vnode.children.push(vn)
				}
			}
		}
		//文本节点或者注释节点
		else if (el.nodeType == 3 || el.nodeType == 8) {
			//直接创建
			vnode = new VNode(el.nodeName, {}, '', {}, {}, el.nodeValue, id, el.nodeType)
		}
		return vnode
	}

	/**
	 * 更新虚拟节点
	 * @param {Array} key
	 * @param {Object} newValue
	 * @param {Object} oldValue
	 */
	_updateVnodes(key, newValue, oldValue) {
		//更新虚拟节点树
		this.$vnode = this._compile('vnode', this.$template)
		//处理for指令进行节点克隆
		this.$vnode.dealFor(this)
		//初始化节点树
		this.$vnode.init(this)
		//处理自定义组件的渲染
		this.$vnode.dealComponent(this)
		//新旧根节点比较
		this._updateVnode(this.$vnode, this._vnode)
	}

	/**
	 * 比较节点进行更新
	 * @param {VNode} newVnode
	 * @param {VNode} oldVnode
	 */
	_updateVnode(newVnode, oldVnode) {
		//如果这两个节点值得比较
		if (newVnode.isSame(oldVnode)) {
			//节点是否更新
			let isUpdate = !newVnode.equal(oldVnode)
			//如果节点更新，先触发指令的beforeUpdate钩子函数
			if (isUpdate) {
				oldVnode.dealDirectives(this, 'beforeUpdate', false)
			}
			//元素节点
			if (newVnode.nodeType == 1 && oldVnode.if) {
				//更新属性
				this._updateAttrs(newVnode, oldVnode)
				//更新样式类
				this._updateClass(newVnode, oldVnode)
				//更新事件
				this._updateEvents(newVnode, oldVnode)
				//子节点进行比较
				this._updateChildren(newVnode, oldVnode)
			}
			//文本节点
			else if (newVnode.nodeType == 3) {
				//更新节点文字
				this._updateText(newVnode, oldVnode)
			}
			//节点更新，触发指令的updated钩子函数
			if (isUpdate) {
				oldVnode.dealDirectives(this, 'updated', false)
			}
		}
		//直接替换
		else {
			//复制新节点
			let vnode = newVnode.copy()
			//获取父节点
			let parent = oldVnode.parent
			//更新插入的节点的父节点
			vnode.parent = parent
			//触发自定义指令的beforeUnmount
			oldVnode.dealDirectives(this, 'beforeUnmount')
			//获取旧节点在父节点中的序列
			let index = oldVnode.getIndex()
			//删除原来的旧节点，在原来的位置上插入新建的节点
			parent.children.splice(index, 1, vnode)
			//触发自定义指令的beforeMount
			vnode.dealDirectives(this, 'beforeMount')
			//渲染该节点
			vnode.render(this)
			//将节点元素插入原来的位置
			oldVnode.elm.parentNode.insertBefore(vnode.elm, oldVnode.elm)
			//删除原来的dom元素
			oldVnode.elm.remove()
			//触发自定义指令的unmounted
			oldVnode.dealDirectives(this, 'unmounted')
			//触发自定义指令的mounted
			vnode.dealDirectives(this, 'mounted')
		}
	}

	/**
	 * 更新子节点
	 * @param {VNode} newVnode
	 * @param {VNode} oldVnode
	 */
	_updateChildren(newVnode, oldVnode) {
		//子节点数目一致
		if (newVnode.children.length == oldVnode.children.length) {
			//递归比较子节点
			for (let nchild of newVnode.children) {
				for (let ochild of oldVnode.children) {
					//新旧节点树中只有同等id的节点才会被比较
					if (nchild.id === ochild.id) {
						this._updateVnode(nchild, ochild)
					}
				}
			}
		}
		//子节点数目不一致，直接更新子节点数组，并且更新dom
		else {
			oldVnode.children.forEach(childVnode => {
				//触发自定义指令的beforeMount
				childVnode.dealDirectives(this, 'beforeUnmount')
			})
			oldVnode.elm.innerHTML = ''
			oldVnode.children.forEach(childVnode => {
				//触发自定义指令的unmounted
				childVnode.dealDirectives(this, 'unmounted')
			})
			oldVnode.children = [...newVnode.children]
			oldVnode.children.forEach(childVnode => {
				//触发自定义指令的beforeMount
				childVnode.dealDirectives(this, 'beforeMount')
				childVnode.render(this)
				//插入元素
				oldVnode.elm.appendChild(childVnode.elm)
				//触发自定义指令的mounted
				childVnode.dealDirectives(this, 'mounted')
			})
		}
	}

	/**
	 * 更新文字
	 * @param {VNode} newVnode
	 * @param {VNode} oldVnode
	 */
	_updateText(newVnode, oldVnode) {
		if (newVnode.text !== oldVnode.text) {
			oldVnode.text = newVnode.text
			oldVnode.elm.nodeValue = oldVnode.text
		}
	}

	/**
	 * 更新事件
	 * @param {VNode} newVnode
	 * @param {VNode} oldVnode
	 */
	_updateEvents(newVnode, oldVnode) {
		//获取修改的事件
		let updateEvents = newVnode.compare(oldVnode, 'events', 0)
		for (let eventName in updateEvents) {
			oldVnode.events[eventName] = updateEvents[eventName]
		}
		//获取新增的事件
		let addEvents = newVnode.compare(oldVnode, 'events', 1)
		for (let eventName in addEvents) {
			oldVnode.events[eventName] = addEvents[eventName]
			const fun = e=>{
				//self修饰符
				if(oldVnode.events[eventName].modifier.includes('self')){
					if(e.currentTarget != e.target){
						return
					}
				}
				//stop修饰符
				if(oldVnode.events[eventName].modifier.includes('stop')){
					e.stopPropagation()
				}
				//prevent修饰符
				if(oldVnode.events[eventName].modifier.includes('prevent') && e.cancelable){
					e.preventDefault()
				}
				//执行事件函数
				if(typeof oldVnode.events[eventName].handler == 'function'){
					//事件回调参数第一个永远固定为event，后面则是定义的参数
					oldVnode.events[eventName].handler.apply(this.$data, [e, ...oldVnode.events[eventName].params])
				}else {
					let h = oldVnode.executeExpression(this.$data,oldVnode.events[eventName].handler)
					h(this.$data)
				}
				//once修饰符
				if(oldVnode.events[eventName].modifier.includes('once')){
					e.currentTarget.removeEventListener(eventName,fun)
				}
			}
			oldVnode.elm.addEventListener(eventName, fun)
		}
	}

	/**
	 * 更新样式类
	 * @param {VNode} newVnode
	 * @param {VNode} oldVnode
	 */
	_updateClass(newVnode, oldVnode) {
		//样式发生了变化
		if(JSON.stringify(newVnode.cls) != JSON.stringify(oldVnode.cls)){
			let cls = []
			for (let item in newVnode.cls) {
				if(newVnode.cls[item]){
					cls.push(item)
				}
			}
			if(cls.length){
				oldVnode.elm.setAttribute('class', cls.join(' '))
			}else {
				oldVnode.elm.removeAttribute('class')
			}
		}
	}

	/**
	 * 更新属性
	 * @param {VNode} newVnode
	 * @param {VNode} oldVnode
	 */
	_updateAttrs(newVnode, oldVnode) {
		//获取新增或者修改的属性
		let a = newVnode.compare(oldVnode, 'attrs', 0)
		let b = newVnode.compare(oldVnode, 'attrs', 1)
		let updateAttrs = Object.assign(a, b)
		//进行更新操作
		for (let attr in updateAttrs) {
			let val = updateAttrs[attr]
			oldVnode.attrs[attr] = val
			//val是false、null、undefined则移除属性
			if (val === false || val === null || val === undefined) {
				oldVnode.elm.removeAttribute(attr)
			}
			//否则设置属性值
			else {
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
				oldVnode.elm.setAttribute(attr, val)
			}
		}
		//获取移除的属性
		let removeAttrs = newVnode.compare(oldVnode, 'attrs', 2)
		//进行移除操作
		for (let attr in removeAttrs) {
			delete oldVnode.attrs[attr]
			oldVnode.elm.removeAttribute(attr)
		}
	}


	//----------------------------------------------------------------------
	//以下方法是实现数据代理和变更监听的
	//----------------------------------------------------------------------

	/**
	 * 对外提供的进行监听的方法
	 * @param {String} property 监听属性
	 * @param {Function} handler 监听函数
	 */
	watch(property, handler) {
		//监听的属性未定义报错
		if (!property) {
			throw new TypeError('You must specify a property to watch')
		}
		//监听的属性不是字符串
		if (typeof property != 'string') {
			throw new TypeError('The watch property expected a string')
		}
		//如果监听函数非函数类型默认为空函数
		if (typeof handler != 'function') {
			handler = function() {}
		}
		//将监听属性字符串解析成特定形式的新字符串作为key
		const key = this._parseProperty(property)
		//特定属性的监听已存在
		if (this.$watchers[key]) {
			throw new Error('The watcher for "' + property + '" is already defined')
		}
		//注册该监听
		this.$watchers[key] = handler
		//返回该实例
		return this
	}

	/**
	 * 解除监听
	 * @param {String} property 监听的属性
	 */
	unwatch(property) {
		//解除该属性监听
		if (typeof property == 'string') {
			//将监听属性字符串解析生成点间隔符的新字符串作为存储监听器的key
			const key = this._parseProperty(property)
			//如果存在该key的监听器则进行移除
			if (this.$watchers[key]) {
				delete this.$watchers[key]
			}
		}
		//解除全部监听
		else {
			this.$watchers = {}
		}
		//返回该实例
		return this
	}

	/**
	 * 将普通对象转为proxy对象
	 * @param {Array} parentKeys 值为对象的元素上级父属性数组
	 * @param {Object} data 源数据对象
	 * @param {String} parentKey 值为对象的元素属性名称
	 */
	_toProxy(parentKeys, data, parentKey) {
		let keys = [...parentKeys]
		if (!this._isObject(data)) {
			throw new TypeError('Cannot create proxy with a non-object as target or handler')
		}
		if (parentKey) {
			keys.push(parentKey)
		}
		//遍历data的属性
		for (let key in data) {
			//属性值为对象的则再次转为proxy对象
			if (this._isObject(data[key])) {
				data[key] = this._toProxy(keys, data[key], key)
			}
		}
		const handler = {
			get: (target, property) => {
				return this._getter(keys, target, property)
			},
			set: (target, property, value) => {
				return this._setter(keys, target, property, value)
			},
			deleteProperty: (target, property) => {
				return this._setter(keys, target, property, undefined)
			}
		}
		return new Proxy(data, handler)
	}

	/**
	 * 获取属性值监听
	 * @param {Array} parentKeys 父属性数组
	 * @param {Object} target  目标对象
	 * @param {String} property 目标对象的属性
	 */
	_getter(parentKeys, target, property) {
		return Reflect.get(target, property)
	}

	/**
	 * 设置属性值监听
	 * @param {Array} parentKeys 父属性数组
	 * @param {Object} target 目标对象
	 * @param {String} property 属性
	 * @param {Object} value  属性值
	 */
	_setter(parentKeys, target, property, value) {
		//父属性数组更新
		let keys = [...parentKeys]
		keys.push(property)
		//记录旧的target
		let oldTarget = null
		if (Array.isArray(target)) {
			oldTarget = [...target]
		} else if (typeof target == 'object') {
			oldTarget = Object.assign({}, target)
		}
		//记录旧的value
		let oldValue = target[property]
		if (Array.isArray(oldValue)) {
			oldValue = [...oldValue]
		} else if (typeof oldValue == 'object' && oldValue) {
			oldValue = Object.assign({}, oldValue)
		}
		//设置值
		Reflect.set(target, property, value)
		//如果属性变化
		if (oldValue !== value) {
			//触发beforeUpdate生命周期函数
			if (typeof this.onBeforeUpdate == 'function') {
				this.onBeforeUpdate.apply(this.$data, [property, value, oldValue, target])
			}
			//更新虚拟节点
			this._updateVnodes(keys, value, oldValue)
			//针对修改对象或者数组内部元素，触发对数组或者对象的监听
			const key1 = parentKeys.join('.')
			if (oldTarget && parentKeys.length && this.$watchers[key1]) {
				this.$watchers[key1].apply(this, [target, oldTarget])
			}
			//针对直接属性触发监听
			const key2 = keys.join('.')
			if (this.$watchers[key2]) {
				this.$watchers[key2].apply(this, [value, oldValue])
			}
			//触发updated生命周期函数
			if (typeof this.onUpdated == 'function') {
				this.onUpdated.apply(this.$data, [property, value, oldValue, target])
			}
		}
		return true
	}

	/**
	 * 解析指定的监听属性字符串为特定格式字符串
	 * @param {String} property 解析的属性字符串
	 */
	_parseProperty(property) {
		let properties = []
		property.split('.').forEach(prop => {
			const matchArray = prop.match(/\[(.+?)\]/g)
			if (matchArray) {
				let newProp = prop.replace(/\[(.+?)\]/g, '')
				properties.push(newProp)
				matchArray.forEach(match => {
					properties.push(match.substr(1, match.length - 2))
				})
			} else {
				properties.push(prop)
			}
		})
		return properties.join('.')
	}

	/**
	 * 判断数据是否为对象
	 * @param {Object} data
	 */
	_isObject(data) {
		if (typeof data == 'object' && data) {
			return true
		}
		return false
	}

}


module.exports = State
