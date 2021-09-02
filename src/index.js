const State = require('./state')
const VNode = require('./vnode')

module.exports = {
	//构建响应式数据对象
	proxy: function(data) {
		return new State(data)
	},
	//使用响应式数据的方法
	useProxy: function(state) {
		return state.$data
	},
	//返回构建VNode所必须的参数
	h: function(tag, options) {
		//判断tag参数
		if (typeof tag != 'string') {
			throw new TypeError('The tag name is undefined')
		}
		//判断options参数
		if (typeof options != 'object' || !options) {
			options = {}
		}
		//属性集合，如：{id:'el',disabled:false}
		let attrs = options.attrs || {}
		//样式类集合，如：['btn','btn-primary']
		let cls = options.cls || {}
		//指令集合，key为指令名称，值为指令参数，包含data和modifier两个数值，如：{ model:{value:333,modifier:'value'} }
		let directives = options.directives || {}
		//事件集合，如：{ click:function(){} }
		let events = options.events || {}
		//指定创建的元素的文本内容
		let text = options.text
		//子节点数据，每个子节点也是h函数返回的数据
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
	}
}
