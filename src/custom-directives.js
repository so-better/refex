//改变$data内的对应字段值
const parse = function($data,vnode,exp,val){
	if (typeof val === 'object') {
		val = JSON.stringify(val)
	}else {
		val = String(val)
	}
	try{
		let forData = vnode.getForData()
		let forRes = vnode.getForRes()
		let scope = Object.assign({},$data)
		Object.assign(scope,forData)
		//使用forData作为作用域解析表达式
		const res = vnode.parseExpression(forData,exp)
		let a = ''
		for(let fr of forRes){
			let forExpRes = vnode.parseExpression(scope,fr.exp)
			if(Array.isArray(forExpRes)){
				let index = forData[fr.index]
				a += `${fr.exp}["${index}"]`
			}else if(typeof forExpRes == 'object' && forExpRes){
				let key = forData[fr.key]
				a += `${fr.exp}["${key}"]`
			}
		}
		console.log(a)
		
		// const match = /(.+?)(\[|\.)/g.exec(exp)
		// let appendExp = ''
		// if(match){
		// 	appendExp = exp.substring(match[1].length)
		// }
		
		// let forExpRes = vnode.parseExpression(scope,forRes.exp)
		// if(Array.isArray(forExpRes)){
		// 	let index = forData[forRes.index]
		// 	let h = vnode.executeExpression($data,`${forRes.exp}[${index}]${appendExp}=${val}`)
		// 	h($data)
		// }else if(typeof forExpRes == 'object' && forExpRes){
		// 	let key = forData[forRes.key]
		// 	let h = vnode.executeExpression($data,`${forRes.exp}["${key}"]${appendExp}=${val}`)
		// 	h($data)
		// }
	}
	//解析失败表示表达式作用域为$data
	catch(e){
		let h = vnode.executeExpression($data,exp+'='+val)
		h($data)
	}
}

module.exports = {
	//定义show指令
	show: {
		mounted: function(el, value) {
			if (!value) {
				el.style.display = 'none'
			}
		},
		updated: function(el, value) {
			if (value) {
				el.style.display = ''
			} else {
				el.style.display = 'none'
			}
		}
	},
	model: {
		mounted: function(el, value, modifier, exp, vnode) {
			//input标签的双向绑定
			if (el.nodeName == 'INPUT') {
				//复选框实现双向绑定
				if(el.getAttribute('type') == 'checkbox'){
					//布尔类型
					if(typeof value == 'boolean'){
						el.checked = value
					}else if(Array.isArray(value)){
						let val = vnode.attrs.value
						el.checked = value.includes(val)
					}
					el.addEventListener('change',e=>{
						let checked = e.currentTarget.checked
						let val = vnode.attrs.value
						if(typeof value == 'boolean'){
							parse(this,vnode,exp,checked)
						}else if(Array.isArray(value)){
							let scope = Object.assign({},this)
							Object.assign(scope,vnode.getForData())
							let arr = vnode.parseExpression(scope,exp)
							if(checked){
								arr.push(val)
							}else {
								arr = arr.filter((item,index)=>{
									return JSON.stringify(item) != JSON.stringify(val)
								})
							}
							parse(this,vnode,exp,arr)
						}
					})
				}
			}
		},
		updated:function(el, value, modifier, exp, vnode){
			if(el.nodeName == 'INPUT'){
				if(el.getAttribute('type') == 'checkbox'){
					if(typeof value == 'boolean'){
						el.checked = value
					}else if(Array.isArray(value)){
						let val = vnode.attrs.value
						el.checked = value.includes(val)
					}
				}
			}
		}
	}
}
