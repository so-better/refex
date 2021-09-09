module.exports = {
	/**
	 * 解析字符串表达式，计算结果（与parseExp的区别是parseExp2会自动执行函数，返回函数值）
	 * @param {Object} thisArg
	 * @param {Object} scope
	 * @param {String} exp
	 */
	parseExp2(thisArg,scope,exp){
		let val = ''
		let params = []
		//判断是否为带括号的函数
		let res = /(.*)+\((.*)\)/g.exec(exp)
		//带括号
		if (res) {
			//解析
			val = this.parseExp(scope, res[1])
			//获取参数
			if (res[2]) {
				params = res[2].split(',').map(value => {
					return this.parseExp(scope, value)
				})
			}
			//如果解析结果不是函数
			if(typeof val != 'function'){
				throw new TypeError(`${res[1]} is not a function`)
			}
			val = val.apply(thisArg,params)
		}
		//无参数
		else {
			//解析
			val = this.parseExp(scope, exp)
			//如果解析结果是函数
			if (typeof val == 'function') {
				val = val.apply(thisArg,params)
			}
		}
		return val
	},
	
	/**
	 * 新旧节点相比，获取指定字段新增、修改和移除的值
	 * @param {VNode} newVNode 新节点
	 * @param {VNode} oldVNode 旧节点
	 * @param {String} key 指定字段，如attrs
	 * @param {Number} type 0表示获取修改的，1表示新增的，2表示获取移除的 
	 */
	compare(newVNode, oldVNode, key, type) {
		let res = {}
		if (type == 0) {
			for (let item in newVNode[key]) {
				if (oldVNode[key].hasOwnProperty(item) && this.string(oldVNode[key][item]) !== this.string(newVNode[key][item])) {
					res[item] = newVNode[key][item]
				}
			}
		} else if (type == 1) {
			for (let item in newVNode[key]) {
				if (!oldVNode[key].hasOwnProperty(item)) {
					res[item] = newVNode[key][item]
				}
			}
		} else if (type == 2) {
			for (let item in oldVNode[key]) {
				//如果新节点没有
				if (!newVNode[key].hasOwnProperty(item)) {
					res[item] = oldVNode[key][item]
				}
			}
		}
		return res
	},
	
	/**
	 * 判断已经初始化的两个节点是否相等
	 * @param {VNode} newVNode 新节点
	 * @param {VNode} oldVNode 旧节点
	 */
	equalNode(newVNode,oldVNode) {
		if (newVNode.uid != oldVNode.uid || newVNode.tag != oldVNode.tag || newVNode.nodeType != oldVNode.nodeType || newVNode.if !=
			oldVNode.if || newVNode.isCloned != oldVNode.isCloned || newVNode.ifType != oldVNode.ifType) {
			return false
		}
		if (newVNode.nodeType == 1) {
			if (this.string(newVNode.attrs) != this.string(oldVNode.attrs)) {
				return false
			}
			if (this.string(newVNode.classes) != this.string(oldVNode.classes)) {
				return false
			}
			if (this.string(newVNode.directives) != this.string(oldVNode.directives)) {
				return false
			}
			if (this.string(newVNode.events) != this.string(oldVNode.events)) {
				return false
			}
			if (newVNode.children.length != oldVNode.children.length) {
				return false
			}
			return newVNode.children.every((childVNode, index) => {
				return this.equalNode(childVNode, oldVNode.children[index])
			})
		} else {
			if (newVNode.text != oldVNode.text) {
				return false
			}
		}
		return true
	},
	
	/**
	 * 解析for指令数据
	 * @param {Object} thisArg
	 * @param {Object} scope
	 * @param {String} exp
	 */
	parseFor(thisArg, scope, exp) {
		let match = exp.match(/([^]*?)\s+(?:in|of)\s+([^]*)/)
		if (!match) {
			return
		}
		let forObj = this.parseExp(scope, match[2].trim())
		if(typeof forObj == 'number'){
			forObj = new Array(forObj)
		}
		let alias = match[1].trim().replace(/[\(\)]/g, '').trim().split(',')
		let res = {
			for: forObj,
			item: alias[0].trim(),
			exp: match[2].trim()
		}
		//遍历的是数组
		if (Array.isArray(forObj)) {
			if (alias.length > 1) {
				res.index = alias[1].trim()
			} else {
				res.index = 'index'
			}
		}
		//遍历对象
		else if (typeof forObj == 'object' && forObj) {
			if (alias.length > 1) {
				res.key = alias[1].trim()
			} else {
				res.key = 'key'
			}
			if (alias.length > 2) {
				res.index = alias[2].trim()
			} else {
				res.index = 'index'
			}
		}
		return res
	},
	
	/**
	 * 返回事件指向的表达式字符串封装函数，用于事件值为表达式的情况
	 * @param {Object} scope 作用域
	 * @param {Object} exp 表达式字符串
	 */
	executeExp(scope, exp) {
		let code = ''
		//动态生成变量声明代码
		for (let key in scope) {
			code += `let ${key} = scope['${key}'];`
		}
		code += `${exp};`
		for (let key in scope) {
			code += `scope['${key}'] = ${key};`
		}
		//在代码块的前后追加代码声明
		let nf = new Function("scope", code)
		//执行代码块并且返回结果
		return nf
	},
	
	/**
	 * 解析含{{}}字符串，返回解析后的字符串
	 * @param {Object} thisArg 
	 * @param {Object} scope 
	 * @param {String} text 
	 */
	parseText(thisArg,scope, text) {
		return text.replace(/\{\{(.*?)\}\}/g, (match, exp) => {
			let res = this.parseExp2(thisArg, scope, exp.trim())
			return this.string(res)
		})
	},
	
	/**
	 * 解析字符串表达式，计算结果
	 * @param {Object} scope 作用域对象
	 * @param {String} exp 表达式字符串
	 */
	parseExp(scope, exp) {
		let code = ''
		//动态生成变量声明代码
		for (let key in scope) {
			code += `let ${key} = scope['${key}'];`
		}
		code += `return ${exp}`
		//在代码块的前后追加代码声明
		let nf = new Function("scope", code)
		//执行代码块并且返回结果
		return nf(scope)
	},
	
	/**
	 * 判断uid相同的两个节点是否值得比较
	 * @param {VNode} newVNode 新节点
	 * @param {VNode} oldVNode 旧节点
	 */
	isSameNode(newVNode, oldVNode) {
		return newVNode.tag === oldVNode.tag && newVNode.nodeType === oldVNode.nodeType && newVNode.if === oldVNode.if && newVNode.ifType === oldVNode.ifType
	},
	
	/**
	 * 解析属性字符串转为数组
	 * @param {String} property 解析的属性字符串
	 */
	parseProperty(property) {
		let properties = []
		property.split('.').forEach(prop => {
			const matchArray = prop.match(/\[(.+?)\]/g)
			if (matchArray) {
				let newProp = prop.replace(/\[(.+?)\]/g, '')
				properties.push(newProp)
				matchArray.forEach(match => {
					const res = /\[(\'|\"){0,1}(.+?)(\'|\"){0,1}\]/g.exec(match)
					properties.push(res[2])
				})
			} else {
				properties.push(prop)
			}
		})
		return properties
	},
	
	/**
	 * 获取原始对象
	 * @param {Object} data
	 */
	getOriginalData(data) {
		let res = null
		if (Array.isArray(data)) {
			res = []
			for (let item of data) {
				let el = this.getOriginalData(item)
				res.push(el)
			}
		} else if (this.isObject(data)) {
			res = {}
			for (let key in data) {
				let el = this.getOriginalData(data[key])
				res[key] = el
			}
		} else {
			res = data
		}
		return res
	},

	/**
	 * 判断数据是否为对象
	 * @param {Object} data
	 */
	isObject(data) {
		if (typeof data == 'object' && data) {
			return true
		}
		return false
	},

	/**
	 * 将数据转为字符串
	 * @param {Object} data
	 */
	string(data) {
		if (this.isObject(data)) {
			return JSON.stringify(data)
		}
		return String(data)
	},
	
	/**
	 * 深拷贝
	 * @param {Object} data
	 */
	deepCopy(data){
		if(Array.isArray(data)){
			return [...data]
		}else if(this.isObject(data)){
			return Object.assign({},data)
		}else {
			return data
		}
	}
}
