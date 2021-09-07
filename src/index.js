const State = require('./state')
const VNode = require('./vnode')

module.exports = {
	/**
	 * 构建响应式数据对象
	 * @param {Object} data
	 */
	proxy: function(data) {
		if(!data || typeof data !== 'object'){
			throw new TypeError('The argument to "proxy" must be an object')
		}
		return new State(data)
	},
	
	/**
	 * 使用响应式数据对象
	 * @param {Object} state
	 */
	useProxy: function(state) {
		if(!(state instanceof State)){
			throw new TypeError('The argument to "useProxy" must be an instance of State')
		}
		return state.$data
	},
	
	/**
	 * 返回构建VNode所必须的参数
	 * @param {Object} tag
	 * @param {Object} options
	 */
	h: function(tag, options) {
		//判断tag参数是否为空
		if(!tag){
			throw new TypeError('The tag name is undefined')
		}
		//判断tag参数是否为字符串
		if (typeof tag != 'string') {
			throw new TypeError('The tag name should be a string')
		}
		
		//判断options参数
		if (typeof options != 'object' || !options) {
			options = {}
		}
		
		//tag转为小写
		tag = tag.toLocaleLowerCase()
		
		//属性参数校验
		let attrs = options.attrs || {}
		
		//样式类校验，支持数组、对象和字符串，最终转为对象
		let cls = {}
		if(Array.isArray(options.cls)){
			options.cls.forEach(item=>{
				cls[item] = true
			})
		}else if(typeof options.cls == 'object' && options.cls){
			cls = Object.assign({},options.cls)
		}else if(typeof options.cls == 'string' && options.cls){
			cls[options.cls] = true
		}else {
			cls = {}
		}
		
		//指令集合，key为指令名称，值为指令参数，包含value和modifier两个数值，如：{ model:{value:333,modifier:'value'} }
		let directives = options.directives || {}
		
		//事件集合，如：{ click:function(){} }
		let tmpEvents = options.events || {}
		let events = {}
		for(let eventName in tmpEvents){
			events[eventName] = {
				handler:tmpEvents[eventName],
				params:[],
				modifier:undefined
			}
		}
		
		//指定创建的元素的文本内容
		let text = options.text
		
		//子节点数据，每个子节点也可以是h函数返回的数据
		let slots = options.slots || []
		
		//是否渲染该节点，只有if明确为false时才会不进行渲染
		let _if = options.if === false ? false : true

		return {
			tag,
			attrs,
			cls,
			directives,
			events,
			text,
			slots,
			_if
		}
	},
	
	/**
	 * 根据字符串表达式获取真实的值
	 * @param {Object} state
	 * @param {Object} vnode
	 * @param {Object} exp
	 */
	parse:function(state,vnode,exp){
		if(!(state instanceof State)){
			throw new TypeError('The first argument to "parse" must be an instance of State')
		}
		if(!(vnode instanceof VNode)){
			throw new TypeError('The second argument to "parse" must be an instance of VNode')
		}
		if(!exp){
			throw new TypeError('The string expression does not exist')
		}
		if(typeof exp != 'string'){
			throw new TypeError('The string expression should be a string')
		}
		//设置作用域
		let scope = Object.assign({}, state.$data)
		Object.assign(scope, vnode.getForData())
		return vnode.parseExpression(scope, exp)
	}
}
