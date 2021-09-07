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
						if(value){
							el.setAttribute('checked','')
						}else {
							el.removeAttribute('checked')
						}
					}else if(Array.isArray(value)){
						let val = vnode.attrs.value
						if(value.includes(val)){
							el.setAttribute('checked','')
						}else {
							el.removeAttribute('checked')
						}
					}
					el.addEventListener('change',e=>{
						let isChecked = e.currentTarget.checked
						//布尔类型
						if(typeof value == 'boolean'){
							
						}else if(Array.isArray(value)){
							let val = vnode.attrs.value
							if(value.includes(val)){
								el.setAttribute('checked','')
							}else {
								el.removeAttribute('checked')
							}
						}
					})
				}
			}
		},
		updated:function(el, value, modifier, exp, vnode){
			//input标签的双向绑定
			if (el.nodeName == 'INPUT') {
				//复选框实现双向绑定
				if(el.getAttribute('type') == 'checkbox'){
					//布尔类型
					if(typeof value == 'boolean'){
						if(value){
							el.setAttribute('checked','')
						}else {
							el.removeAttribute('checked')
						}
					}else if(Array.isArray(value)){
						let val = vnode.attrs.value
						if(value.includes(val)){
							el.setAttribute('checked','')
						}else {
							el.removeAttribute('checked')
						}
					}
				}
			}
		}
	}
}
