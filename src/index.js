const State = require('./state')
const VNode = require('./vnode')

const packages = require('../package.json');

console.log('%c感谢使用' + packages.name + '，当前版本：%c v' + packages.version + '\n%c如果你觉得' + packages.name +
	'还不错，不妨去github点个star\ngithub地址：%c' + packages.repository.url, 'color:#808080;', 'color:#008a00',
	'color:#808080;', 'color:#008a00');

module.exports = {
	/**
	 * 构建响应式数据对象
	 * @param {Object} data
	 */
	proxy: function(data) {
		if (!data || typeof data !== 'object') {
			throw new TypeError('The argument to "proxy" must be an object')
		}
		return new State(data)
	},

	/**
	 * 使用响应式数据对象
	 * @param {Object} state
	 */
	useProxy: function(state) {
		if (!(state instanceof State)) {
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
		if (!tag) {
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
		let classes = {}
		if (Array.isArray(options.classes)) {
			options.classes.forEach(item => {
				classes[item] = true
			})
		} else if (typeof options.classes == 'object' && options.classes) {
			classes = Object.assign({}, options.classes)
		} else if (typeof options.classes == 'string' && options.classes) {
			classes[options.classes] = true
		} else {
			classes = {}
		}

		//指令集合，key为指令名称，值为指令参数，包含value和modifier两个数值，如：{ model:{value:333,modifier:{value:true}} }
		let directives = options.directives || {}

		//事件集合，如：{ click:function(){} }
		let tmpEvents = options.events || {}
		let events = {}
		for (let eventName in tmpEvents) {
			events[eventName] = {
				handler: tmpEvents[eventName],
				params: [],
				modifier: {}
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
			classes,
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
	parse: function(state, vnode, exp) {
		if (!(state instanceof State)) {
			throw new TypeError('The first argument to "parse" must be an instance of State')
		}
		if (!(vnode instanceof VNode)) {
			throw new TypeError('The second argument to "parse" must be an instance of VNode')
		}
		if (!exp) {
			throw new TypeError('The string expression does not exist')
		}
		if (typeof exp != 'string') {
			throw new TypeError('The string expression should be a string')
		}
		//设置作用域
		let scope = Object.assign({}, state.$data)
		Object.assign(scope, vnode.getForData())
		return vnode.parseExpression(scope, exp)
	}
}
